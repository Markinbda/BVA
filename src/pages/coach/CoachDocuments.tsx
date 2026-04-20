import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, FileText, Trash2, ExternalLink, Users, User } from "lucide-react";

interface CoachDocument {
  id: string;
  coach_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  share_with_players: boolean;
  share_with_all_coaches: boolean;
  uploaded_at: string;
  uploader_name?: string;
}

const MAX_DOC_SIZE = 25 * 1024 * 1024;

const formatBytes = (size: number | null) => {
  if (!size || size <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-BM", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const CoachDocuments = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<CoachDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "shared">("mine");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [shareWithPlayers, setShareWithPlayers] = useState(false);
  const [shareWithAllCoaches, setShareWithAllCoaches] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManageAllDocuments = isAdmin || hasPermission("manage_coach_documents");

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);

    const [docsRes, profilesRes] = await Promise.all([
      (supabase as any)
        .from("coach_documents")
        .select("*")
        .order("uploaded_at", { ascending: false }),
      (supabase as any).from("profiles").select("user_id, display_name"),
    ]);

    if (docsRes.error) {
      toast({
        title: "Could not load documents",
        description: docsRes.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const uploaderNames: Record<string, string> = {};
    for (const profile of profilesRes.data ?? []) {
      uploaderNames[profile.user_id] = profile.display_name ?? "Coach";
    }

    const rows: CoachDocument[] = (docsRes.data ?? []).map((row: CoachDocument) => ({
      ...row,
      uploader_name: uploaderNames[row.coach_id] ?? "Coach",
    }));

    setDocuments(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const query = search.trim().toLowerCase();

  const filteredMine = useMemo(() => {
    return documents.filter((doc) => {
      if (!user || doc.coach_id !== user.id) return false;
      if (!query) return true;
      return (
        doc.file_name.toLowerCase().includes(query) ||
        (doc.description ?? "").toLowerCase().includes(query) ||
        (doc.uploader_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [documents, query, user]);

  const filteredShared = useMemo(() => {
    return documents.filter((doc) => {
      const sharedForCoaches = doc.share_with_all_coaches && doc.coach_id !== user?.id;
      if (!sharedForCoaches) return false;
      if (!query) return true;
      return (
        doc.file_name.toLowerCase().includes(query) ||
        (doc.description ?? "").toLowerCase().includes(query) ||
        (doc.uploader_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [documents, query, user?.id]);

  const resetUploadForm = () => {
    setSelectedFile(null);
    setFileName("");
    setDescription("");
    setShareWithPlayers(false);
    setShareWithAllCoaches(false);
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (file && !fileName.trim()) {
      setFileName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) {
      toast({ title: "Select a file first", variant: "destructive" });
      return;
    }

    const finalFileName = fileName.trim() || selectedFile.name;
    if (!finalFileName) {
      toast({ title: "File name is required", variant: "destructive" });
      return;
    }

    if (selectedFile.size > MAX_DOC_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum upload size is 25MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const storagePath = `${user.id}/${Date.now()}-${sanitizeFileName(selectedFile.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("coach-documents")
      .upload(storagePath, selectedFile, { upsert: false });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: insertError } = await (supabase as any).from("coach_documents").insert({
      coach_id: user.id,
      file_name: finalFileName,
      file_path: storagePath,
      file_size: selectedFile.size,
      mime_type: selectedFile.type || null,
      description: description.trim() || null,
      share_with_players: shareWithPlayers,
      share_with_all_coaches: shareWithAllCoaches,
    });

    if (insertError) {
      await supabase.storage.from("coach-documents").remove([storagePath]);
      toast({ title: "Save failed", description: insertError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    toast({ title: "Document uploaded" });
    resetUploadForm();
    setUploading(false);
    loadDocuments();
  };

  const handleOpen = async (doc: CoachDocument) => {
    setOpeningId(doc.id);
    const { data, error } = await supabase.storage
      .from("coach-documents")
      .createSignedUrl(doc.file_path, 60 * 5);

    if (error || !data?.signedUrl) {
      toast({ title: "Unable to open file", description: error?.message, variant: "destructive" });
      setOpeningId(null);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setOpeningId(null);
  };

  const handleDelete = async (doc: CoachDocument) => {
    const canDelete = canManageAllDocuments || doc.coach_id === user?.id;
    if (!canDelete) {
      toast({ title: "You do not have permission to delete this file", variant: "destructive" });
      return;
    }

    const confirmDelete = window.confirm(`Delete ${doc.file_name}?`);
    if (!confirmDelete) return;

    setDeletingId(doc.id);

    const { error: storageError } = await supabase.storage.from("coach-documents").remove([doc.file_path]);
    if (storageError) {
      toast({ title: "Delete failed", description: storageError.message, variant: "destructive" });
      setDeletingId(null);
      return;
    }

    const { error: dbError } = await (supabase as any).from("coach_documents").delete().eq("id", doc.id);
    if (dbError) {
      toast({ title: "Delete failed", description: dbError.message, variant: "destructive" });
      setDeletingId(null);
      return;
    }

    toast({ title: "Document removed" });
    setDeletingId(null);
    loadDocuments();
  };

  const renderDocumentList = (items: CoachDocument[], emptyMessage: string) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading documents...</CardContent>
        </Card>
      );
    }

    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{emptyMessage}</CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((doc) => {
          const canDelete = canManageAllDocuments || doc.coach_id === user?.id;
          return (
            <Card key={doc.id}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold text-foreground">{doc.file_name}</p>
                    </div>
                    {doc.description ? (
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No description</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                      <span>•</span>
                      <span>{formatBytes(doc.file_size)}</span>
                      <span>•</span>
                      <span>By {doc.uploader_name ?? "Coach"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.share_with_all_coaches && (
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          Shared With Coaches
                        </Badge>
                      )}
                      {doc.share_with_players && (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" />
                          Shared With Players
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpen(doc)}
                      disabled={openingId === doc.id}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {openingId === doc.id ? "Opening..." : "Open"}
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === doc.id ? "Deleting..." : "Delete"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Repository</h1>
          <p className="text-muted-foreground mt-1">
            Upload private files, share with players, and publish documents to all coaches.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Coaches can upload personal files. Use sharing options to publish to players or all coaches.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-file">File</Label>
              <Input
                id="document-file"
                type="file"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-name">File name</Label>
              <Input
                id="document-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter a display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-description">Short description (optional)</Label>
              <Textarea
                id="document-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this file for?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Share with players</p>
                  <p className="text-xs text-muted-foreground">Makes this document visible in player-facing views.</p>
                </div>
                <Switch checked={shareWithPlayers} onCheckedChange={setShareWithPlayers} />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Share with all coaches</p>
                  <p className="text-xs text-muted-foreground">Shows this file in the shared coach documents tab.</p>
                </div>
                <Switch checked={shareWithAllCoaches} onCheckedChange={setShareWithAllCoaches} />
              </div>
            </div>

            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by file name, description, or uploader"
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "mine" | "shared")}>
          <TabsList>
            <TabsTrigger value="mine">My Documents ({filteredMine.length})</TabsTrigger>
            <TabsTrigger value="shared">Shared Documents ({filteredShared.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-4">
            {renderDocumentList(filteredMine, "You have not uploaded any documents yet.")}
          </TabsContent>

          <TabsContent value="shared" className="mt-4">
            {renderDocumentList(filteredShared, "No coach-shared documents were found.")}
          </TabsContent>
        </Tabs>
      </div>
    </CoachLayout>
  );
};

export default CoachDocuments;
