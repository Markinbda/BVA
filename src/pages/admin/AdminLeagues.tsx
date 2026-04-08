import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ArrowRight, Trophy, ChevronUp, ChevronDown,
  Users, UserPlus, X, GripVertical,
} from "lucide-react";
import { generateRoundRobin } from "@/lib/leagueUtils";

interface Season {
  id: string;
  name: string;
  status: string;
  num_weeks: number;
  num_rungs: number;
  teams_per_rung: number;
}

interface Team {
  id: string;
  season_id: string;
  team_name: string;
  current_rung: number;
  sort_order: number;
}

interface Player {
  id: string;
  team_id: string;
  player_name: string;
  jersey_number: string | null;
  position: string | null;
}

// Roster panel shown when a team tile is expanded
const RosterPanel = ({ team }: { team: Team }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playerName, setPlayerName] = useState("");
  const [jerseyNo, setJerseyNo] = useState("");
  const [position, setPosition] = useState("");

  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ["league_team_players", team.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("league_team_players")
        .select("*")
        .eq("team_id", team.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPlayer = useMutation({
    mutationFn: async () => {
      if (!playerName.trim()) return;
      const { error } = await (supabase as any).from("league_team_players").insert({
        team_id: team.id,
        player_name: playerName.trim(),
        jersey_number: jerseyNo.trim() || null,
        position: position.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_team_players", team.id] });
      setPlayerName("");
      setJerseyNo("");
      setPosition("");
      toast({ title: "Player added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removePlayer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("league_team_players").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_team_players", team.id] });
      toast({ title: "Player removed" });
    },
  });

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Users className="h-3 w-3" /> Roster ({players.length} players)
      </p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : players.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No players yet — add one below.</p>
      ) : (
        <div className="space-y-1">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1 text-sm">
              {p.jersey_number && (
                <span className="shrink-0 w-6 text-center text-xs font-bold text-muted-foreground">#{p.jersey_number}</span>
              )}
              <span className="flex-1 font-medium">{p.player_name}</span>
              {p.position && <Badge variant="outline" className="text-[10px] py-0">{p.position}</Badge>}
              <button
                onClick={() => removePlayer.mutate(p.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Remove player"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-end pt-1">
        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs">Player Name *</Label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Full name"
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && playerName.trim()) addPlayer.mutate(); }}
          />
        </div>
        <div className="w-16">
          <Label className="text-xs">#</Label>
          <Input value={jerseyNo} onChange={(e) => setJerseyNo(e.target.value)} placeholder="No." className="h-8 text-sm" />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Label className="text-xs">Position</Label>
          <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Setter" className="h-8 text-sm" />
        </div>
        <Button size="sm" className="h-8" onClick={() => addPlayer.mutate()} disabled={!playerName.trim() || addPlayer.isPending}>
          <UserPlus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
};

// Team tile component
interface TeamTileProps {
  team: Team;
  isFirst: boolean;
  isLast: boolean;
  isFirstRung: boolean;
  isLastRung: boolean;
  expanded: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
}

const TeamTile = ({ team, isFirst, isLast, isFirstRung, isLastRung, expanded, draggingId, dragOverId, onToggle, onMoveUp, onMoveDown, onDelete, onDragStart, onDragEnter, onDragEnd }: TeamTileProps) => {
  const isDragging = draggingId === team.id;
  const isDragOver = dragOverId === team.id && draggingId !== team.id;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(team.id); }}
      onDragEnter={() => onDragEnter(team.id)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={`rounded-lg border transition-all select-none ${
        isDragging ? "opacity-40 scale-[0.98] border-dashed border-primary" :
        isDragOver ? "border-primary ring-2 ring-primary/40 bg-primary/5" :
        expanded ? "border-primary/60 bg-primary/5 shadow-md" :
        "border-border bg-card hover:border-primary/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle */}
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
          title="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        {/* Up/Down arrow buttons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst && isFirstRung}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={isFirst && !isFirstRung ? "Promote to rung above" : "Move up"}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast && isLastRung}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={isLast && !isLastRung ? "Demote to rung below" : "Move down"}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        {/* Team name — click to expand */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <p className="font-semibold text-foreground truncate">{team.team_name}</p>
          <p className="text-[11px] text-muted-foreground">Click to {expanded ? "hide" : "view"} roster</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">Rung {team.current_rung}</Badge>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
          title="Delete team"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <RosterPanel team={team} />
        </div>
      )}
    </div>
  );
};

// Main page
const AdminLeagues = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [seasonName, setSeasonName] = useState("");
  const [numRungs, setNumRungs] = useState(2);
  const [numWeeks, setNumWeeks] = useState(12);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamRung, setTeamRung] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // refs so handleDragEnd always sees latest values without needing deps
  const draggingIdRef = useRef<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  const { data: seasons = [] } = useQuery<Season[]>({
    queryKey: ["league_seasons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("league_seasons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Season[];
    },
  });

  const { data: rawTeams = [] } = useQuery<Team[]>({
    queryKey: ["league_teams", selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];
      const { data, error } = await supabase
        .from("league_teams")
        .select("*")
        .eq("season_id", selectedSeason)
        .order("current_rung")
        .order("sort_order");
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!selectedSeason,
  });

  const activeSeason = seasons.find((s) => s.id === selectedSeason) ?? null;
  const maxRung = activeSeason?.num_rungs ?? 2;
  const rungNumbers = Array.from({ length: maxRung }, (_, i) => i + 1);

  const teamsByRung = useMemo(() => {
    const map: Record<number, Team[]> = {};
    rawTeams.forEach((t) => {
      if (!map[t.current_rung]) map[t.current_rung] = [];
      map[t.current_rung].push(t);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [rawTeams]);

  const handleDragEnd = useCallback(async () => {
    const fromId = draggingIdRef.current;
    const toId = dragOverIdRef.current;
    setDraggingId(null);
    setDragOverId(null);
    draggingIdRef.current = null;
    dragOverIdRef.current = null;
    if (!fromId || !toId || fromId === toId) return;

    const fromTeam = rawTeams.find((t) => t.id === fromId);
    const toTeam = rawTeams.find((t) => t.id === toId);
    if (!fromTeam || !toTeam) return;

    if (fromTeam.current_rung === toTeam.current_rung) {
      await Promise.all([
        supabase.from("league_teams").update({ sort_order: toTeam.sort_order }).eq("id", fromId),
        supabase.from("league_teams").update({ sort_order: fromTeam.sort_order }).eq("id", toId),
      ]);
    } else {
      await supabase.from("league_teams").update({
        current_rung: toTeam.current_rung,
        sort_order: toTeam.sort_order,
      }).eq("id", fromId);
    }
    queryClient.invalidateQueries({ queryKey: ["league_teams"] });
  }, [rawTeams, queryClient]);

  const createSeason = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("league_seasons").insert({ name: seasonName, num_rungs: numRungs, num_weeks: numWeeks });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_seasons"] });
      setSeasonName(""); setSeasonDialogOpen(false);
      toast({ title: "Season created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addTeam = useMutation({
    mutationFn: async () => {
      if (!selectedSeason) return;
      const rungTeams = teamsByRung[teamRung] ?? [];
      const nextSort = rungTeams.length > 0 ? Math.max(...rungTeams.map((t) => t.sort_order)) + 1 : 0;
      const { error } = await supabase.from("league_teams").insert({ season_id: selectedSeason, team_name: teamName, current_rung: teamRung, sort_order: nextSort });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_teams"] });
      setTeamName(""); setTeamDialogOpen(false);
      toast({ title: "Team added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("league_teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      if (expandedTeamId === id) setExpandedTeamId(null);
      queryClient.invalidateQueries({ queryKey: ["league_teams"] });
      toast({ title: "Team removed" });
    },
  });

  const moveTeam = async (team: Team, dir: "up" | "down") => {
    const rungTeams = [...(teamsByRung[team.current_rung] ?? [])];
    const idx = rungTeams.findIndex((t) => t.id === team.id);
    if (dir === "up") {
      if (idx === 0) {
        if (team.current_rung <= 1) return;
        const newRung = team.current_rung - 1;
        const aboveTeams = teamsByRung[newRung] ?? [];
        const maxSort = aboveTeams.length > 0 ? Math.max(...aboveTeams.map((t) => t.sort_order)) + 1 : 0;
        await supabase.from("league_teams").update({ current_rung: newRung, sort_order: maxSort }).eq("id", team.id);
      } else {
        const above = rungTeams[idx - 1];
        await Promise.all([
          supabase.from("league_teams").update({ sort_order: above.sort_order }).eq("id", team.id),
          supabase.from("league_teams").update({ sort_order: team.sort_order }).eq("id", above.id),
        ]);
      }
    } else {
      if (idx === rungTeams.length - 1) {
        if (team.current_rung >= maxRung) return;
        const newRung = team.current_rung + 1;
        const belowTeams = teamsByRung[newRung] ?? [];
        const minSort = belowTeams.length > 0 ? Math.min(...belowTeams.map((t) => t.sort_order)) - 1 : 0;
        await supabase.from("league_teams").update({ current_rung: newRung, sort_order: minSort }).eq("id", team.id);
      } else {
        const below = rungTeams[idx + 1];
        await Promise.all([
          supabase.from("league_teams").update({ sort_order: below.sort_order }).eq("id", team.id),
          supabase.from("league_teams").update({ sort_order: team.sort_order }).eq("id", below.id),
        ]);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["league_teams"] });
  };

  const generateWeek1 = useMutation({
    mutationFn: async () => {
      if (!selectedSeason) return;
      const allMatches: object[] = [];
      rungNumbers.forEach((rung) => {
        const rungTeamIds = (teamsByRung[rung] ?? []).map((t) => t.id);
        if (rungTeamIds.length >= 2) {
          generateRoundRobin(rungTeamIds).forEach(([a, b]) => {
            allMatches.push({ season_id: selectedSeason, week_number: 1, rung, team_a_id: a, team_b_id: b });
          });
        }
      });
      if (allMatches.length === 0) throw new Error("Not enough teams to generate matches");
      const { error } = await supabase.from("league_matches").insert(allMatches);
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Week 1 matches generated" }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase">League Manager</h1>
            <p className="text-muted-foreground">Manage seasons, teams, and weekly matches</p>
          </div>
          <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Season</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Season</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Season Name</Label>
                  <Input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="e.g. Summer 2026" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Rungs</Label>
                    <Input type="number" min={1} max={8} value={numRungs} onChange={(e) => setNumRungs(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Number of Weeks</Label>
                    <Input type="number" min={1} max={52} value={numWeeks} onChange={(e) => setNumWeeks(Number(e.target.value))} />
                  </div>
                </div>
                <Button onClick={() => createSeason.mutate()} disabled={!seasonName.trim() || createSeason.isPending}>Create Season</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {seasons.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-all ${selectedSeason === s.id ? "ring-2 ring-primary" : "hover:shadow-md"}`}
              onClick={() => setSelectedSeason(s.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <Trophy className="h-5 w-5 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="font-heading text-lg font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {s.status} · {s.num_rungs} rung{s.num_rungs !== 1 ? "s" : ""} · {s.num_weeks} weeks
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {seasons.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-3">No seasons yet. Create one to get started.</p>
          )}
        </div>

        {activeSeason && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-heading text-xl uppercase">{activeSeason.name} — Teams</CardTitle>
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Team</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Team to {activeSeason.name}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Team Name</Label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Team name"
                        onKeyDown={(e) => { if (e.key === "Enter" && teamName.trim()) addTeam.mutate(); }}
                      />
                    </div>
                    <div>
                      <Label>Starting Rung</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={teamRung}
                        onChange={(e) => setTeamRung(Number(e.target.value))}
                      >
                        {rungNumbers.map((r) => (
                          <option key={r} value={r}>Rung {r}{r === 1 ? " (Top)" : r === maxRung ? " (Bottom)" : ""}</option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={() => addTeam.mutate()} disabled={!teamName.trim() || addTeam.isPending}>Add Team</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="space-y-6">
              {rungNumbers.map((rung) => {
                const rungTeams = teamsByRung[rung] ?? [];
                return (
                  <div key={rung}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">
                        Rung {rung}{rung === 1 ? " — Top" : rung === maxRung ? " — Bottom" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">({rungTeams.length} team{rungTeams.length !== 1 ? "s" : ""})</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      {rungTeams.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-2">No teams in this rung</p>
                      ) : (
                        rungTeams.map((team, idx) => (
                          <TeamTile
                            key={team.id}
                            team={team}
                            isFirst={idx === 0}
                            isLast={idx === rungTeams.length - 1}
                            isFirstRung={rung === 1}
                            isLastRung={rung === maxRung}
                            expanded={expandedTeamId === team.id}
                            draggingId={draggingId}
                            dragOverId={dragOverId}
                            onToggle={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                            onMoveUp={() => moveTeam(team, "up")}
                            onMoveDown={() => moveTeam(team, "down")}
                            onDragStart={(id) => { setDraggingId(id); draggingIdRef.current = id; }}
                            onDragEnter={(id) => { setDragOverId(id); dragOverIdRef.current = id; }}
                            onDragEnd={handleDragEnd}
                            onDelete={() => {
                              if (confirm(`Delete "${team.team_name}"? This also removes their match history.`)) {
                                deleteTeam.mutate(team.id);
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button onClick={() => generateWeek1.mutate()} disabled={rawTeams.length < 2 || generateWeek1.isPending} variant="outline">
                  Generate Week 1 Matches
                </Button>
                {Array.from({ length: activeSeason.num_weeks }, (_, i) => i + 1).map((week) => (
                  <Button key={week} variant="ghost" size="sm" asChild>
                    <Link to={`/admin/leagues/${activeSeason.id}/week/${week}`}>Week {week} <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLeagues;