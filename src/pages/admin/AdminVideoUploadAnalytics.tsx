import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, RefreshCw, Search } from "lucide-react";

type UploadAnalyticsAction = "video_upload_completed" | "video_upload_failed";
type UploadStatusFilter = "all" | "completed" | "failed";

interface AuditRow {
  id: string;
  user_id: string | null;
  action: UploadAnalyticsAction;
  target_path: string | null;
  details: unknown;
  created_at: string;
}

interface UploadDetails {
  uploadAttemptId?: string;
  status?: "completed" | "failed";
  fileName?: string;
  fileSize?: number;
  title?: string;
  provider?: "youtube" | "cloudflare";
  visibility?: "private" | "team" | "all_coaches";
  teamCount?: number;
  categoryCount?: number;
  videoId?: string | null;
  errorMessage?: string | null;
}

interface AnalyticsRow extends AuditRow {
  uploaderName: string;
  parsedDetails: UploadDetails;
}

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const parseUploadDetails = (raw: unknown): UploadDetails => {
  if (raw && typeof raw === "object") return raw as UploadDetails;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as UploadDetails) : {};
  } catch {
    return { errorMessage: raw };
  }
};

const AdminVideoUploadAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UploadStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("admin_audit_logs")
      .select("id, user_id, action, target_path, details, created_at")
      .in("action", ["video_upload_completed", "video_upload_failed"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Failed to load upload analytics", description: error.message, variant: "destructive" });
      setRows([]);
      setLoading(false);
      return;
    }

    const baseRows = ((data ?? []) as AuditRow[]).map((row) => ({
      ...row,
      parsedDetails: parseUploadDetails(row.details),
      uploaderName: row.user_id ?? "Unknown user",
    }));

    const userIds = Array.from(new Set(baseRows.map((row) => row.user_id).filter(Boolean))) as string[];
    if (userIds.length === 0) {
      setRows(baseRows);
      setLoading(false);
      return;
    }

    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameByUserId = new Map<string, string>();
    (profiles ?? []).forEach((profile: any) => {
      nameByUserId.set(profile.user_id, profile.display_name ?? profile.user_id);
    });

    setRows(
      baseRows.map((row) => ({
        ...row,
        uploaderName: row.user_id ? (nameByUserId.get(row.user_id) ?? row.user_id) : "Unknown user",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "completed" && row.action === "video_upload_completed") ||
        (statusFilter === "failed" && row.action === "video_upload_failed");

      if (!statusMatches) return false;
      if (!query) return true;

      const details = row.parsedDetails;
      const haystack = [
        row.uploaderName,
        row.target_path ?? "",
        details.title ?? "",
        details.fileName ?? "",
        details.videoId ?? "",
        details.provider ?? "",
        details.visibility ?? "",
        details.errorMessage ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, searchQuery, statusFilter]);

  const completedCount = rows.filter((row) => row.action === "video_upload_completed").length;
  const failedCount = rows.filter((row) => row.action === "video_upload_failed").length;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Video Upload Analytics</h1>
            <p className="text-sm text-muted-foreground">Track completed and failed uploads without SQL.</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-3xl font-bold text-foreground mt-1">{rows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
              <p className="text-3xl font-bold text-foreground mt-1">{completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Failed</p>
              <p className="text-3xl font-bold text-foreground mt-1">{failedCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                placeholder="Search by title, file name, uploader, error..."
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as UploadStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">Loading upload analytics...</div>
          ) : filteredRows.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">No upload analytics found for this filter.</div>
          ) : (
            <div className="divide-y">
              {filteredRows.map((row) => {
                const details = row.parsedDetails;
                const isCompleted = row.action === "video_upload_completed";
                return (
                  <div key={row.id} className="px-4 py-4 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={isCompleted ? "default" : "destructive"} className="gap-1">
                          {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {isCompleted ? "Completed" : "Failed"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">Uploader: {row.uploaderName}</span>
                    </div>

                    <div className="grid gap-1 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{details.title ?? "-"}</span></div>
                      <div><span className="text-muted-foreground">File:</span> <span className="font-medium">{details.fileName ?? "-"}</span></div>
                      <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{formatBytes(details.fileSize)}</span></div>
                      <div><span className="text-muted-foreground">Provider:</span> <span className="font-medium">{details.provider ?? "-"}</span></div>
                      <div><span className="text-muted-foreground">Visibility:</span> <span className="font-medium">{details.visibility ?? "-"}</span></div>
                      <div><span className="text-muted-foreground">Teams:</span> <span className="font-medium">{details.teamCount ?? 0}</span></div>
                      <div><span className="text-muted-foreground">Categories:</span> <span className="font-medium">{details.categoryCount ?? 0}</span></div>
                      <div><span className="text-muted-foreground">Video ID:</span> <span className="font-medium">{details.videoId ?? "-"}</span></div>
                    </div>

                    {!isCompleted && details.errorMessage && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        Error: {details.errorMessage}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminVideoUploadAnalytics;