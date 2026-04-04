import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Save, Upload, FolderOpen, Search, ChevronLeft, ChevronRight, ArrowUpDown, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GalleryPhoto {
  id: string;
  category: string;
  alt: string | null;
  image_url: string;
  sort_order: number;
  created_at: string;
}

interface GalleryCategory {
  id: string;
  name: string;
  sort_order: number;
}

const CONCURRENCY = 3;
const PAGE_SIZE = 24;

const AdminGallery = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [adding, setAdding] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ category: "General", alt: "", image_url: "", sort_order: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"default" | "newest" | "oldest">("default");
  const [galleryCategories, setGalleryCategories] = useState<GalleryCategory[]>([]);
  const { toast } = useToast();

  // Bulk import state
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("WordPress Archive");
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    const { data } = await supabase.from("gallery_photos").select("*").order("sort_order");
    setPhotos((data as any) ?? []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await (supabase as any)
      .from("gallery_categories").select("*").order("sort_order", { ascending: true });
    setGalleryCategories(data ?? []);
  };

  useEffect(() => { fetchPhotos(); fetchCategories(); }, []);

  const filtered = useMemo(() => {
    let result = photos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.alt?.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.created_at?.toLowerCase().includes(q)
      );
    }
    if (sortOrder === "newest") {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === "oldest") {
      result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return result;
  }, [photos, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedFiltered = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortOrder]);

  const handleAdd = async () => {
    if (!newPhoto.image_url) { toast({ title: "Please upload an image", variant: "destructive" }); return; }
    const { error } = await supabase.from("gallery_photos").insert({
      category: newPhoto.category,
      alt: newPhoto.alt || null,
      image_url: newPhoto.image_url,
      sort_order: newPhoto.sort_order,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Photo added!" });
    setAdding(false);
    setNewPhoto({ category: "General", alt: "", image_url: "", sort_order: 0 });
    fetchPhotos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.from("gallery_photos").delete().eq("id", id);
    toast({ title: "Photo deleted" });
    fetchPhotos();
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    setBulkFiles(imageFiles);
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  };

  const uploadSingleFile = async (file: File, index: number): Promise<boolean> => {
    const ext = file.name.split(".").pop();
    const path = `gallery/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("bva-images").upload(path, file);
    if (uploadError) return false;
    const { data: { publicUrl } } = supabase.storage.from("bva-images").getPublicUrl(path);
    const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const { error: insertError } = await supabase.from("gallery_photos").insert({
      category: bulkCategory, alt: altText, image_url: publicUrl, sort_order: 0,
    });
    return !insertError;
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setBulkUploading(true);

    // Fetch existing alt texts to detect duplicates
    const { data: existing } = await supabase.from("gallery_photos").select("alt");
    const existingAlts = new Set((existing ?? []).map((r: any) => (r.alt ?? "").toLowerCase()));

    // Filter out duplicates before uploading
    const deduped: File[] = [];
    let skipped = 0;
    for (const file of bulkFiles) {
      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").toLowerCase();
      if (existingAlts.has(altText)) {
        skipped++;
      } else {
        existingAlts.add(altText); // prevent dupes within the same batch
        deduped.push(file);
      }
    }

    if (deduped.length === 0) {
      setBulkUploading(false);
      toast({ title: "No new photos", description: `All ${skipped} photos already exist in the gallery.` });
      return;
    }

    setBulkProgress({ done: 0, total: deduped.length, failed: 0 });
    let done = 0, failed = 0;
    for (let i = 0; i < deduped.length; i += CONCURRENCY) {
      const batch = deduped.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((file, j) => uploadSingleFile(file, i + j)));
      for (const result of results) {
        done++;
        if (result.status === "rejected" || (result.status === "fulfilled" && !result.value)) failed++;
        setBulkProgress({ done, total: deduped.length, failed });
      }
    }
    setBulkUploading(false);
    const success = deduped.length - failed;
    toast({
      title: "Bulk import complete",
      description: `${success} uploaded${failed > 0 ? `, ${failed} failed` : ""}${skipped > 0 ? `, ${skipped} duplicates skipped` : ""}`,
    });
    setBulkFiles([]);
    fetchPhotos();
  };

  const navigateLightbox = (dir: -1 | 1) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < filtered.length) setLightboxIndex(next);
  };

  const currentPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/gallery-categories"><Tag className="h-4 w-4 mr-2" /> Categories</Link>
            </Button>
            <Button variant="outline" onClick={() => { setBulkImporting(!bulkImporting); setAdding(false); }}>
              {bulkImporting ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><FolderOpen className="h-4 w-4 mr-2" /> Bulk Import</>}
            </Button>
            <Button onClick={() => { setAdding(!adding); setBulkImporting(false); }}>
              {adding ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Add Photo</>}
            </Button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, category, or date..."
              className="pl-9"
            />
          </div>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default order</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Import UI */}
        {bulkImporting && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <label className="text-sm font-medium block mb-1.5">Category for all imported photos</label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {galleryCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    {galleryCategories.length === 0 && <SelectItem value="WordPress Archive">WordPress Archive</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleBulkDrop}
                className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Click to select files or drag & drop images here</p>
                <p className="text-xs text-muted-foreground">Use Ctrl+A / Cmd+A in the file picker to select all</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
              <input ref={folderInputRef} type="file" // @ts-ignore
                webkitdirectory="" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
              <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                <FolderOpen className="h-4 w-4 mr-2" /> Select Entire Folder
              </Button>
              {bulkFiles.length > 0 && !bulkUploading && (
                <div className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                  <span className="text-sm">{bulkFiles.length} image{bulkFiles.length !== 1 ? "s" : ""} selected</span>
                  <Button onClick={handleBulkUpload}><Upload className="h-4 w-4 mr-2" /> Upload All</Button>
                </div>
              )}
              {bulkUploading && (
                <div className="space-y-2">
                  <Progress value={(bulkProgress.done / bulkProgress.total) * 100} />
                  <p className="text-sm text-muted-foreground text-center">
                    {bulkProgress.done} / {bulkProgress.total} uploaded{bulkProgress.failed > 0 && ` (${bulkProgress.failed} failed)`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {adding && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <ImageUpload value={newPhoto.image_url} onChange={(url) => setNewPhoto({ ...newPhoto, image_url: url })} folder="gallery" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Category</label>
                  <Select value={newPhoto.category} onValueChange={(v) => setNewPhoto({ ...newPhoto, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {galleryCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      {galleryCategories.length === 0 && <SelectItem value="General">General</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Description</label>
                  <Input value={newPhoto.alt} onChange={(e) => setNewPhoto({ ...newPhoto, alt: e.target.value })} placeholder="Photo description" />
                </div>
              </div>
              <Button onClick={handleAdd}><Save className="h-4 w-4 mr-2" /> Save Photo</Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{searchQuery ? "No photos match your search." : "No photos yet."}</CardContent></Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filtered.length} photo{filtered.length !== 1 ? "s" : ""}{searchQuery && ` matching "${searchQuery}"`}
              {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedFiltered.map((p, i) => {
                const globalIndex = (currentPage - 1) * PAGE_SIZE + i;
                return (
                  <div key={p.id} className="group relative cursor-pointer" onClick={() => setLightboxIndex(globalIndex)}>
                    <img src={p.image_url} alt={p.alt || ""} className="w-full h-40 object-cover rounded-lg border border-border" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{p.category}{p.alt ? ` — ${p.alt}` : ""}</p>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95 overflow-hidden">
          {currentPhoto && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img src={currentPhoto.image_url} alt={currentPhoto.alt || ""} className="max-w-full max-h-[85vh] object-contain" />
              {lightboxIndex !== null && lightboxIndex > 0 && (
                <button onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors">
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {lightboxIndex !== null && lightboxIndex < filtered.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors">
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
              {currentPhoto.alt && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <span className="text-xs font-semibold uppercase text-accent">{currentPhoto.category}</span>
                  <p className="text-sm text-white">{currentPhoto.alt}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminGallery;
