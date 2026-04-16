import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, Globe, GlobeLock, Loader2, Play } from "lucide-react";

interface Team  { id: string; name: string; }
interface Player { id: string; first_name: string; last_name: string; email: string | null; }

interface CoachVideo {
  id: string;
  title: string;
  video_uid: string;
  visibility: string;
  team_ids: string[];
}

interface Props {
  video: CoachVideo | null;
  teams: Team[];
  onClose: () => void;
  onVisibilityChange?: (videoId: string, visibility: string) => void;
  /** When provided, shows a video picker step before the notify step */
  allVideos?: CoachVideo[];
  /** Whether the dialog is open (required when using allVideos picker) */
  open?: boolean;
}

export default function NotifyVideoModal({ video: videoProp, teams, onClose, onVisibilityChange, allVideos, open }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();

  // When allVideos is provided, we manage the selected video internally
  const [pickedVideo, setPickedVideo] = useState<CoachVideo | null>(null);
  const video = allVideos ? pickedVideo : videoProp;
  const isOpen = allVideos ? (open ?? false) : !!videoProp;

  const handleClose = () => {
    setPickedVideo(null);
    onClose();
  };

  const [selectedTeamId, setSelectedTeamId] = useState<string>("__all__");
  const [players, setPlayers]               = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [sending, setSending]               = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Load players when team selection changes
  useEffect(() => {
    if (!video) return;
    setSelectedPlayerIds(new Set());
    if (selectedTeamId === "__all__") {
      // Load players from all teams this video is shared with
      const tIds = video.team_ids?.length ? video.team_ids : teams.map(t => t.id);
      const tNames = tIds.map(id => teams.find(t => t.id === id)?.name).filter(Boolean) as string[];
      loadPlayers(tIds, tNames);
    } else {
      const tName = teams.find(t => t.id === selectedTeamId)?.name;
      loadPlayers([selectedTeamId], tName ? [tName] : []);
    }
  }, [selectedTeamId, video, user]);

  // Players can be linked by team_id UUID (new) or by team text field (legacy).
  // Query both direct tables (own players only via RLS) AND the RPC (assigned-team players).
  const loadPlayers = async (teamIds: string[], teamNames: string[] = []) => {
    if (!teamIds.length && !teamNames.length) { setPlayers([]); return; }
    setLoadingPlayers(true);
    const [byId, byName, rpcRes] = await Promise.all([
      teamIds.length
        ? (supabase as any).from("coach_players").select("id, first_name, last_name, email").in("team_id", teamIds)
        : Promise.resolve({ data: [] }),
      teamNames.length
        ? (supabase as any).from("coach_players").select("id, first_name, last_name, email").in("team", teamNames)
        : Promise.resolve({ data: [] }),
      user
        ? (supabase as any).rpc("get_players_for_assigned_teams", { p_user_id: user.id })
        : Promise.resolve({ data: [] }),
    ]);
    // Filter RPC results to only match selected teams
    const rpcPlayers: Player[] = (rpcRes.data ?? []).filter((p: any) =>
      teamIds.includes(p.team_id) || teamNames.includes(p.team)
    );
    // Deduplicate by id, then sort
    const map = new Map<string, Player>();
    [...(byId.data ?? []), ...(byName.data ?? []), ...rpcPlayers].forEach((p: Player) => map.set(p.id, p));
    setPlayers([...map.values()].sort((a, b) => a.last_name.localeCompare(b.last_name)));
    setLoadingPlayers(false);
  };

  const togglePlayer = (id: string) =>
    setSelectedPlayerIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll = () => setSelectedPlayerIds(new Set(players.map(p => p.id)));
  const clearAll  = () => setSelectedPlayerIds(new Set());

  const handleSend = async () => {
    if (!video) return;
    const player_ids  = [...selectedPlayerIds];
    const team_ids    = selectedTeamId === "__all__" ? [] : [selectedTeamId];

    if (!player_ids.length && !team_ids.length) {
      toast({ title: "Select at least one player or team", variant: "destructive" }); return;
    }

    setSending(true);
    const { data, error } = await supabase.functions.invoke("notify-video", {
      body: { video_id: video.id, team_ids, player_ids },
    });

    if (error || data?.error) {
      toast({ title: "Failed to send", description: data?.error ?? error?.message, variant: "destructive" });
    } else {
      toast({ title: `Notifications sent to ${data.sent} player${data.sent !== 1 ? "s" : ""}!` });
      onClose();
    }
    setSending(false);
  };

  const handleTogglePublic = async () => {
    if (!video || !onVisibilityChange) return;
    const next = video.visibility === "public" ? "all_coaches" : "public";
    setTogglingVisibility(true);
    const { error } = await (supabase as any)
      .from("coach_videos")
      .update({ visibility: next })
      .eq("id", video.id);
    if (error) {
      toast({ title: "Failed to update visibility", description: error.message, variant: "destructive" });
    } else {
      onVisibilityChange(video.id, next);
      toast({ title: next === "public" ? "Video added to public gallery" : "Video removed from public gallery" });
    }
    setTogglingVisibility(false);
  };

  if (!isOpen) return null;

  // ── Video picker step (when allVideos prop provided and no video picked yet) ──
  if (allVideos && !video) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Share a Video</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Pick a video to share with your players.</p>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {allVideos.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-8">No videos in your library yet.</p>
            )}
            {allVideos.map(v => (
              <button key={v.id} onClick={() => setPickedVideo(v)}
                className="w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-muted/60 transition-colors">
                <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  {v.visibility === 'public' && <span className="text-xs text-green-600">Public Gallery</span>}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!video) return null;

  const isPublic = video.visibility === "public";
  const playersWithEmail = players.filter(p => p.email);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold truncate">{video.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Public Gallery Toggle ── */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Public Gallery</p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? "Visible in the public video gallery." : "Not publicly visible."}
              </p>
            </div>
            <Button
              variant={isPublic ? "default" : "outline"}
              size="sm"
              onClick={handleTogglePublic}
              disabled={togglingVisibility || !onVisibilityChange}
              className="gap-2"
            >
              {togglingVisibility ? <Loader2 className="h-4 w-4 animate-spin" /> : isPublic ? <Globe className="h-4 w-4" /> : <GlobeLock className="h-4 w-4" />}
              {isPublic ? "Featured" : "Add to Gallery"}
            </Button>
          </div>

          {/* ── Notify Players ── */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Notify Players by Email</p>

            {/* Team filter */}
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a team..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All teams</SelectItem>
                {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Player list */}
            {loadingPlayers ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : playersWithEmail.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No players with email addresses found.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 text-xs">
                  <button onClick={selectAll} className="text-primary hover:underline">Select all</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={clearAll}  className="text-primary hover:underline">Clear</button>
                  <span className="ml-auto text-muted-foreground">{selectedPlayerIds.size} selected</span>
                </div>
                <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                  {playersWithEmail.map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                      <Checkbox
                        checked={selectedPlayerIds.has(p.id)}
                        onCheckedChange={() => togglePlayer(p.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {players.length > playersWithEmail.length && (
                  <p className="text-xs text-muted-foreground">
                    {players.length - playersWithEmail.length} player{players.length - playersWithEmail.length !== 1 ? "s" : ""} skipped (no email on file).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {allVideos && (
            <Button variant="ghost" onClick={() => setPickedVideo(null)} disabled={sending} className="mr-auto">
              ← Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || selectedPlayerIds.size === 0}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Send Notification{selectedPlayerIds.size > 0 ? ` (${selectedPlayerIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper to call notify-video edge function directly (use after upload)
 */
export async function notifyVideo(videoId: string, teamIds: string[], playerIds: string[]) {
  return supabase.functions.invoke("notify-video", {
    body: { video_id: videoId, team_ids: teamIds, player_ids: playerIds },
  });
}
