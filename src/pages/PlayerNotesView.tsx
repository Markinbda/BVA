import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  FileText,
  Mic,
  Users,
  User,
  Volume2,
  Loader2,
  ClipboardList,
  Play,
  Video,
} from "lucide-react";

interface VideoInfo {
  id: string;
  title: string;
  video_uid: string;
  video_provider: "cloudflare" | "youtube";
}

interface NoteWithVideo {
  id: string;
  video_id: string;
  timestamp_seconds: number;
  note_type: "text" | "voice";
  note_text: string | null;
  voice_url: string | null;
  is_all_players: boolean;
  player_id: string | null;
  created_at: string;
  coach_videos: VideoInfo | null;
}

interface SharedTokenVideo {
  video_id: string;
  created_at: string;
  coach_videos: VideoInfo | null;
}

interface VideoGroup {
  video: VideoInfo | null;
  title: string;
  notes: NoteWithVideo[];
  shared_at: string;
}

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const buildEmbedWithTime = (
  cv: { video_uid: string; video_provider: "cloudflare" | "youtube" },
  seconds: number,
) => {
  const base =
    cv.video_provider === "youtube"
      ? `https://www.youtube.com/embed/${cv.video_uid}?rel=0`
      : `https://iframe.videodelivery.net/${cv.video_uid}`;
  if (seconds <= 0) return base;
  return cv.video_provider === "youtube"
    ? `${base}&start=${Math.floor(seconds)}`
    : `${base}?startTime=${Math.floor(seconds)}s`;
};

const PlayerNotesView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [videoGroups, setVideoGroups] = useState<Array<[string, VideoGroup]>>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<Record<string, number>>({});

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [notesRes, sharesRes] = await Promise.all([
      (supabase as any)
        .from("video_notes")
        .select("id, video_id, timestamp_seconds, note_type, note_text, voice_url, is_all_players, player_id, created_at, coach_videos(id, title, video_uid, video_provider)")
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("video_share_tokens")
        .select("video_id, created_at, coach_videos(id, title, video_uid, video_provider)")
        .order("created_at", { ascending: false }),
    ]);

    if (notesRes.error) {
      toast({ title: "Failed to load notes", description: notesRes.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (sharesRes.error) {
      toast({ title: "Failed to load shared videos", description: sharesRes.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const fetchedNotes: NoteWithVideo[] = notesRes.data ?? [];
    const sharedVideos: SharedTokenVideo[] = sharesRes.data ?? [];

    const grouped: Record<string, VideoGroup> = {};

    for (const note of fetchedNotes) {
      const key = note.video_id;
      if (!grouped[key]) {
        grouped[key] = {
          video: note.coach_videos,
          title: note.coach_videos?.title ?? "Shared Video",
          notes: [],
          shared_at: note.created_at,
        };
      }
      grouped[key].notes.push(note);
      if (!grouped[key].video && note.coach_videos) grouped[key].video = note.coach_videos;
    }

    for (const shared of sharedVideos) {
      const key = shared.video_id;
      if (!grouped[key]) {
        grouped[key] = {
          video: shared.coach_videos,
          title: shared.coach_videos?.title ?? "Shared Video",
          notes: [],
          shared_at: shared.created_at,
        };
      } else if (!grouped[key].video && shared.coach_videos) {
        grouped[key].video = shared.coach_videos;
      }
    }

    const sortedGroups = Object.entries(grouped).sort(
      (a, b) => new Date(b[1].shared_at).getTime() - new Date(a[1].shared_at).getTime()
    );
    setVideoGroups(sortedGroups);

    const voiceNotes = fetchedNotes.filter(n => n.note_type === "voice" && n.voice_url);
    if (voiceNotes.length) {
      const urls: Record<string, string> = {};
      await Promise.all(
        voiceNotes.map(async (n) => {
          const { data: signed } = await supabase.storage
            .from("video-voice-notes")
            .createSignedUrl(n.voice_url!, 3600);
          if (signed?.signedUrl) urls[n.id] = signed.signedUrl;
        })
      );
      setSignedUrls(urls);
    }

    setLoading(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchLibrary();
  }, [user, navigate, fetchLibrary]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">My Video Library</h1>
            <p className="text-sm text-muted-foreground">Videos your coach has shared, with timestamps and annotations</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : videoGroups.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-16 text-center">
            <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No shared videos yet</p>
            <p className="text-sm text-muted-foreground mt-1">When your coach shares videos, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videoGroups.map(([videoId, group]) => (
              <div key={videoId}>
                <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {group.title}
                </h2>

                {group.video &&
                  (playing[videoId] !== undefined ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-3">
                      <iframe
                        src={buildEmbedWithTime(group.video, playing[videoId])}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                        title={group.title}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setPlaying(prev => ({ ...prev, [videoId]: 0 }))}
                      className="w-full rounded-lg bg-muted/50 border p-3 text-sm text-muted-foreground hover:bg-muted flex items-center justify-center gap-2 mb-3 transition-colors"
                    >
                      <Play className="h-4 w-4" /> Watch Video
                    </button>
                  ))}

                {group.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic mb-3">No annotations on this video yet.</p>
                ) : (
                  <div className="space-y-3">
                    {group.notes.map((note) => (
                      <Card key={note.id} className="shadow-sm">
                        <CardContent className="pt-4 pb-3 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() =>
                                group.video &&
                                setPlaying(prev => ({ ...prev, [note.video_id]: note.timestamp_seconds }))
                              }
                              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
                              title="Jump to this moment"
                            >
                              <Clock className="h-3 w-3" />
                              {fmtTime(note.timestamp_seconds)}
                            </button>

                            {note.note_type === "voice" ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Mic className="h-2.5 w-2.5" /> Voice
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1">
                                <FileText className="h-2.5 w-2.5" /> Note
                              </Badge>
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

                          {note.note_type === "voice" && signedUrls[note.id] && (
                            <div className="flex items-center gap-2">
                              <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <audio src={signedUrls[note.id]} controls className="h-8 w-full" style={{ minWidth: 0 }} />
                            </div>
                          )}

                          {note.note_type === "voice" && !signedUrls[note.id] && (
                            <p className="text-xs text-muted-foreground italic">Voice note (unavailable)</p>
                          )}

                          <p className="text-[10px] text-muted-foreground/60">
                            {new Date(note.created_at).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PlayerNotesView;