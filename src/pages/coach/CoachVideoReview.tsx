import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Plus,
  Trash2,
  User,
  Users,
  Clock,
  FileText,
  Volume2,
  Loader2,
  StopCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoachVideo {
  id: string;
  title: string;
  video_uid: string;
  video_provider: "cloudflare" | "youtube";
  team_ids: string[];
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
}

interface VideoNote {
  id: string;
  timestamp_seconds: number;
  note_type: "text" | "voice";
  note_text: string | null;
  voice_url: string | null;
  player_id: string | null;
  is_all_players: boolean;
  created_at: string;
  player?: Player;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ─── Component ───────────────────────────────────────────────────────────────

const CoachVideoReview = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // --- Video + data ---
  const [video, setVideo] = useState<CoachVideo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- Timestamp capture ---
  // For YouTube we use postMessage; for Cloudflare we use the iframe src trick.
  // We store the last known time in a ref so we don't re-render on every tick.
  const currentTimeRef = useRef(0);
  const [displayTime, setDisplayTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytReadyRef = useRef(false);

  // --- Note form ---
  const [noteText, setNoteText] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  // --- Voice recording ---
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Delete note ---
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // --- Signed URLs cache for voice notes ---
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // ── Load data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!videoId || !user) return;
    setLoadingData(true);

    const [videoRes, notesRes] = await Promise.all([
      (supabase as any).from("coach_videos").select("id,title,video_uid,video_provider,team_ids").eq("id", videoId).single(),
      (supabase as any).from("video_notes").select("*").eq("video_id", videoId).order("timestamp_seconds"),
    ]);

    if (videoRes.error || !videoRes.data) {
      toast({ title: "Video not found", variant: "destructive" });
      navigate("/coach/videos");
      return;
    }

    const vid: CoachVideo = videoRes.data;
    setVideo(vid);

    // Load players from all teams this video belongs to
    if (vid.team_ids?.length) {
      const { data: playersData } = await (supabase as any)
        .from("coach_players")
        .select("id,first_name,last_name,team_id")
        .eq("coach_id", user.id)
        .in("team_id", vid.team_ids)
        .order("last_name");
      setPlayers(playersData ?? []);
    } else {
      // No team filter — load all coach's players
      const { data: playersData } = await (supabase as any)
        .from("coach_players")
        .select("id,first_name,last_name,team_id")
        .eq("coach_id", user.id)
        .order("last_name");
      setPlayers(playersData ?? []);
    }

    const fetchedNotes: VideoNote[] = notesRes.data ?? [];
    setNotes(fetchedNotes);

    // Fetch signed URLs for any voice notes
    const voiceNotes = fetchedNotes.filter(n => n.note_type === "voice" && n.voice_url);
    if (voiceNotes.length) {
      const urls: Record<string, string> = {};
      await Promise.all(
        voiceNotes.map(async (n) => {
          const { data } = await supabase.storage
            .from("video-voice-notes")
            .createSignedUrl(n.voice_url!, 3600);
          if (data?.signedUrl) urls[n.id] = data.signedUrl;
        })
      );
      setSignedUrls(urls);
    }

    setLoadingData(false);
  }, [videoId, user, navigate, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── YouTube IFrame API timestamp polling ─────────────────────────────────

  useEffect(() => {
    if (!video || video.video_provider !== "youtube") return;

    const handleMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const msg = JSON.parse(e.data);
        // YT IFrame API sends info events with currentTime
        if (msg.event === "infoDelivery" && typeof msg.info?.currentTime === "number") {
          currentTimeRef.current = msg.info.currentTime;
          setDisplayTime(Math.floor(msg.info.currentTime));
        }
        if (msg.event === "onReady") ytReadyRef.current = true;
      } catch { /* ignore non-JSON */ }
    };

    window.addEventListener("message", handleMessage);

    // Poll YouTube player for currentTime every second via postMessage
    const poll = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "getVideoData", id: 1 }),
        "*"
      );
      // Request current time via listening API
      iframeRef.current?.contentWindow?.postMessage(
        '{"event":"listening"}',
        "*"
      );
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(poll);
    };
  }, [video]);

  // ── Capture current timestamp from Cloudflare iframe ─────────────────────

  const captureTimestamp = useCallback(() => {
    if (!video) return currentTimeRef.current;

    if (video.video_provider === "cloudflare") {
      // Cloudflare Stream allows postMessage for current time
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "getCurrentTime" }),
        "*"
      );
      // Return the last known value immediately (updated by message listener)
    }
    return currentTimeRef.current;
  }, [video]);

  // Listen for Cloudflare Stream currentTime responses
  useEffect(() => {
    if (!video || video.video_provider !== "cloudflare") return;
    const handler = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const msg = JSON.parse(e.data);
        if (typeof msg.currentTime === "number") {
          currentTimeRef.current = msg.currentTime;
          setDisplayTime(Math.floor(msg.currentTime));
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [video]);

  // ── Save text note ────────────────────────────────────────────────────────

  const handleSaveTextNote = async () => {
    if (!noteText.trim() || !user || !videoId) return;
    setSaving(true);
    const ts = captureTimestamp();
    const isAll = selectedPlayer === "all";
    const { data, error } = await (supabase as any).from("video_notes").insert({
      coach_id: user.id,
      video_id: videoId,
      timestamp_seconds: ts,
      note_type: "text",
      note_text: noteText.trim(),
      player_id: isAll || selectedPlayer === "none" ? null : selectedPlayer,
      is_all_players: isAll,
    }).select().single();

    if (error) {
      toast({ title: "Failed to save note", description: error.message, variant: "destructive" });
    } else {
      const player = isAll ? undefined : players.find(p => p.id === selectedPlayer);
      setNotes(prev => [...prev, { ...data, player }].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      setNoteText("");
      toast({ title: "Note saved", description: `At ${fmtTime(ts)}` });
    }
    setSaving(false);
  };

  // ── Voice recording ───────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to record voice notes.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve(blob);
      };
      recorder.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecording(false);
    });
  };

  const handleSaveVoiceNote = async () => {
    if (!user || !videoId) return;
    setSaving(true);
    const ts = captureTimestamp();
    const blob = await stopRecording();
    if (!blob || blob.size < 100) {
      toast({ title: "Recording too short", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Upload to storage
    const noteId = crypto.randomUUID();
    const path = `${user.id}/${videoId}/${noteId}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("video-voice-notes")
      .upload(path, blob, { contentType: "audio/webm" });

    if (uploadError) {
      toast({ title: "Failed to upload voice note", description: uploadError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const isAll = selectedPlayer === "all";
    const { data, error } = await (supabase as any).from("video_notes").insert({
      id: noteId,
      coach_id: user.id,
      video_id: videoId,
      timestamp_seconds: ts,
      note_type: "voice",
      voice_url: path,
      player_id: isAll || selectedPlayer === "none" ? null : selectedPlayer,
      is_all_players: isAll,
    }).select().single();

    if (error) {
      toast({ title: "Failed to save voice note", description: error.message, variant: "destructive" });
    } else {
      // Generate signed URL for playback
      const { data: signed } = await supabase.storage
        .from("video-voice-notes")
        .createSignedUrl(path, 3600);
      const player = isAll ? undefined : players.find(p => p.id === selectedPlayer);
      setNotes(prev => [...prev, { ...data, player }].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      if (signed?.signedUrl) setSignedUrls(prev => ({ ...prev, [noteId]: signed.signedUrl }));
      toast({ title: "Voice note saved", description: `At ${fmtTime(ts)}` });
    }
    setSaving(false);
  };

  // ── Delete note ───────────────────────────────────────────────────────────

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    const note = notes.find(n => n.id === deleteNoteId);
    if (note?.voice_url) {
      await supabase.storage.from("video-voice-notes").remove([note.voice_url]);
    }
    await (supabase as any).from("video_notes").delete().eq("id", deleteNoteId);
    setNotes(prev => prev.filter(n => n.id !== deleteNoteId));
    setDeleteNoteId(null);
    toast({ title: "Note deleted" });
  };

  // ── Seek video to timestamp ───────────────────────────────────────────────

  const seekTo = (secs: number) => {
    if (!video) return;
    if (video.video_provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [secs, true] }),
        "*"
      );
    } else {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "seek", data: secs }),
        "*"
      );
    }
  };

  const playerName = (p: Player) => `${p.first_name} ${p.last_name}`;

  if (loadingData || !video) {
    return (
      <CoachLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CoachLayout>
    );
  }

  const ytEmbedSrc = `https://www.youtube.com/embed/${video.video_uid}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0`;
  const cfEmbedSrc = `https://iframe.videodelivery.net/${video.video_uid}?preload=true`;

  return (
    <CoachLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/coach/videos")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{video.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Video Review &amp; Notes</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* ── Left: video player ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-xl overflow-hidden bg-black shadow-lg">
              <div className="relative aspect-video">
                <iframe
                  ref={iframeRef}
                  src={video.video_provider === "youtube" ? ytEmbedSrc : cfEmbedSrc}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  title={video.title}
                />
              </div>
            </div>

            {/* Current time display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Current position: <strong className="text-foreground font-mono">{fmtTime(displayTime)}</strong></span>
              <span className="text-xs">(pause video to capture timestamp)</span>
            </div>

            {/* ── Note creation panel ── */}
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <h2 className="font-semibold text-sm">Add Note at {fmtTime(displayTime)}</h2>

              {/* Player selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assign to player (optional)
                </label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="No player assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No player assigned</SelectItem>
                    <SelectItem value="all">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        All Players
                      </span>
                    </SelectItem>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {playerName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text note */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Text Note
                </label>
                <Textarea
                  placeholder="Type a note about this moment..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={3}
                  className="resize-none"
                  disabled={saving || recording}
                />
                <Button
                  size="sm"
                  className="gap-2 w-full"
                  onClick={handleSaveTextNote}
                  disabled={!noteText.trim() || saving || recording}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save Text Note
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
                </div>
              </div>

              {/* Voice note */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Voice Note
                </label>
                {!recording ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={startRecording}
                    disabled={saving || !!noteText.trim()}
                  >
                    <Mic className="h-4 w-4" /> Start Recording
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-mono text-red-700 dark:text-red-400">{fmtTime(recordingSeconds)}</span>
                      <span className="text-xs text-red-600 dark:text-red-400 ml-1">Recording...</span>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 w-full bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleSaveVoiceNote}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                      Stop &amp; Save Voice Note
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={async () => { await stopRecording(); }}
                      disabled={saving}
                    >
                      <MicOff className="h-4 w-4 mr-2" /> Discard Recording
                    </Button>
                  </div>
                )}
                {!!noteText.trim() && !recording && (
                  <p className="text-xs text-muted-foreground">Clear the text note field to record voice instead.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: notes list ── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">
                Notes
                {notes.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">({notes.length})</span>
                )}
              </h2>
            </div>

            {notes.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Pause the video and add a note.</p>
              </div>
            )}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {notes.map(note => {
                const assignedPlayer = note.player_id
                  ? players.find(p => p.id === note.player_id)
                  : null;
                return (
                  <div key={note.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
                        onClick={() => seekTo(note.timestamp_seconds)}
                        title="Click to seek to this moment"
                      >
                        <Clock className="h-3 w-3" />
                        {fmtTime(note.timestamp_seconds)}
                      </button>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        {note.note_type === "voice" ? (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <Mic className="h-2.5 w-2.5" /> Voice
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <FileText className="h-2.5 w-2.5" /> Text
                          </Badge>
                        )}
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => setDeleteNoteId(note.id)}
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Assigned player / all-players badge */}
                    {note.is_all_players ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                        <Users className="h-3 w-3" />
                        All Players
                      </div>
                    ) : assignedPlayer ? (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <User className="h-3 w-3" />
                        {playerName(assignedPlayer)}
                      </div>
                    ) : null}

                    {/* Content */}
                    {note.note_type === "text" && note.note_text && (
                      <p className="text-sm text-foreground leading-relaxed">{note.note_text}</p>
                    )}
                    {note.note_type === "voice" && signedUrls[note.id] && (
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <audio
                          src={signedUrls[note.id]}
                          controls
                          className="h-8 w-full"
                          style={{ minWidth: 0 }}
                        />
                      </div>
                    )}
                    {note.note_type === "voice" && !signedUrls[note.id] && (
                      <p className="text-xs text-muted-foreground italic">Voice note (loading...)</p>
                    )}

                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={v => { if (!v) setDeleteNoteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This note will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default CoachVideoReview;