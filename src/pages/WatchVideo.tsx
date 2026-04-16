import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, Mic, Users, User, Volume2, Loader2, Play } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  video_uid: string;
  video_provider: "cloudflare" | "youtube";
}

interface Note {
  id: string;
  timestamp_seconds: number;
  note_type: "text" | "voice";
  note_text: string | null;
  voice_url: string | null;
  signed_url?: string | null;
  is_all_players: boolean;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const buildEmbed = (video: VideoData, seconds: number) => {
  const base =
    video.video_provider === "youtube"
      ? `https://www.youtube.com/embed/${video.video_uid}?rel=0`
      : `https://iframe.videodelivery.net/${video.video_uid}`;
  if (seconds <= 0) return base;
  return video.video_provider === "youtube"
    ? `${base}&start=${Math.floor(seconds)}`
    : `${base}?startTime=${Math.floor(seconds)}s`;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// ─── Component ───────────────────────────────────────────────────────────────

const WatchVideo = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [video, setVideo]           = useState<VideoData | null>(null);
  const [notes, setNotes]           = useState<Note[]>([]);
  const [seekTo, setSeekTo]         = useState<number | null>(null);
  const [playing, setPlaying]       = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid link."); setLoading(false); return; }

    const fn = async () => {
      // Call the public edge function — no auth needed
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-video-share?token=${token}`,
        { headers: { apikey: SUPABASE_ANON } }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "This link is invalid or has expired.");
        setLoading(false);
        return;
      }
      setPlayerName(data.player_name ?? null);
      setVideo(data.video);
      setNotes(data.notes ?? []);
      setLoading(false);
    };

    fn();
  }, [token]);

  const jumpTo = (secs: number) => {
    setSeekTo(secs);
    setPlaying(true);
  };

  const embedSrc = video
    ? playing
      ? buildEmbed(video, seekTo ?? 0)
      : null
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Link Unavailable</h1>
        <p className="text-muted-foreground max-w-sm">{error ?? "This link is invalid or has expired."}</p>
        <Link to="/" className="text-primary text-sm underline underline-offset-4">
          Go to bermudavolleyball.bm
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/">
            <img src="/bva-logo.png" alt="BVA" className="h-8" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-bold text-foreground text-sm">Bermuda Volleyball Association</span>
          </Link>
          <Link to="/my-notes" className="text-xs text-primary underline underline-offset-2">
            View all my videos →
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{video.title}</h1>
          {playerName && (
            <p className="text-sm text-muted-foreground mt-1">Shared with {playerName}</p>
          )}
          {video.description && (
            <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
          )}
        </div>

        {/* Video player */}
        {playing && embedSrc ? (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
            <iframe
              key={`${seekTo}`}
              src={embedSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
              title={video.title}
            />
          </div>
        ) : (
          <button
            onClick={() => { setSeekTo(0); setPlaying(true); }}
            className="w-full rounded-xl bg-muted/50 border-2 border-dashed border-border aspect-video flex flex-col items-center justify-center gap-3 hover:bg-muted/80 transition-colors"
          >
            <Play className="h-12 w-12 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Click to watch</span>
          </button>
        )}

        {/* Coach notes */}
        {notes.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Coach Notes ({notes.length})
            </h2>

            {notes.map(note => (
              <Card key={note.id} className="shadow-sm">
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Timestamp button — jumps video */}
                    <button
                      onClick={() => jumpTo(note.timestamp_seconds)}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
                      title="Jump to this moment"
                    >
                      <Clock className="h-3 w-3" />
                      {fmtTime(note.timestamp_seconds)}
                    </button>

                    {note.note_type === "voice" ? (
                      <Badge variant="outline" className="text-xs gap-1"><Mic className="h-2.5 w-2.5" /> Voice</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1"><FileText className="h-2.5 w-2.5" /> Note</Badge>
                    )}

                    {note.is_all_players ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Users className="h-3 w-3" /> Team Note
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <User className="h-3 w-3" /> For You
                      </span>
                    )}
                  </div>

                  {note.note_type === "text" && note.note_text && (
                    <p className="text-sm text-foreground leading-relaxed">{note.note_text}</p>
                  )}

                  {note.note_type === "voice" && note.signed_url && (
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <audio src={note.signed_url} controls className="h-8 w-full" style={{ minWidth: 0 }} />
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No annotations on this video yet.</p>
        )}

        <p className="text-center text-xs text-muted-foreground pb-6">
          Bermuda Volleyball Association &mdash; Coach Portal
        </p>
      </div>
    </div>
  );
};

export default WatchVideo;
