import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp, Paperclip } from "lucide-react";

interface EmailRecord {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
  team_names: string[] | null;
  attachments: Array<{ filename: string; type: string; size: number }>;
  status: string;
  error_message: string | null;
  sent_at: string;
}

const CoachEmailHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("coach_email_history")
      .select("*")
      .eq("coach_id", user.id)
      .order("sent_at", { ascending: false })
      .then(({ data }: { data: EmailRecord[] }) => {
        setRecords(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.subject.toLowerCase().includes(q) ||
      r.recipients.some((e) => e.toLowerCase().includes(q)) ||
      (r.team_names ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email History</h1>
          <p className="text-muted-foreground text-sm">
            {records.length} email{records.length !== 1 ? "s" : ""} sent
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, team, or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? "No emails match your search." : "No emails sent yet. Use Send Email to compose your first message."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((record) => {
              const open = expanded.has(record.id);
              const attachments = Array.isArray(record.attachments) ? record.attachments : [];
              return (
                <Card key={record.id} className={record.status === "failed" ? "border-destructive/50" : ""}>
                  <CardHeader
                    className="flex flex-row items-start justify-between cursor-pointer gap-4 pb-3"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold truncate">{record.subject}</CardTitle>
                        <Badge
                          variant={record.status === "sent" ? "default" : "destructive"}
                          className="text-xs shrink-0"
                        >
                          {record.status}
                        </Badge>
                        {attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Paperclip className="h-3 w-3" /> {attachments.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(record.sent_at)} · {record.recipients.length} recipient{record.recipients.length !== 1 ? "s" : ""}
                        {(record.team_names?.length ?? 0) > 0 && ` · ${record.team_names!.join(", ")}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7">
                      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CardHeader>

                  {open && (
                    <CardContent className="pt-0 space-y-4 border-t border-border">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recipients</p>
                        <div className="flex flex-wrap gap-1">
                          {record.recipients.map((email) => (
                            <Badge key={email} variant="outline" className="text-xs">{email}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                        <p className="text-sm whitespace-pre-wrap text-foreground bg-muted/40 rounded-md p-3">
                          {record.body}
                        </p>
                      </div>

                      {attachments.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Attachments</p>
                          <div className="space-y-1">
                            {attachments.map((a, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{a.filename}</span>
                                <span className="text-muted-foreground text-xs">({(a.size / 1024).toFixed(0)} KB)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.error_message && (
                        <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
                          Error: {record.error_message}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CoachLayout>
  );
};

export default CoachEmailHistory;
