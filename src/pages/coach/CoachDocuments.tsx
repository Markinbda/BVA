import { useEffect, useMemo, useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Upload, FileText, Trash2, ExternalLink, Users, User, Pencil, Layers, Download, FolderOpen } from "lucide-react";

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

interface DocumentSet {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  created_at: string;
  documents: CoachDocument[];
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
  const [documentSets, setDocumentSets] = useState<DocumentSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "shared">("mine");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [shareWithPlayers, setShareWithPlayers] = useState(false);
  const [shareWithAllCoaches, setShareWithAllCoaches] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CoachDocument | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editShareWithPlayers, setEditShareWithPlayers] = useState(false);
  const [editShareWithAllCoaches, setEditShareWithAllCoaches] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editDraggingFile, setEditDraggingFile] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [setName, setSetName] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [setSelectedIds, setSetSelectedIds] = useState<Set<string>>(new Set());
  const [setSaving, setSetSaving] = useState(false);
  const [reviewSet, setReviewSet] = useState<DocumentSet | null>(null);

  const canManageAllDocuments = isAdmin || hasPermission("manage_coach_documents");

  const resetSetForm = () => {
    setSetName("");
    setSetDescription("");
    setSetSelectedIds(new Set());
  };

  const resetEditForm = () => {
    setEditingDocument(null);
    setEditFileName("");
    setEditDescription("");
    setEditShareWithPlayers(false);
    setEditShareWithAllCoaches(false);
    setEditSelectedFile(null);
    setEditDraggingFile(false);
  };

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);

    const [docsRes, profilesRes, setsRes, setItemsRes] = await Promise.all([
      (supabase as any)
        .from("coach_documents")
        .select("*")
        .order("uploaded_at", { ascending: false }),
      (supabase as any).from("profiles").select("user_id, display_name"),
      (supabase as any).from("coach_document_sets").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("coach_document_set_items").select("set_id, document_id"),
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

    const setsMissing = setsRes.error && String(setsRes.error.message ?? "").toLowerCase().includes("coach_document_sets");
    const setItemsMissing = setItemsRes.error && String(setItemsRes.error.message ?? "").toLowerCase().includes("coach_document_set_items");
    if (setsRes.error && !setsMissing) {
      toast({ title: "Could not load document sets", description: setsRes.error.message, variant: "destructive" });
    }
    if (setItemsRes.error && !setItemsMissing) {
      toast({ title: "Could not load document set items", description: setItemsRes.error.message, variant: "destructive" });
    }

    const uploaderNames: Record<string, string> = {};
    for (const profile of profilesRes.data ?? []) {
      uploaderNames[profile.user_id] = profile.display_name ?? "Coach";
    }

    const rows: CoachDocument[] = (docsRes.data ?? []).map((row: CoachDocument) => ({
      ...row,
      uploader_name: uploaderNames[row.coach_id] ?? "Coach",
    }));

    const docById = new Map(rows.map((doc) => [doc.id, doc]));
    const itemsBySet = new Map<string, string[]>();
    for (const item of (setItemsRes.data ?? []) as Array<{ set_id: string; document_id: string }>) {
      const current = itemsBySet.get(item.set_id) ?? [];
      current.push(item.document_id);
      itemsBySet.set(item.set_id, current);
    }
    const sets: DocumentSet[] = ((setsRes.data ?? []) as Array<any>).map((setRow) => ({
      ...setRow,
      documents: (itemsBySet.get(setRow.id) ?? [])
        .map((docId) => docById.get(docId))
        .filter((doc): doc is CoachDocument => !!doc),
    }));

    setDocuments(rows);
    setDocumentSets(sets);
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

  const filteredSets = useMemo(() => {
    const term = query;
    return documentSets.filter((set) => {
      const canViewSet = canManageAllDocuments || set.coach_id === user?.id;
      if (!canViewSet) return false;
      if (!term) return true;
      return (
        set.name.toLowerCase().includes(term) ||
        (set.description ?? "").toLowerCase().includes(term) ||
        set.documents.some((doc) => doc.file_name.toLowerCase().includes(term))
      );
    });
  }, [documentSets, query, canManageAllDocuments, user?.id]);

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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(file);
  };

  const openEditFilePicker = () => {
    editFileInputRef.current?.click();
  };

  const handleEditDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEditDraggingFile(true);
  };

  const handleEditDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEditDraggingFile(false);
  };

  const handleEditDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEditDraggingFile(false);
    setEditSelectedFile(e.dataTransfer.files?.[0] ?? null);
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
    setUploadDialogOpen(false);
    setUploading(false);
    loadDocuments();
  };

  const handleOpenEdit = (doc: CoachDocument) => {
    setEditingDocument(doc);
    setEditFileName(doc.file_name);
    setEditDescription(doc.description ?? "");
    setEditShareWithPlayers(doc.share_with_players);
    setEditShareWithAllCoaches(doc.share_with_all_coaches);
    setEditSelectedFile(null);
    setEditDraggingFile(false);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingDocument) return;
    if (!editFileName.trim()) {
      toast({ title: "File name is required", variant: "destructive" });
      return;
    }

    if (editSelectedFile && editSelectedFile.size > MAX_DOC_SIZE) {
      toast({ title: "File too large", description: "Maximum upload size is 25MB.", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    let nextPath = editingDocument.file_path;
    let uploadedNewPath: string | null = null;

    try {
      if (editSelectedFile) {
        const storagePath = `${user.id}/${Date.now()}-${sanitizeFileName(editSelectedFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("coach-documents")
          .upload(storagePath, editSelectedFile, { upsert: false });
        if (uploadError) {
          throw new Error(uploadError.message);
        }
        nextPath = storagePath;
        uploadedNewPath = storagePath;
      }

      const updatePayload: Record<string, any> = {
        file_name: editFileName.trim(),
        description: editDescription.trim() || null,
        share_with_players: editShareWithPlayers,
        share_with_all_coaches: editShareWithAllCoaches,
        file_path: nextPath,
      };

      if (editSelectedFile) {
        updatePayload.file_size = editSelectedFile.size;
        updatePayload.mime_type = editSelectedFile.type || null;
      }

      const { error: updateError } = await (supabase as any)
        .from("coach_documents")
        .update(updatePayload)
        .eq("id", editingDocument.id);
      if (updateError) {
        throw new Error(updateError.message);
      }

      if (editSelectedFile) {
        await supabase.storage.from("coach-documents").remove([editingDocument.file_path]);
      }

      toast({ title: "Document updated" });
      setEditDialogOpen(false);
      resetEditForm();
      loadDocuments();
    } catch (error: any) {
      if (uploadedNewPath) {
        await supabase.storage.from("coach-documents").remove([uploadedNewPath]);
      }
      toast({ title: "Update failed", description: String(error?.message ?? error), variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const getSignedUrl = async (doc: CoachDocument) => {
    const { data, error } = await supabase.storage
      .from("coach-documents")
      .createSignedUrl(doc.file_path, 60 * 5);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Could not generate signed URL");
    }
    return data.signedUrl;
  };

  const handleDownload = async (doc: CoachDocument) => {
    try {
      const signedUrl = await getSignedUrl(doc);
      const anchor = document.createElement("a");
      anchor.href = signedUrl;
      anchor.download = doc.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error: any) {
      toast({ title: "Unable to download file", description: String(error?.message ?? error), variant: "destructive" });
    }
  };

  const handleOpenSet = async (set: DocumentSet) => {
    for (const doc of set.documents) {
      await handleOpen(doc);
    }
  };

  const handleDownloadSet = async (set: DocumentSet) => {
    for (const doc of set.documents) {
      await handleDownload(doc);
    }
  };

  const toggleSetDocument = (docId: string, checked: boolean) => {
    setSetSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(docId);
      else next.delete(docId);
      return next;
    });
  };

  const createDocumentSet = async () => {
    if (!user) return;
    if (!setName.trim()) {
      toast({ title: "Set name is required", variant: "destructive" });
      return;
    }
    if (setSelectedIds.size < 2) {
      toast({ title: "Select at least 2 documents", variant: "destructive" });
      return;
    }

    setSetSaving(true);
    try {
      const { data: setRow, error: setError } = await (supabase as any)
        .from("coach_document_sets")
        .insert({
          coach_id: user.id,
          name: setName.trim(),
          description: setDescription.trim() || null,
        })
        .select("id")
        .single();
      if (setError) throw new Error(setError.message);

      const items = Array.from(setSelectedIds).map((documentId) => ({
        set_id: setRow.id,
        document_id: documentId,
      }));
      const { error: itemsError } = await (supabase as any)
        .from("coach_document_set_items")
        .insert(items);
      if (itemsError) throw new Error(itemsError.message);

      toast({ title: "Document set created" });
      setSetDialogOpen(false);
      resetSetForm();
      loadDocuments();
    } catch (error: any) {
      toast({ title: "Unable to create set", description: String(error?.message ?? error), variant: "destructive" });
    } finally {
      setSetSaving(false);
    }
  };

  const handleOpen = async (doc: CoachDocument) => {
    setOpeningId(doc.id);
    try {
      const signedUrl = await getSignedUrl(doc);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast({ title: "Unable to open file", description: String(error?.message ?? error), variant: "destructive" });
    } finally {
      setOpeningId(null);
    }
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(doc)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
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
          <h1 className="text-2xl font-bold text-foreground">Document Library</h1>
          <p className="text-muted-foreground mt-1">
            Upload private files, share with players, and publish documents to all coaches.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              Open the upload modal to add documents with sharing options.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setUploadDialogOpen(true)} disabled={uploading}>
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
            <Button variant="outline" onClick={() => setSetDialogOpen(true)}>
              <Layers className="h-4 w-4" />
              Document Set
            </Button>
          </CardContent>
        </Card>

        <Dialog
          open={uploadDialogOpen}
          onOpenChange={(open) => {
            setUploadDialogOpen(open);
            if (!open && !uploading) {
              resetUploadForm();
              setIsDraggingFile(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Coaches can upload personal files. Use sharing options to publish to players or all coaches.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>File</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFilePicker}
                  className={`cursor-pointer rounded-md border-2 border-dashed p-5 text-center transition-colors ${
                    isDraggingFile ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a file here, or click to choose a file
                  </p>
                  {selectedFile && (
                    <p className="mt-2 text-sm font-medium text-foreground">
                      Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
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
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <Card>
          <CardHeader>
            <CardTitle>Document Sets</CardTitle>
            <CardDescription>Bundle multiple documents for grouped review, opening, and downloading.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredSets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No document sets found.</p>
            ) : (
              filteredSets.map((set) => (
                <div key={set.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{set.name}</p>
                      {set.description && <p className="text-sm text-muted-foreground">{set.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {set.documents.length} documents • Created {formatDate(set.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setReviewSet(set)}>
                        <FolderOpen className="h-4 w-4" />
                        Review
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleOpenSet(set)}>
                        <ExternalLink className="h-4 w-4" />
                        Open Set
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDownloadSet(set)}>
                        <Download className="h-4 w-4" />
                        Download Set
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
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

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open && !savingEdit) resetEditForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Change title, description, sharing options, or replace the file.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Replace file (optional)</Label>
              <div
                onDragOver={handleEditDragOver}
                onDragLeave={handleEditDragLeave}
                onDrop={handleEditDrop}
                onClick={openEditFilePicker}
                className={`cursor-pointer rounded-md border-2 border-dashed p-4 text-center transition-colors ${
                  editDraggingFile ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <p className="text-sm text-muted-foreground">Drag and drop a replacement file here, or click to choose one</p>
                {editSelectedFile && (
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Replacement: {editSelectedFile.name} ({formatBytes(editSelectedFile.size)})
                  </p>
                )}
              </div>
              <input
                ref={editFileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setEditSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-file-name">Title</Label>
              <Input
                id="edit-file-name"
                value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
                placeholder="Enter a display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Short description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this file for?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Share with players</p>
                  <p className="text-xs text-muted-foreground">Makes this document visible in player-facing views.</p>
                </div>
                <Switch checked={editShareWithPlayers} onCheckedChange={setEditShareWithPlayers} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Share with all coaches</p>
                  <p className="text-xs text-muted-foreground">Shows this file in the shared coach documents tab.</p>
                </div>
                <Switch checked={editShareWithAllCoaches} onCheckedChange={setEditShareWithAllCoaches} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              <Pencil className="h-4 w-4" />
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={setDialogOpen}
        onOpenChange={(open) => {
          setSetDialogOpen(open);
          if (!open && !setSaving) resetSetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Document Set</DialogTitle>
            <DialogDescription>Choose two or more documents to bundle into a reusable set.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="set-name">Set name</Label>
              <Input id="set-name" value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="Example: Team Review Pack" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-description">Description (optional)</Label>
              <Textarea id="set-description" value={setDescription} onChange={(e) => setSetDescription(e.target.value)} placeholder="What is this set used for?" />
            </div>
            <div className="space-y-2">
              <Label>Documents</Label>
              <div className="max-h-64 space-y-2 overflow-auto rounded-md border border-border p-3">
                {filteredMine.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Upload documents first to build a set.</p>
                ) : (
                  filteredMine.map((doc) => {
                    const checked = setSelectedIds.has(doc.id);
                    return (
                      <label key={doc.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleSetDocument(doc.id, value === true)}
                        />
                        <span className="text-sm">
                          <span className="font-medium text-foreground">{doc.file_name}</span>
                          <span className="block text-xs text-muted-foreground">{doc.description ?? "No description"}</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">Selected: {setSelectedIds.size}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)} disabled={setSaving}>Cancel</Button>
            <Button onClick={createDocumentSet} disabled={setSaving}>
              <Layers className="h-4 w-4" />
              {setSaving ? "Creating..." : "Create Set"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewSet} onOpenChange={(open) => !open && setReviewSet(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{reviewSet?.name ?? "Document Set"}</DialogTitle>
            <DialogDescription>{reviewSet?.description ?? "Review documents in this set."}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-auto">
            {(reviewSet?.documents ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-md border border-border p-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{doc.description ?? "No description"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleOpen(doc)}>
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewSet(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
};

export default CoachDocuments;
