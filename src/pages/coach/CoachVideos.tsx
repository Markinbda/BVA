import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Upload, Video, Trash2, ExternalLink, Play, X, Bell, Pencil, Share2, Users, ClipboardList } from "lucide-react";
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
  coach_id: string;
  title: string;
  description: string | null;
  video_uid: string;
  video_provider: "cloudflare" | "youtube";
  team_ids: string[];
  categories: string[];
  visibility: string;
  created_at: string;
  uploader_name?: string;
}

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/mpeg"];

export const cfEmbedUrl = (uid: string) => `https://iframe.videodelivery.net/${uid}`;
export const cfThumbUrl = (uid: string) => `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
export const cfWatchUrl = (uid: string) => `https://watch.cloudflarestream.com/${uid}`;

// Provider-aware helpers — use these everywhere instead of cf* directly
export const videoEmbedUrl = (uid: string, provider: "cloudflare" | "youtube" = "cloudflare") =>
  provider === "youtube"
    ? `https://www.youtube.com/embed/${uid}?rel=0`
    : cfEmbedUrl(uid);

export const videoThumbUrl = (uid: string, provider: "cloudflare" | "youtube" = "cloudflare") =>
  provider === "youtube"
    ? `https://img.youtube.com/vi/${uid}/hqdefault.jpg`
    : cfThumbUrl(uid);

export const videoWatchUrl = (uid: string, provider: "cloudflare" | "youtube" = "cloudflare") =>
  provider === "youtube"
    ? `https://www.youtube.com/watch?v=${uid}`
    : cfWatchUrl(uid);

