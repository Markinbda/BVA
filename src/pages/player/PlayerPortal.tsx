import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  FileText,
  Mic,
  Users,
  User,
  Volume2,
  Loader2,
  Video,
  Trophy,
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
  is_personal?: boolean;
  coach_videos: VideoInfo | null;
}

interface PlayerRecord {
  id: string;
  first_name: string;
  last_name: string;
  team: string | null;
  team_id: string | null;
}

interface TeamStat {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  point_diff: number;
  points_awarded: number;
  rung: number;
  position: number;
}

interface VideoGroup {
  video: VideoInfo | null;
  title: string;
  notes: NoteWithVideo[];
  shared_at: string;
  hasPersonal: boolean;
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

const PlayerPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const [active, setActive] = useState<"team" | "library" | "mine">("team");
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<Record<string, number>>({});
  const [videoGroups, setVideoGroups] = useState<Array<[string, VideoGroup]>>([]);
  const [playerRecords, setPlayerRecords] = useState<PlayerRecord[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);

  const fetchPortal = useCallback(async () => {
    if (!user?.email || !isMountedRef.current) return;
    setLoading(true);
    const normalizedEmail = user.email.trim().toLowerCase();

    const [playersRes, notesRes, sharesRes] = await Promise.all([
      (supabase as any)
        .from("coach_players")
        .select("id, first_name, last_name, team, team_id")
        .ilike("email", normalizedEmail),
      (supabase as any)
        .from("video_notes")
        .select("id, video_id, timestamp_seconds, note_type, note_text, voice_url, is_all_players, player_id, created_at, coach_videos(id, title, video_uid, video_provider)")
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("video_share_tokens")
        .select("video_id, created_at, is_personal, coach_videos(id, title, video_uid, video_provider)")
        .order("created_at", { ascending: false }),
    ]);

    if (!isMountedRef.current) return;

    if (playersRes.error || notesRes.error || sharesRes.error) {
      toast({ title: "Failed to load player portal", variant: "destructive" });
      setLoading(false);
      return;
    }

    const players: PlayerRecord[] = playersRes.data ?? [];
    setPlayerRecords(players);

    const notes: NoteWithVideo[] = notesRes.data ?? [];
    const shares: SharedTokenVideo[] = sharesRes.data ?? [];

    const grouped: Record<string, VideoGroup> = {};

    for (const note of notes) {
      const key = note.video_id;
      if (!grouped[key]) {
        grouped[key] = {
          video: note.coach_videos,
          title: note.coach_videos?.title ?? "Shared Video",
          notes: [],
          shared_at: note.created_at,
          hasPersonal: false,
        };
      }
      grouped[key].notes.push(note);
      if (!grouped[key].video && note.coach_videos) grouped[key].video = note.coach_videos;
      if (!note.is_all_players) grouped[key].hasPersonal = true;
    }

    for (const share of shares) {
      const key = share.video_id;
      if (!grouped[key]) {
        grouped[key] = {
          video: share.coach_videos,
          title: share.coach_videos?.title ?? "Shared Video",
          notes: [],
          shared_at: share.created_at,
          hasPersonal: !!share.is_personal,
        };
      } else {
        if (!grouped[key].video && share.coach_videos) grouped[key].video = share.coach_videos;
        if (share.is_personal) grouped[key].hasPersonal = true;
      }
    }

    const sortedGroups = Object.entries(grouped).sort(
      (a, b) => new Date(b[1].shared_at).getTime() - new Date(a[1].shared_at).getTime()
    );
    if (isMountedRef.current) setVideoGroups(sortedGroups);

    const voiceNotes = notes.filter(n => n.note_type === "voice" && n.voice_url);
    if (voiceNotes.length && isMountedRef.current) {
      const urls: Record<string, string> = {};
      await Promise.all(
        voiceNotes.map(async (n) => {
          const { data: signed } = await supabase.storage
            .from("video-voice-notes")
            .createSignedUrl(n.voice_url!, 3600);
          if (signed?.signedUrl) urls[n.id] = signed.signedUrl;
        })
      );
      if (isMountedRef.current) setSignedUrls(urls);
    }

    // Team stats lookup from latest weekly standings per team name/team_id
    const stats: TeamStat[] = [];
    for (const p of players) {
      let teamId = p.team_id;
      let teamName = p.team ?? "Team";

      if (!teamId && p.team) {
        const { data: teamRow } = await (supabase as any)
          .from("league_teams")
          .select("id, team_name")
          .eq("team_name", p.team)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (teamRow) {
          teamId = teamRow.id;
          teamName = teamRow.team_name;
        }
      }

      if (!teamId) continue;

      const { data: standing } = await (supabase as any)
        .from("league_weekly_standings")
        .select("team_id, wins, losses, point_diff, points_awarded, rung, position")
        .eq("team_id", teamId)
        .order("week_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (standing) {
        stats.push({
          team_id: standing.team_id,
          team_name: teamName,
          wins: standing.wins,
          losses: standing.losses,
          point_diff: standing.point_diff,
          points_awarded: standing.points_awarded,
          rung: standing.rung,
          position: standing.position,
        });
      }
    }
    if (isMountedRef.current) setTeamStats(stats);
    if (isMountedRef.current) setLoading(false);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMountedRef.current = true;
    if (!user) {
      navigate("/");
      return;
    }
    fetchPortal();
    return () => {
      isMountedRef.current = false;
    };
  }, [user, navigate, fetchPortal]);

  const allGroups = useMemo(() => videoGroups, [videoGroups]);
  const myGroups = useMemo(() => videoGroups.filter(([, g]) => g.hasPersonal), [videoGroups]);

  const groupsToRender = active === "mine" ? myGroups : allGroups;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Player Portal</h1>
          <p className="text-sm text-muted-foreground">Team details, stats and your shared coaching videos.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant={active === "team" ? "default" : "outline"} onClick={() => setActive("team")}>Team & Stats</Button>
          <Button variant={active === "library" ? "default" : "outline"} onClick={() => setActive("library")}>Video Library</Button>
          <Button variant={active === "mine" ? "default" : "outline"} onClick={() => setActive("mine")}>My Videos</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : active === "team" ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Teams</h2>
                {playerRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No player team mapping found for your email.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {playerRecords.map((p) => (
                      <Badge key={p.id} variant="secondary">{p.team ?? "Unassigned Team"}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><Trophy className="h-4 w-4" /> Team Stats</h2>
                {teamStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No league stats available yet for your team.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {teamStats.map((s) => (
                      <div key={s.team_id} className="rounded-lg border p-3 text-sm">
                        <p className="font-semibold">{s.team_name}</p>
                        <p className="text-muted-foreground">Rung {s.rung} • Position {s.position}</p>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                          <span>Wins: <strong>{s.wins}</strong></span>
                          <span>Losses: <strong>{s.losses}</strong></span>
                          <span>Points: <strong>{s.points_awarded}</strong></span>
                          <span>Diff: <strong>{s.point_diff}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {groupsToRender.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-16 text-center">
                <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-muted-foreground">
                  {active === "mine" ? "No personal videos yet" : "No shared videos yet"}
                </p>
              </div>
            ) : groupsToRender.map(([videoId, group]) => (
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
                      <Video className="h-4 w-4" /> Watch Video
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
                              onClick={() => group.video && setPlaying(prev => ({ ...prev, [note.video_id]: note.timestamp_seconds }))}
                              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary hover:bg-primary/20 transition-colors"
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
                              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium"><Users className="h-3 w-3" /> Team Note</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-primary font-medium"><User className="h-3 w-3" /> For You</span>
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

export default PlayerPortal;
