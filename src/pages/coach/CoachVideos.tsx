import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Video, Trash2, ExternalLink, Play, X, Bell, Pencil } from "lucide-react";
import NotifyVideoModal from "@/components/coach/NotifyVideoModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const VIDEO_CATEGORIES = [
  "Match Footage",
  "Practice",
  "Drills",
  "Tournament",
  "Training Tips",
  "Skills - Serving",
  "Skills - Setting",
  "Skills - Passing",
  "Skills - Attacking",
  "Skills - Blocking",
  "Skills - Defence",
  "Team Highlight",
  "Other",
];

interface Team {
  id: string;
  name: string;
}

interface CoachVideo {
  id: string;
  title: string;
  description: string | null;
  video_uid: string;
  team_ids: string[];
  categories: string[];
  visibility: string;
  created_at: string;
}

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/mpeg"];

export const cfEmbedUrl = (uid: string) => `https://iframe.videodelivery.net/${uid}`;
export const cfThumbUrl = (uid: string) => `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
export const cfWatchUrl = (uid: string) => `https://watch.cloudflarestream.com/${uid}`;

const CoachVideos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [videos, setVideos] = useState<CoachVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Upload form state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  // Preview / delete / edit
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notifyVideo, setNotifyVideo] = useState<CoachVideo | null>(null);
  const [editVideo, setEditVideo] = useState<CoachVideo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<Set<string>>(new Set());
  const [editTeams, setEditTeams] = useState<Set<string>>(new Set());
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [teamsRes, videosRes] = await Promise.all([
      (supabase as any).from("coach_teams").select("id, name").eq("coach_id", user.id).order("name"),
      (supabase as any).from("coach_videos").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
    ]);
    setTeams(teamsRes.data ?? []);
    setVideos(videosRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Please select an MP4, MOV, AVI, MKV, WEBM or MPEG video.", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    setUploadOpen(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const toggleTeam = (id: string) =>
    setSelectedTeams(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleCategory = (c: string) =>
    setSelectedCategories(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const resetForm = () => {
    setVideoFile(null); setTitle(""); setDescription("");
    setSelectedTeams(new Set()); setSelectedCategories(new Set());
    setUploadProgress(0); setUploadStatus("");
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
        throw new Error(data?.error ?? fnError?.message ?? "Failed to get upload URL. Ensure Cloudflare Stream is configured.");

      const { uploadUrl, uid } = data;
      setUploadProgress(5); setUploadStatus("Uploading video...");
      await uploadFileWithProgress(videoFile, uploadUrl, pct => setUploadProgress(5 + Math.round(pct * 88)));
      setUploadProgress(95); setUploadStatus("Saving to video library...");

      const { error: saveError } = await (supabase as any).from("coach_videos").insert({
        coach_id:    user.id,
        title:       title.trim(),
        description: description.trim() || null,
        video_uid:   uid,
        team_ids:    Array.from(selectedTeams),
        categories:  Array.from(selectedCategories),
        visibility:  selectedTeams.size > 0 ? "team" : "all_coaches",
      });
      if (saveError) throw new Error(saveError.message);

      setUploadProgress(100); setUploadStatus("Done!");
      toast({ title: "Video uploaded!", description: "It will be ready to stream within a minute." });
      setUploadOpen(false); resetForm(); fetchData();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploadStatus("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadFileWithProgress = async (
    file: File,
    uploadUrl: string,
    onProgress: (pct: number) => void
  ): Promise<void> => {
    const CHUNK = 50 * 1024 * 1024;
    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + CHUNK, file.size);
      const chunk = file.slice(offset, end);
      const res = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Offset": String(offset),
          "Upload-Length": String(file.size),
          "Content-Type": "application/offset+octet-stream",
        },
        body: chunk,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }
      offset = end;
      onProgress(offset / file.size);
    }
  };

  const openEdit = (video: CoachVideo) => {
    setEditVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description ?? "");
    setEditCategories(new Set(video.categories ?? []));
    setEditTeams(new Set(video.team_ids ?? []));
  };

  const handleEditSave = async () => {
    if (!editVideo || !editTitle.trim()) return;
    setEditSaving(true);
    const { error } = await (supabase as any).from("coach_videos").update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      categories: Array.from(editCategories),
      team_ids: Array.from(editTeams),
    }).eq("id", editVideo.id);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setVideos(prev => prev.map(v => v.id === editVideo.id ? {
        ...v,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        categories: Array.from(editCategories),
        team_ids: Array.from(editTeams),
      } : v));
      toast({ title: "Video updated" });
      setEditVideo(null);
    }
    setEditSaving(false);
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
    else { toast({ title: "Video removed" }); setVideos(prev => prev.filter(v => v.id !== deleteId)); }
    setDeleteId(null);
  };

  const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? id;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  const filteredVideos = filterCategory === "all"
    ? videos
    : videos.filter(v => v.categories?.includes(filterCategory));

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload videos from your device - hosted on Cloudflare Stream, shared privately with your teams.
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload Video
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

        {/* Category filter */}
        {videos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >All</button>
            {VIDEO_CATEGORIES.filter(c => videos.some(v => v.categories?.includes(c))).map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >{c}</button>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {!loading && videos.length === 0 && (
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-16 text-center cursor-pointer hover:bg-muted/60 transition-colors"
          >
            <Video className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">Drag & drop a video here, or click to browse</p>
            <p className="text-xs text-muted-foreground">MP4, MOV, AVI, MKV, WEBM supported</p>
          </div>
        )}

        {/* Video grid */}
        {!loading && filteredVideos.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map(video => (
              <Card key={video.id} className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {playingId === video.id ? (
                    <>
                      <iframe src={`${cfEmbedUrl(video.video_uid)}?autoplay=true`}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen className="absolute inset-0 w-full h-full"
                        onError={() => setPlayingId(null)} />
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
                  <p className="font-semibold text-sm leading-snug truncate" title={video.title}>{video.title}</p>
                  {video.description && <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {(video.categories ?? []).map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    {video.team_ids.map(id => <Badge key={id} variant="outline" className="text-xs">{teamName(id)}</Badge>)}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(video.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Edit"
                        onClick={() => openEdit(video)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Notify players"
                        onClick={() => setNotifyVideo(video)}>
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" asChild>
                        <a href={cfWatchUrl(video.video_uid)} target="_blank" rel="noopener noreferrer" title="Open full screen">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
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

        {loading && <div className="flex justify-center py-16 text-muted-foreground text-sm">Loading videos...</div>}
      </div>

      {/* Notify modal */}
      <NotifyVideoModal
        video={notifyVideo}
        teams={teams}
        onClose={() => setNotifyVideo(null)}
        onVisibilityChange={(id, vis) => setVideos(prev => prev.map(v => v.id === id ? { ...v, visibility: vis } : v))}
      />

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
              <Label htmlFor="vid-title">Title <span className="text-destructive">*</span></Label>
              <Input id="vid-title" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. U16 Girls Practice - Serving Drills" disabled={uploading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vid-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="vid-desc" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Add notes for your players..." rows={2} disabled={uploading} />
            </div>
            <div className="space-y-2">
              <Label>Categories <span className="text-muted-foreground text-xs">(select all that apply)</span></Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {VIDEO_CATEGORIES.map(c => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                    <Checkbox checked={selectedCategories.has(c)} onCheckedChange={() => toggleCategory(c)} disabled={uploading} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            {teams.length > 0 && (
              <div className="space-y-2">
                <Label>Share with teams <span className="text-muted-foreground text-xs">(leave blank = all coaches)</span></Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {teams.map(team => (
                    <label key={team.id} className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                      <Checkbox checked={selectedTeams.has(team.id)} onCheckedChange={() => toggleTeam(team.id)} disabled={uploading} />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              Videos are hosted privately on <strong>Cloudflare Stream</strong> - not publicly searchable.
            </p>
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{uploadStatus}</span><span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !videoFile || !title.trim()} className="gap-2 min-w-32">
              {uploading ? <>Uploading... {uploadProgress}%</> : <><Upload className="h-4 w-4" /> Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editVideo} onOpenChange={v => { if (!editSaving) { if (!v) setEditVideo(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Video</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title <span className="text-destructive">*</span></Label>
              <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} disabled={editSaving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="edit-desc" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} disabled={editSaving} />
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
            {teams.length > 0 && (
              <div className="space-y-2">
                <Label>Share with teams <span className="text-muted-foreground text-xs">(leave blank = all coaches)</span></Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {teams.map(team => (
                    <label key={team.id} className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                      <Checkbox checked={editTeams.has(team.id)}
                        onCheckedChange={() => setEditTeams(prev => { const n = new Set(prev); n.has(team.id) ? n.delete(team.id) : n.add(team.id); return n; })}
                        disabled={editSaving} />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
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
            <AlertDialogTitle>Remove video?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the video from your BVA library. To permanently delete from Cloudflare, visit your Cloudflare Stream dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default CoachVideos;