const CoachVideos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File stored in a ref (NOT state) so React re-renders during upload
  //    don't create additional references to the potentially large File object.
  const videoFileRef = useRef<File | null>(null);
  // We keep just the display metadata in state
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoFileSize, setVideoFileSize] = useState<number>(0);

  // AbortController ref so we can cancel the in-flight XHR on unmount / cancel
  const abortRef = useRef<(() => void) | null>(null);
  const uploadTimedOutRef = useRef(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeamIds, setMyTeamIds] = useState<Set<string>>(new Set());
  const [videos, setVideos] = useState<CoachVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ytPlaylists, setYtPlaylists] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"mine" | "shared">("mine");
  const [shareWithAll, setShareWithAll] = useState(false);

  // Upload form state
  const [uploadOpen, setUploadOpen] = useState(false);
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
  const [shareOpen, setShareOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<CoachVideo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<Set<string>>(new Set());
  const [editTeams, setEditTeams] = useState<Set<string>>(new Set());
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ownTeamsRes, assignedTcRes, videosRes, playlistsRes, profilesRes] = await Promise.all([
        (supabase as any).from("coach_teams").select("id, name").eq("coach_id", user.id).order("name"),
        // Only fetch team_ids — avoid the risky embedded join that may be blocked by RLS
        (supabase as any).from("team_coaches").select("team_id").eq("user_id", user.id),
        (supabase as any).from("coach_videos").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("youtube_playlists").select("title").order("title"),
        (supabase as any).from("profiles").select("user_id, display_name"),
      ]);

      // Merge owned + assigned teams (deduplicated)
      const ownTeams: Team[] = ownTeamsRes.data ?? [];
      const assignedTeamIds: string[] = (assignedTcRes.data ?? []).map((r: any) => r.team_id as string);

      // Fetch team records for assigned (not-owned) teams via SECURITY DEFINER RPC (bypasses RLS)
      let assignedTeams: Team[] = [];
      const ownTeamIdSet = new Set(ownTeams.map(t => t.id));
      const { data: assignedRpcData } = await (supabase as any)
        .rpc("get_assigned_teams_for_user", { p_user_id: user.id });
      if (assignedRpcData) {
        assignedTeams = (assignedRpcData as Team[]).filter(t => !ownTeamIdSet.has(t.id));
      }

      const teamMap = new Map<string, Team>();
      [...ownTeams, ...assignedTeams].forEach(t => teamMap.set(t.id, t));
      setTeams(Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

      // Build the full set of team IDs this coach belongs to, including any
      // assigned teams whose records couldn't be fetched due to RLS
      const allMyTeamIds = new Set([...teamMap.keys(), ...assignedTeamIds]);
      setMyTeamIds(allMyTeamIds);

      // Attach uploader display name to each video
      const profileMap: Record<string, string> = {};
      for (const p of (profilesRes.data ?? [])) {
        profileMap[p.user_id] = p.display_name ?? "Coach";
      }
      if (videosRes.error) {
        console.error("coach_videos fetch error:", videosRes.error);
        toast({ title: "Could not load videos", description: videosRes.error.message, variant: "destructive" });
      }
      const enriched = (videosRes.data ?? []).map((v: any) => ({
        ...v,
        uploader_name: profileMap[v.coach_id] ?? "Coach",
      }));
      console.log(`fetchData: got ${enriched.length} videos`);
      setVideos(enriched);
      setYtPlaylists((playlistsRes.data ?? []).map((p: any) => p.title as string));
    } catch (err) {
      console.error("fetchData error:", err);
      toast({ title: "Failed to load videos", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  // Abort any in-flight upload when component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Please select an MP4, MOV, AVI, MKV, WEBM or MPEG video.", variant: "destructive" });
      return;
    }
    videoFileRef.current = file;
    setVideoFileName(file.name);
    setVideoFileSize(file.size);
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
    videoFileRef.current = null;
    setVideoFileName(null);
    setVideoFileSize(0);
    setTitle(""); setDescription("");
    setSelectedTeams(new Set()); setSelectedCategories(new Set());
    setShareWithAll(false);
    setUploadProgress(0); setUploadStatus("");
    uploadTimedOutRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    const file = videoFileRef.current;
    if (!user || !file || !title.trim()) return;
    // Nullify the state reference now — the ref keeps it alive until upload
    // completes, but React won't see the File in state during re-renders
    uploadTimedOutRef.current = false;
    setUploading(true); setUploadProgress(2); setUploadStatus("Preparing upload...");

    // Global 4-hour timeout guard
    const globalTimeout = setTimeout(() => {
      uploadTimedOutRef.current = true;
      abortRef.current?.();
    }, 4 * 60 * 60 * 1000);

    try {
      // Get a YouTube resumable upload session
      const { data, error: fnError } = await supabase.functions.invoke("youtube-video-upload", {
        body: { title: title.trim(), description: description.trim(), fileSize: file.size, mimeType: file.type || "video/mp4" },
      });
      if (fnError || !data?.uploadUrl)
        throw new Error(data?.error ?? fnError?.message ?? "Failed to get YouTube upload URL.");

      const { videoId, uploadUrl } = data;
      setUploadProgress(5); setUploadStatus("Uploading to YouTube...");

      // YouTube resumable upload: PUT the file directly to the session URI
      await uploadToYouTube(file, uploadUrl, pct => setUploadProgress(5 + Math.round(pct * 88)));

      // Release the large file from memory immediately after upload bytes are sent
      videoFileRef.current = null;

      setUploadProgress(95); setUploadStatus("Saving to video library...");

      const { error: saveError } = await (supabase as any).from("coach_videos").insert({
        coach_id:       user.id,
        title:          title.trim(),
        description:    description.trim() || null,
        video_uid:      videoId,
        video_provider: "youtube",
        team_ids:       Array.from(selectedTeams),
        categories:     Array.from(selectedCategories),
        visibility:     shareWithAll ? "all_coaches" : (selectedTeams.size > 0 ? "team" : "private"),
      });
      if (saveError) throw new Error(saveError.message);

      setUploadProgress(100); setUploadStatus("Done!");
      toast({ title: "Video uploaded!", description: "Processing on YouTube — available within a few minutes." });
      setUploadOpen(false); resetForm(); fetchData();
    } catch (err: any) {
      videoFileRef.current = null; // always free file on error
      const msg = uploadTimedOutRef.current
        ? "Upload timed out. Please try again with a smaller file or faster connection."
        : err.message;
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
      setUploadStatus("Upload failed");
    } finally {
      clearTimeout(globalTimeout);
      setUploading(false);
    }
  };

  // YouTube resumable upload via XHR.
  // OOM fix: state updates are THROTTLED - onProgress only fires when progress
  // changes by >=2% (~50 re-renders max for any file size, not one per chunk).
  // setUploadStatus is NOT called inside the loop (it never changes mid-loop).
  // abortRef is populated so unmount/timeout can cancel the in-flight XHR.
  // xhr.timeout = 90s per chunk prevents permanent hangs.
  const uploadToYouTube = async (
    file: File,
    uploadUrl: string,
    onProgress: (pct: number) => void
  ): Promise<void> => {
    const CHUNK = 8 * 1024 * 1024;
    let offset = 0;
    let lastReportedPct = 0;

    while (offset < file.size) {
      if (uploadTimedOutRef.current) throw new Error("Upload timed out.");

      const end   = Math.min(offset + CHUNK, file.size);
      const range = `bytes ${offset}-${end - 1}/${file.size}`;
      let attempts = 0;
      let status = 0;

      while (true) {
        status = await new Promise<number>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          abortRef.current = () => { xhr.abort(); reject(new Error("Upload cancelled.")); };
          xhr.timeout = 300_000;
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Range", range);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.onload    = () => { abortRef.current = null; resolve(xhr.status); };
          xhr.onerror   = () => { abortRef.current = null; reject(new Error("Network error during upload")); };
          xhr.ontimeout = () => { abortRef.current = null; reject(new Error("Chunk upload timed out (5 minutes).")); };
          xhr.send(file.slice(offset, end));
        });

        if (status === 200 || status === 201 || status === 308) break;
        if (status === 403 || status === 404 || status === 410) {
          throw new Error("YouTube upload session expired. Please start the upload again.");
        }
        if (status >= 500 && attempts < 3) {
          attempts++;
          setUploadStatus(`Connection issue - retrying (${attempts}/3)...`);
          await new Promise(r => setTimeout(r, 1500 * attempts));
          continue;
        }
        throw new Error(`YouTube upload failed at ${offset}: HTTP ${status}`);
      }

      offset = end;

      // Only update React state when progress moves >=2%. Without this, every
      // chunk fires a full re-render of the video grid, accumulating OOM pressure.
      const currentPct = offset / file.size;
      if (currentPct - lastReportedPct >= 0.02 || offset >= file.size) {
        onProgress(currentPct);
        lastReportedPct = currentPct;
      }

      await new Promise(r => setTimeout(r, 0)); // yield - lets GC run between chunks
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
      visibility: editVideo.visibility,
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
        visibility: editVideo.visibility,
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
      if (video.video_provider === "youtube") {
        await supabase.functions.invoke("youtube-video-upload", {
          body: { action: "delete", videoId: video.video_uid },
        });
      } else {
        await supabase.functions.invoke("youtube-upload-token", {
          body: { action: "delete", videoUid: video.video_uid },
        });
      }
    }
    const { error } = await (supabase as any).from("coach_videos").delete().eq("id", deleteId);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else { toast({ title: "Video removed" }); setVideos(prev => prev.filter(v => v.id !== deleteId)); }
    setDeleteId(null);
  };

  const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? id;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  const myVideos = videos.filter(v =>
    v.coach_id === user?.id ||
    (v.team_ids?.length > 0 && v.team_ids.some(tid => myTeamIds.has(tid))) ||
    v.visibility === "all_coaches"
  );
  const sharedVideos = videos.filter(v => v.coach_id !== user?.id && !v.team_ids?.some(tid => myTeamIds.has(tid)) && v.visibility === "all_coaches");
  const activeVideos = activeTab === "mine" ? myVideos : sharedVideos;
  const filteredVideos = filterCategory === "all"
    ? activeVideos
    : activeVideos.filter(v => v.categories?.includes(filterCategory));

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload and share videos with your coaching team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShareOpen(true)} className="gap-2" disabled={myVideos.length === 0}>
              <Share2 className="h-4 w-4" /> Notify Players
            </Button>
            <Button onClick={() => setUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" /> Upload Video
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => { setActiveTab("mine"); setFilterCategory("all"); }}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "mine" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="h-3.5 w-3.5" /> My Videos
            {myVideos.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{myVideos.length}</span>}
          </button>
          <button
            onClick={() => { setActiveTab("shared"); setFilterCategory("all"); }}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "shared" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> From Other Coaches
            {sharedVideos.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{sharedVideos.length}</span>}
          </button>
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
            {[...new Set([...VIDEO_CATEGORIES, ...ytPlaylists])].filter(c => videos.some(v => v.categories?.includes(c))).map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >{c}</button>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {!loading && activeTab === "mine" && myVideos.length === 0 && (
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-16 text-center cursor-pointer hover:bg-muted/60 transition-colors"
          >
            <Video className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">Drag & drop a video here, or click to browse</p>
            <p className="text-xs text-muted-foreground">MP4, MOV, AVI, MKV, WEBM supported</p>
          </div>
        )}

        {uploading && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Upload in progress. Video grid preview is paused to keep the browser stable.
          </div>
        )}

        {/* Empty state for shared tab */}
        {!loading && activeTab === "shared" && sharedVideos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">No shared videos yet</p>
            <p className="text-xs text-muted-foreground">When other coaches share videos with all coaches, they'll appear here.</p>
          </div>
        )}

        {/* Video grid */}
        {!loading && !uploading && filteredVideos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filteredVideos.map(video => (
              <Card key={video.id} className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {playingId === video.id ? (
                    <>
                      <iframe src={`${videoEmbedUrl(video.video_uid, video.video_provider)}?autoplay=true`}
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
                      <img src={videoThumbUrl(video.video_uid, video.video_provider)} alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                  {activeTab === "shared" && video.uploader_name && (
                    <p className="text-xs text-primary font-medium">by {video.uploader_name}</p>
                  )}
                  {video.description && <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {(video.categories ?? []).map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    {activeTab === "mine" && video.team_ids.map(id => <Badge key={id} variant="outline" className="text-xs">{teamName(id)}</Badge>)}
                    {activeTab === "mine" && video.visibility === "all_coaches" && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">Shared</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(video.created_at)}</span>
                    <div className="flex items-center gap-1">
                      {activeTab === "mine" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Review video"
                        onClick={() => navigate(`/coach/video-review/${video.id}`)}>
                        <ClipboardList className="h-3.5 w-3.5" />
                      </Button>
                      )}
                      {video.coach_id === user?.id && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Edit"
                        onClick={() => openEdit(video)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      )}
                      {video.coach_id === user?.id && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Notify players"
                        onClick={() => setNotifyVideo(video)}>
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" asChild>
                        <a href={videoWatchUrl(video.video_uid, video.video_provider)} target="_blank" rel="noopener noreferrer" title="Open full screen">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {video.coach_id === user?.id && (
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(video.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && <div className="flex justify-center py-16 text-muted-foreground text-sm">Loading videos...</div>}
      </div>

      {/* Notify modal — triggered from bell icon on card */}
      <NotifyVideoModal
        video={notifyVideo}
        teams={teams}
        onClose={() => setNotifyVideo(null)}
        onVisibilityChange={(id, vis) => setVideos(prev => prev.map(v => v.id === id ? { ...v, visibility: vis } : v))}
      />

      {/* Share with Players — triggered from header button, video picker first */}
      <NotifyVideoModal
        video={null}
        allVideos={myVideos}
        open={shareOpen}
        teams={teams}
        onClose={() => setShareOpen(false)}
        onVisibilityChange={(id, vis) => setVideos(prev => prev.map(v => v.id === id ? { ...v, visibility: vis } : v))}
      />

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={v => { if (!uploading) { setUploadOpen(v); if (!v) resetForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Video</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!videoFileName ? (
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
                  <p className="text-sm font-medium truncate">{videoFileName}</p>
                  <p className="text-xs text-muted-foreground">{(videoFileSize / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={() => { videoFileRef.current = null; setVideoFileName(null); setVideoFileSize(0); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                {[...new Set([...VIDEO_CATEGORIES, ...ytPlaylists])].map(c => (
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
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setShareWithAll(v => !v)}>
              <Checkbox id="share-all" checked={shareWithAll} onCheckedChange={v => setShareWithAll(!!v)} disabled={uploading} />
              <div>
                <label htmlFor="share-all" className="text-sm font-medium cursor-pointer">Share with all coaches</label>
                <p className="text-xs text-muted-foreground">Other coaches in the portal can view this video.</p>
              </div>
            </div>
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
            <Button onClick={handleUpload} disabled={uploading || !videoFileName || !title.trim()} className="gap-2 min-w-32">
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
                {[...new Set([...VIDEO_CATEGORIES, ...ytPlaylists])].map(c => (
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
                <Label>Share with teams</Label>
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
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 hover:bg-muted transition-colors cursor-pointer"
              onClick={() => { if (!editSaving) { const isShared = editVideo?.visibility === "all_coaches"; const updated = { ...editVideo!, visibility: isShared ? "private" : "all_coaches" }; setEditVideo(updated); }}}>
              <Checkbox id="edit-share-all" checked={editVideo?.visibility === "all_coaches"}
                onCheckedChange={v => setEditVideo(prev => prev ? { ...prev, visibility: v ? "all_coaches" : "private" } : prev)}
                disabled={editSaving} />
              <div>
                <label htmlFor="edit-share-all" className="text-sm font-medium cursor-pointer">Share with all coaches</label>
                <p className="text-xs text-muted-foreground">Other coaches in the portal can view this video.</p>
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
