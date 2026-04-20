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
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
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

interface SharedDocument {
  id: string;
  file_name: string;
  file_path: string;
  description: string | null;
  uploaded_at: string;
  sent_at: string;
}

interface SharedDocumentSet {
  id: string;
  name: string;
  description: string | null;
  sent_at: string;
  documents: SharedDocument[];
}

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-BM", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

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

  const [active, setActive] = useState<"team" | "library" | "mine" | "documents">("team");
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<Record<string, number>>({});
  const [videoGroups, setVideoGroups] = useState<Array<[string, VideoGroup]>>([]);
  const [playerRecords, setPlayerRecords] = useState<PlayerRecord[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [sharedSets, setSharedSets] = useState<SharedDocumentSet[]>([]);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);

  const fetchPortal = useCallback(async () => {
    if (!user?.email || !isMountedRef.current) return;
    setLoading(true);

    const [playersRes, notesRes, sharesRes] = await Promise.all([
      (supabase as any).rpc("get_players_by_email_normalized", { p_email: user.email }),
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

    const playerIds = players.map((player) => player.id);

    if (playerIds.length > 0) {
      const { data: rawDocShares, error: docSharesError } = await (supabase as any)
        .from("coach_document_player_shares")
        .select("id, player_id, document_id, set_id, sent_at, coach_documents(id, file_name, file_path, description, uploaded_at)")
        .in("player_id", playerIds)
        .order("sent_at", { ascending: false });

      if (docSharesError) {
        toast({ title: "Unable to load shared documents", description: docSharesError.message, variant: "destructive" });
      } else {
        const directDocMap = new Map<string, SharedDocument>();
        const setShareSentAt = new Map<string, string>();

        for (const share of rawDocShares ?? []) {
          if (share.document_id && share.coach_documents) {
            const current = directDocMap.get(share.document_id);
            if (!current || new Date(share.sent_at).getTime() > new Date(current.sent_at).getTime()) {
              directDocMap.set(share.document_id, {
                id: share.coach_documents.id,
                file_name: share.coach_documents.file_name,
                file_path: share.coach_documents.file_path,
                description: share.coach_documents.description,
                uploaded_at: share.coach_documents.uploaded_at,
                sent_at: share.sent_at,
              });
            }
          }

          if (share.set_id) {
            const currentSent = setShareSentAt.get(share.set_id);
            if (!currentSent || new Date(share.sent_at).getTime() > new Date(currentSent).getTime()) {
              setShareSentAt.set(share.set_id, share.sent_at);
            }
          }
        }

        const setIds = Array.from(setShareSentAt.keys());
        let setRows: Array<any> = [];
        let setItems: Array<any> = [];

        if (setIds.length > 0) {
          const [{ data: setData, error: setsError }, { data: itemData, error: itemsError }] = await Promise.all([
            (supabase as any)
              .from("coach_document_sets")
              .select("id, name, description")
              .in("id", setIds),
            (supabase as any)
              .from("coach_document_set_items")
              .select("set_id, document_id")
              .in("set_id", setIds),
          ]);

          if (setsError) {
            toast({ title: "Unable to load shared document sets", description: setsError.message, variant: "destructive" });
          } else if (itemsError) {
            toast({ title: "Unable to load shared set items", description: itemsError.message, variant: "destructive" });
          } else {
            setRows = setData ?? [];
            setItems = itemData ?? [];
          }
        }

        const setDocumentIds = Array.from(new Set(setItems.map((item) => item.document_id)));
        const setDocMap = new Map<string, SharedDocument>();
        if (setDocumentIds.length > 0) {
          const { data: setDocs, error: setDocsError } = await (supabase as any)
            .from("coach_documents")
            .select("id, file_name, file_path, description, uploaded_at")
            .in("id", setDocumentIds);

          if (setDocsError) {
            toast({ title: "Unable to load shared set files", description: setDocsError.message, variant: "destructive" });
          } else {
            for (const doc of setDocs ?? []) {
              setDocMap.set(doc.id, {
                id: doc.id,
                file_name: doc.file_name,
                file_path: doc.file_path,
                description: doc.description,
                uploaded_at: doc.uploaded_at,
                sent_at: "",
              });
            }
          }
        }

        const itemsBySet = new Map<string, SharedDocument[]>();
        for (const item of setItems) {
          const doc = setDocMap.get(item.document_id);
          if (!doc) continue;
          const sentAt = setShareSentAt.get(item.set_id) ?? doc.uploaded_at;
          const docs = itemsBySet.get(item.set_id) ?? [];
          docs.push({ ...doc, sent_at: sentAt });
          itemsBySet.set(item.set_id, docs);
        }

        const mappedSets: SharedDocumentSet[] = setRows
          .map((setRow) => ({
            id: setRow.id,
            name: setRow.name,
            description: setRow.description,
            sent_at: setShareSentAt.get(setRow.id) ?? new Date().toISOString(),
            documents: itemsBySet.get(setRow.id) ?? [],
          }))
          .filter((setRow) => setRow.documents.length > 0)
          .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

        const mappedDocs = Array.from(directDocMap.values()).sort(
          (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        );

        setSharedDocuments(mappedDocs);
        setSharedSets(mappedSets);
      }
    } else {
      setSharedDocuments([]);
      setSharedSets([]);
    }

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

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("coach-documents")
      .createSignedUrl(filePath, 60 * 5);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Could not generate signed URL");
    }
    return data.signedUrl;
  };

  const handleOpenDocument = async (doc: SharedDocument) => {
    setOpeningDocumentId(doc.id);
    try {
      const signedUrl = await getSignedUrl(doc.file_path);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast({ title: "Unable to open file", description: String(error?.message ?? error), variant: "destructive" });
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const handleDownloadDocument = async (doc: SharedDocument) => {
    try {
      const signedUrl = await getSignedUrl(doc.file_path);
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
          <p className="text-sm text-muted-foreground">Team details, stats, shared coaching videos and documents.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant={active === "team" ? "default" : "outline"} onClick={() => setActive("team")}>Team & Stats</Button>
          <Button variant={active === "library" ? "default" : "outline"} onClick={() => setActive("library")}>Video Library</Button>
          <Button variant={active === "mine" ? "default" : "outline"} onClick={() => setActive("mine")}>My Videos</Button>
          <Button variant={active === "documents" ? "default" : "outline"} onClick={() => setActive("documents")}>Document Library</Button>
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
        ) : active === "documents" ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-4">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Shared Document Sets</h2>
                {sharedSets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No document sets have been shared with you yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sharedSets.map((set) => (
                      <div key={set.id} className="rounded-md border p-3 space-y-3">
                        <div>
                          <p className="font-medium">{set.name}</p>
                          {set.description && <p className="text-sm text-muted-foreground">{set.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">Shared {formatDate(set.sent_at)} • {set.documents.length} document{set.documents.length === 1 ? "" : "s"}</p>
                        </div>
                        <div className="space-y-2">
                          {set.documents.map((doc) => (
                            <div key={`${set.id}-${doc.id}`} className="rounded-md border px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-medium">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground">{doc.description ?? "No description"}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOpenDocument(doc)} disabled={openingDocumentId === doc.id}>
                                  <ExternalLink className="h-4 w-4" />
                                  {openingDocumentId === doc.id ? "Opening..." : "Open"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDownloadDocument(doc)}>
                                  <Download className="h-4 w-4" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Shared Documents</h2>
                {sharedDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No individual documents have been shared with you yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sharedDocuments.map((doc) => (
                      <div key={doc.id} className="rounded-md border px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.description ?? "No description"}</p>
                          <p className="text-xs text-muted-foreground mt-1">Shared {formatDate(doc.sent_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleOpenDocument(doc)} disabled={openingDocumentId === doc.id}>
                            <ExternalLink className="h-4 w-4" />
                            {openingDocumentId === doc.id ? "Opening..." : "Open"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadDocument(doc)}>
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
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
