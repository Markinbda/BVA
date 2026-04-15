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
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  coach_videos: {
    title: string;
    video_uid: string;
    video_provider: "cloudflare" | "youtube";
  } | null;
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

const PlayerNotesView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notes, setNotes] = useState<NoteWithVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("video_notes")
      .select("id, video_id, timestamp_seconds, note_type, note_text, voice_url, is_all_players, player_id, created_at, coach_videos(title, video_uid, video_provider)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load notes", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const fetched: NoteWithVideo[] = data ?? [];
    setNotes(fetched);

    // Fetch signed URLs for voice notes
    const voiceNotes = fetched.filter(n => n.note_type === "voice" && n.voice_url);
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
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchNotes();
  }, [user, navigate, fetchNotes]);

  // Group notes by video_id
  const byVideo = notes.reduce<Record<string, { title: string; notes: NoteWithVideo[] }>>((acc, note) => {
    const key = note.video_id;
    if (!acc[key]) acc[key] = { title: note.coach_videos?.title ?? "Unknown Video", notes: [] };
    acc[key].notes.push(note);
    return acc;
  }, {});

  const videoGroups = Object.values(byVideo);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">My Coach Notes</h1>
            <p className="text-sm text-muted-foreground">Notes your coach has shared with you</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No notes yet</p>
            <p className="text-sm text-muted-foreground mt-1">When your coach adds notes for you, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videoGroups.map((group) => (
              <div key={group.title}>
                <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {group.title}
                </h2>
                <div className="space-y-3">
                  {group.notes.map((note) => (
                    <Card key={note.id} className="shadow-sm">
                      <CardContent className="pt-4 pb-3 space-y-2">
                        {/* Header row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary">
                            <Clock className="h-3 w-3" />
                            {fmtTime(note.timestamp_seconds)}
                          </span>

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

                        {/* Content */}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PlayerNotesView;