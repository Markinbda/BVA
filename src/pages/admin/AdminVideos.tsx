import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Video, Trash2, ExternalLink, Play, X, Search, Globe, GlobeLock, Bell, Pencil } from "lucide-react";
import NotifyVideoModal from "@/components/coach/NotifyVideoModal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  VIDEO_CATEGORIES, cfEmbedUrl, cfThumbUrl, cfWatchUrl,
} from "@/pages/coach/CoachVideos";

interface VideoRow {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  video_uid: string;
  team_ids: string[];
  categories: string[];
  visibility: string;
  created_at: string;
  coach_email?: string;
}

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/mpeg"];

const AdminVideos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCoach, setFilterCoach] = useState("all");

  // Upload form
  const [uploadOpen, setUploadOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notifyVideo, setNotifyVideo] = useState<VideoRow | null>(null);
  const [allTeams, setAllTeams] = useState<{id: string; name: string}[]>([]);
  const [editVideo, setEditVideo] = useState<VideoRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<Set<string>>(new Set());
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (video: VideoRow) => {
    setEditVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description ?? "");
    setEditCategories(new Set(video.categories ?? []));
  };

  const handleEditSave = async () => {
    if (!editVideo || !editTitle.trim()) return;
    setEditSaving(true);
    const { error } = await (supabase as any).from("coach_videos").update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      categories: Array.from(editCategories),
    }).eq("id", editVideo.id);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setVideos(prev => prev.map(v => v.id === editVideo.id ? {
        ...v,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        categories: Array.from(editCategories),
      } : v));
      toast({ title: "Video updated" });
      setEditVideo(null);
    }
    setEditSaving(false);
  };

  // ── Load all videos + coach names ──────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    const { data: vids } = await (supabase as any)
      .from("coach_videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!vids?.length) { setVideos([]); setLoading(false); return; }

    const coachIds = [...new Set((vids as VideoRow[]).map(v => v.coach_id))];
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .in("user_id", coachIds);

    const emailMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      emailMap[p.user_id] = p.first_name && p.last_name
        ? `${p.first_name} ${p.last_name} (${p.email})`
        : p.email ?? p.user_id;
    });

    setVideos((vids as VideoRow[]).map(v => ({ ...v, coach_email: emailMap[v.coach_id] ?? v.coach_id })));
    setLoading(false);

    // Load all teams for notify modal
    const { data: teamsData } = await (supabase as any).from("coach_teams").select("id, name").order("name");
    setAllTeams(teamsData ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const coachOptions = [...new Map(videos.map(v => [v.coach_id, v.coach_email ?? v.coach_id])).entries()];

  const filtered = videos.filter(v => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.coach_email?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || v.categories?.includes(filterCategory);
    const matchCoach = filterCoach === "all" || v.coach_id === filterCoach;
    return matchSearch && matchCat && matchCoach;
  });

  // ── File / upload ─────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", variant: "destructive" }); return;
    }
    setVideoFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    setUploadOpen(true);
  };

  const toggleCategory = (c: string) =>
    setSelectedCategories(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const resetForm = () => {
    setVideoFile(null); setTitle(""); setDescription("");
    setSelectedCategories(new Set()); setUploadProgress(0); setUploadStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!user || !videoFile || !title.trim()) return;
    setUploading(true); setUploadProgress(2); setUploadStatus("Preparing upload...");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-upload-token", {
        body: { title: title.trim(), description: description.trim(), fileSize: videoFile.size },
      });
      if (fnError || !data?.uploadUrl || !data?.uid)
        throw new Error(data?.error ?? fnError?.message ?? "Failed to get upload URL.");

      const { uploadUrl, uid } = data;
      setUploadProgress(5); setUploadStatus("Uploading video...");

      let offset = 0;
      while (offset < videoFile.size) {
        const end = Math.min(offset + 50 * 1024 * 1024, videoFile.size);
        const chunk = videoFile.slice(offset, end);
        const res = await fetch(uploadUrl, {
          method: "PATCH",
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": String(offset),
            "Upload-Length": String(videoFile.size),
            "Content-Type": "application/offset+octet-stream",
          },
          body: chunk,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Upload failed: ${res.status} ${txt}`);
        }
        offset = end;
        setUploadProgress(5 + Math.round((offset / videoFile.size) * 88));
      }

      setUploadProgress(95); setUploadStatus("Saving...");
      const { error: saveError } = await (supabase as any).from("coach_videos").insert({
        coach_id:    user.id,
        title:       title.trim(),
        description: description.trim() || null,
        video_uid:   uid,
        team_ids:    [],
        categories:  Array.from(selectedCategories),
        visibility:  "all_coaches",
      });
      if (saveError) throw new Error(saveError.message);

      setUploadProgress(100); setUploadStatus("Done!");
      toast({ title: "Video uploaded!" });
      setUploadOpen(false); resetForm(); fetchData();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploadStatus("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const togglePublic = async (video: VideoRow) => {
    const newVisibility = video.visibility === 'public' ? 'all_coaches' : 'public';
    setTogglingId(video.id);
    const { error } = await (supabase as any)
      .from('coach_videos')
      .update({ visibility: newVisibility })
      .eq('id', video.id);
    if (error) {
      toast({ title: 'Failed to update visibility', description: error.message, variant: 'destructive' });
    } else {
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, visibility: newVisibility } : v));
      toast({
        title: newVisibility === 'public' ? 'Featured in public gallery' : 'Removed from public gallery',
        description: newVisibility === 'public'
          ? 'This video now appears at /gallery/videos'
          : 'This video is no longer publicly visible',
      });
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const video = videos.find(v => v.id === deleteId);
    if (video) {
      await supabase.functions.invoke("youtube-upload-token", {
        body: { action: "delete", videoUid: video.video_uid },
      });
    }
    const { error } = await (supabase as any).from("coach_videos").delete().eq("id", deleteId);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else { toast({ title: "Video deleted" }); setVideos(prev => prev.filter(v => v.id !== deleteId)); }
    setDeleteId(null);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video Library</h1>
            <p className="text-sm text-muted-foreground mt-1">All coach-uploaded videos. Admins can upload, tag, and delete any video.</p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload Video
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by title or coach…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCoach} onValueChange={setFilterCoach}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All coaches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coaches</SelectItem>
              {coachOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!loading && <p className="text-sm text-muted-foreground">{filtered.length} video{filtered.length !== 1 ? "s" : ""}</p>}

        {!loading && videos.length === 0 && (
          <div onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-16 text-center cursor-pointer hover:bg-muted/60 transition-colors">
            <Video className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">No videos yet. Click to upload the first one.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(video => (
              <Card key={video.id} className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {playingId === video.id ? (
                    <>
                      <iframe src={`${cfEmbedUrl(video.video_uid)}?autoplay=true`}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen className="absolute inset-0 w-full h-full" />
                      <button onClick={() => setPlayingId(null)}
                        className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <img src={cfThumbUrl(video.video_uid)} alt={video.title}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <button onClick={() => setPlayingId(video.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors group">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-black ml-1" />
                        </div>
                      </button>
                    </>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-snug truncate" title={video.title}>{video.title}</p>
                    {video.visibility === 'public' && (
                      <Badge variant="default" className="text-xs shrink-0 bg-green-600 hover:bg-green-600">Gallery</Badge>
                    )}
                  </div>
                  {video.coach_email && <p className="text-xs text-muted-foreground truncate">{video.coach_email}</p>}
                  <div className="flex flex-wrap gap-1">
                    {(video.categories ?? []).map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(video.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className={`h-7 w-7 ${video.visibility === 'public' ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => togglePublic(video)}
                        disabled={togglingId === video.id}
                        title={video.visibility === 'public' ? 'Remove from public gallery' : 'Feature in public gallery'}
                      >
                        {video.visibility === 'public' ? <Globe className="h-3.5 w-3.5" /> : <GlobeLock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Edit"
                        onClick={() => openEdit(video)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Notify players"
                        onClick={() => setNotifyVideo(video)}>
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" asChild>
                        <a href={cfWatchUrl(video.video_uid)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(video.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && <div className="flex justify-center py-16 text-muted-foreground text-sm">Loading videos…</div>}
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={v => { if (!uploading) { setUploadOpen(v); if (!v) resetForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Video</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!videoFile ? (
              <div
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-10 text-center cursor-pointer hover:bg-muted/60 transition-colors"
              >
                <Video className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">Drag & drop a video here, or click to browse</p>
                <p className="text-xs text-muted-foreground">MP4, MOV, AVI, MKV, WEBM supported</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <Video className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{videoFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={() => { setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-muted-foreground hover:text-foreground" disabled={uploading}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="av-title">Title <span className="text-destructive">*</span></Label>
              <Input id="av-title" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Women — Tournament Highlights" disabled={uploading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="av-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="av-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} disabled={uploading} />
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {VIDEO_CATEGORIES.map(c => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                    <Checkbox checked={selectedCategories.has(c)} onCheckedChange={() => toggleCategory(c)} disabled={uploading} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground"><span>{uploadStatus}</span><span>{uploadProgress}%</span></div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !videoFile || !title.trim()} className="gap-2 min-w-32">
              {uploading ? <>Uploading… {uploadProgress}%</> : <><Upload className="h-4 w-4" /> Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify modal */}
      <NotifyVideoModal
        video={notifyVideo}
        teams={allTeams}
        onClose={() => setNotifyVideo(null)}
        onVisibilityChange={(id, vis) => setVideos(prev => prev.map(v => v.id === id ? { ...v, visibility: vis } : v))}
      />

      {/* Edit dialog */}
      <Dialog open={!!editVideo} onOpenChange={v => { if (!editSaving && !v) setEditVideo(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Video</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="adm-edit-title">Title <span className="text-destructive">*</span></Label>
              <Input id="adm-edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} disabled={editSaving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adm-edit-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="adm-edit-desc" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} disabled={editSaving} />
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {VIDEO_CATEGORIES.map(c => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                    <Checkbox checked={editCategories.has(c)}
                      onCheckedChange={() => setEditCategories(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; })}
                      disabled={editSaving} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVideo(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving || !editTitle.trim()}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the video from the BVA library. To permanently delete from Cloudflare, visit your Cloudflare Stream dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminVideos;