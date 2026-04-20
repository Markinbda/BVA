import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, AlertCircle } from "lucide-react";

const POSITIONS = ["Setter", "Libero", "Outside Hitter", "Opposite Hitter", "Middle Blocker", "Defensive Specialist"];

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  age: number | null;
  team: string;
  team_id: string | null;
  height: string | null;
  weight: string | null;
  volleyball_position: string | null;
  email: string | null;
  notes: string | null;
}

const emptyForm = (): Omit<Player, "id"> => ({
  first_name: "",
  last_name: "",
  date_of_birth: null,
  age: null,
  team: "",
  team_id: null,
  height: "",
  weight: "",
  volleyball_position: null,
  email: "",
  notes: "",
});

interface Team {
  id: string;
  name: string;
}

interface PlayerPastHistory {
  id: string;
  player_id: string;
  coach_id: string;
  team_name: string;
  team_members: string[];
  event_name: string;
  event_format: "Indoor" | "Beach" | null;
  event_date: string | null;
  event_location: string | null;
  event_image_urls: string[];
  placement: number | null;
  result_notes: string | null;
}

interface HistoryForm {
  team_name: string;
  team_members_text: string;
  event_name: string;
  event_format: "Indoor" | "Beach" | "";
  event_date: string;
  event_location: string;
  event_image_urls: string[];
  placement: string;
  result_notes: string;
}

const emptyHistoryForm: HistoryForm = {
  team_name: "",
  team_members_text: "",
  event_name: "",
  event_format: "",
  event_date: "",
  event_location: "",
  event_image_urls: ["", "", "", ""],
  placement: "",
  result_notes: "",
};

const CoachPlayers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [historyRows, setHistoryRows] = useState<PlayerPastHistory[]>([]);
  const [historySaving, setHistorySaving] = useState(false);
  const [historyEditingId, setHistoryEditingId] = useState<string | null>(null);
  const [historyForm, setHistoryForm] = useState(emptyHistoryForm);

  const formatPlacement = (placement: number | null) => {
    if (!placement) return "";
    if (placement === 1) return "1st";
    if (placement === 2) return "2nd";
    if (placement === 3) return "3rd";
    return `${placement}th`;
  };

  const medalForPlacement = (placement: number | null) => {
    if (placement === 1) return "🥇";
    if (placement === 2) return "🥈";
    if (placement === 3) return "🥉";
    return null;
  };

  const loadHistory = async (playerId: string) => {
    const { data, error } = await (supabase as any)
      .from("player_past_history")
      .select("id, player_id, coach_id, team_name, team_members, event_name, event_format, event_date, event_location, event_image_urls, event_image_url, placement, result_notes")
      .eq("player_id", playerId)
      .order("event_date", { ascending: false });
    if (error) {
      toast({ title: "Failed to load player history", description: error.message, variant: "destructive" });
      return;
    }
    setHistoryRows((data ?? []).map((row: any) => ({
      ...row,
      team_members: Array.isArray(row.team_members) ? row.team_members : [],
      event_image_urls: Array.isArray(row.event_image_urls)
        ? row.event_image_urls.slice(0, 4).filter((url: string) => typeof url === "string" && url.trim().length > 0)
        : (row.event_image_url ? [row.event_image_url] : []),
    })));
  };

  const resetHistoryForm = () => {
    setHistoryEditingId(null);
    setHistoryForm(emptyHistoryForm);
  };

  const openEditHistory = (row: PlayerPastHistory) => {
    const imageSlots = [...row.event_image_urls.slice(0, 4)];
    while (imageSlots.length < 4) imageSlots.push("");

    setHistoryEditingId(row.id);
    setHistoryForm({
      team_name: row.team_name,
      team_members_text: row.team_members.join(", "),
      event_name: row.event_name,
      event_format: row.event_format ?? "",
      event_date: row.event_date ?? "",
      event_location: row.event_location ?? "",
      event_image_urls: imageSlots,
      placement: row.placement ? String(row.placement) : "",
      result_notes: row.result_notes ?? "",
    });
  };

  const saveHistory = async () => {
    if (!user || !editingId) return;
    if (!historyForm.team_name.trim() || !historyForm.event_name.trim()) {
      toast({ title: "Team name and event name are required", variant: "destructive" });
      return;
    }

    const teamMembers = historyForm.team_members_text
      .split(",")
      .map((member) => member.trim())
      .filter(Boolean);
    const eventImageUrls = historyForm.event_image_urls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, 4);

    const payload = {
      player_id: editingId,
      coach_id: user.id,
      team_name: historyForm.team_name.trim(),
      team_members: teamMembers,
      event_name: historyForm.event_name.trim(),
      event_format: historyForm.event_format || null,
      event_date: historyForm.event_date || null,
      event_location: historyForm.event_location.trim() || null,
      event_image_urls: eventImageUrls,
      event_image_url: eventImageUrls[0] ?? null,
      placement: historyForm.placement ? Number(historyForm.placement) : null,
      result_notes: historyForm.result_notes.trim() || null,
    };

    setHistorySaving(true);
    let error;
    if (historyEditingId) {
      ({ error } = await (supabase as any).from("player_past_history").update(payload).eq("id", historyEditingId));
    } else {
      ({ error } = await (supabase as any).from("player_past_history").insert(payload));
    }
    setHistorySaving(false);

    if (error) {
      toast({ title: "Failed to save player history", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: historyEditingId ? "History updated" : "History added" });
    resetHistoryForm();
    loadHistory(editingId);
  };

  const deleteHistory = async (row: PlayerPastHistory) => {
    if (!confirm(`Delete past event \"${row.event_name}\"?`)) return;
    const { error } = await (supabase as any).from("player_past_history").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Failed to delete history", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "History deleted" });
    if (editingId) loadHistory(editingId);
  };

  const fetchPlayers = async () => {
    if (!user || !isMountedRef.current) return;
    setLoading(true);
    const [playersRes, teamsRes, assignedPlayersRes, assignedTeamsRes] = await Promise.all([
      (supabase as any).from("coach_players").select("*").eq("coach_id", user.id).order("last_name"),
      (supabase as any).from("coach_teams").select("id, name").eq("coach_id", user.id).order("name"),
      (supabase as any).rpc("get_players_for_assigned_teams", { p_user_id: user.id }),
      (supabase as any).rpc("get_assigned_teams_for_user", { p_user_id: user.id }),
    ]);
    if (!isMountedRef.current) return;
    if (playersRes.error) toast({ title: "Failed to load players", description: playersRes.error.message, variant: "destructive" });
    // Merge own players + assigned-team players (deduplicate by id)
    const ownPlayers: Player[] = playersRes.data ?? [];
    const extraPlayers: Player[] = assignedPlayersRes.data ?? [];
    const seen = new Set(ownPlayers.map((p: Player) => p.id));
    if (isMountedRef.current) setPlayers([...ownPlayers, ...extraPlayers.filter((p: Player) => !seen.has(p.id))]);
    // Merge own teams + assigned teams (deduplicate by id)
    const ownTeams: Team[] = teamsRes.data ?? [];
    const extraTeams: Team[] = (assignedTeamsRes.data ?? []).map((t: any) => ({ id: t.id, name: t.name }));
    const seenTeams = new Set(ownTeams.map((t: Team) => t.id));
    if (isMountedRef.current) setTeams([...ownTeams, ...extraTeams.filter((t: Team) => !seenTeams.has(t.id))]);
    if (isMountedRef.current) setLoading(false);
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchPlayers();
    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setHistoryRows([]);
    resetHistoryForm();
    setDialogOpen(true);
  };

  const openEdit = (player: Player) => {
    setEditingId(player.id);
    setForm({ ...player });
    resetHistoryForm();
    loadHistory(player.id);
    setDialogOpen(true);
  };

  const openDetails = (player: Player) => {
    setSelectedPlayer(player);
    setDetailsOpen(true);
  };

  const openEditFromDetails = () => {
    if (!selectedPlayer) return;
    setDetailsOpen(false);
    openEdit(selectedPlayer);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      coach_id: user.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth || null,
      age: form.age || null,
      team: form.team.trim(),
      team_id: form.team_id ?? null,
      height: form.height?.trim() || null,
      weight: form.weight?.trim() || null,
      volleyball_position: form.volleyball_position || null,
      email: form.email?.trim() || null,
      notes: form.notes?.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("coach_players").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("coach_players").insert(payload));
    }

    if (error) {
      toast({ title: "Failed to save player", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Player updated" : "Player added" });
      setDialogOpen(false);
      setHistoryRows([]);
      resetHistoryForm();
      fetchPlayers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your roster?`)) return;
    const { error } = await (supabase as any).from("coach_players").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete player", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Player removed" });
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const matchesTeam =
      teamFilter === "all"
        ? true
        : teamFilter === "unassigned"
          ? !p.team_id
          : p.team_id === teamFilter;

    if (!matchesTeam) return false;

    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q) ||
      (p.volleyball_position ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Players</h1>
            <p className="text-muted-foreground text-sm">{players.length} player{players.length !== 1 ? "s" : ""} on your roster</p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Player
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {teams.length > 1 && (
            <div className="w-full max-w-xs">
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? "No players match your search." : "No players yet. Click Add Player to get started."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((player) => (
              <Card
                key={player.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetails(player)}
              >
                <CardContent className="py-3 space-y-1.5 text-sm">
                  <p className="font-semibold text-foreground truncate">
                    {player.first_name} {player.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{player.team || "Unassigned"}</p>
                  <p className="text-xs text-muted-foreground">{player.volleyball_position || "No position set"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {player.age ?? "—"}{player.date_of_birth ? ` · ${player.date_of_birth}` : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Player Details</DialogTitle>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {selectedPlayer.first_name} {selectedPlayer.last_name}
                </p>
                <p className="text-muted-foreground">{selectedPlayer.team || "Unassigned"}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p>{selectedPlayer.volleyball_position || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Age / DOB</p>
                  <p>{selectedPlayer.age ?? "—"}{selectedPlayer.date_of_birth ? ` · ${selectedPlayer.date_of_birth}` : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="break-all">{selectedPlayer.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Height / Weight</p>
                  <p>{selectedPlayer.height || "—"}{selectedPlayer.weight ? ` · ${selectedPlayer.weight}` : ""}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p>{selectedPlayer.notes || "No notes"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (!selectedPlayer) return;
                handleDelete(selectedPlayer.id, `${selectedPlayer.first_name} ${selectedPlayer.last_name}`);
                setDetailsOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            <Button onClick={openEditFromDetails}>
              <Pencil className="h-4 w-4" />
              Edit Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Team</Label>
              {teams.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No teams yet. <a href="/coach/teams" className="underline font-medium">Create a team first</a>, then come back to assign players.</span>
                </div>
              ) : (
                <Select value={form.team_id || "none"} onValueChange={(v) => {
                    if (v === "none") {
                      setForm((f) => ({ ...f, team: "", team_id: null }));
                    } else {
                      const t = teams.find((t) => t.id === v);
                      setForm((f) => ({ ...f, team: t?.name ?? "", team_id: v }));
                    }
                  }}>
                  <SelectTrigger><SelectValue placeholder="Select a team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No team —</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label>Position</Label>
              <Select value={form.volleyball_position ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, volleyball_position: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value || null }))} />
            </div>
            <div className="space-y-1">
              <Label>Age</Label>
              <Input type="number" value={form.age ?? ""} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div className="space-y-1">
              <Label>Height</Label>
              <Input placeholder="e.g. 5'10&quot;" value={form.height ?? ""} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Weight</Label>
              <Input placeholder="e.g. 165 lbs" value={form.weight ?? ""} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Email (player or parent)</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            {editingId ? (
              <div className="space-y-3 sm:col-span-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium text-foreground">Past Teams, Events, and Placement Results</p>
                    <p className="text-xs text-muted-foreground">Add career history for this player profile.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={resetHistoryForm}>
                    Add New Entry
                  </Button>
                </div>

                {historyRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No past entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {historyRows.map((row) => {
                      const medal = medalForPlacement(row.placement);
                      return (
                        <div key={row.id} className="rounded-md border bg-muted/20 p-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">
                                {medal ? `${medal} ` : ""}
                                {row.event_name}
                                {row.placement ? ` (${formatPlacement(row.placement)})` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Team: {row.team_name}
                                {row.event_format ? ` · ${row.event_format}` : ""}
                                {row.event_date ? ` · ${row.event_date}` : ""}
                                {row.event_location ? ` · ${row.event_location}` : ""}
                              </p>
                              {row.event_image_urls.length > 0 ? (
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  {row.event_image_urls.map((imageUrl, index) => (
                                    <img
                                      key={`${row.id}-image-${index}`}
                                      src={imageUrl}
                                      alt={`${row.event_name} ${index + 1}`}
                                      className="h-20 w-full rounded-md border object-cover"
                                    />
                                  ))}
                                </div>
                              ) : null}
                              {row.team_members.length > 0 ? (
                                <p className="text-xs text-muted-foreground">Team Members: {row.team_members.join(", ")}</p>
                              ) : null}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button type="button" size="icon" variant="ghost" onClick={() => openEditHistory(row)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteHistory(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <Label>Past Team Name *</Label>
                    <Input
                      value={historyForm.team_name}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, team_name: e.target.value }))}
                      placeholder="e.g. U16 National Squad"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Event Name *</Label>
                    <Input
                      value={historyForm.event_name}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, event_name: e.target.value }))}
                      placeholder="e.g. Caribbean Invitational"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Event Date</Label>
                    <Input
                      type="date"
                      value={historyForm.event_date}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, event_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Event Type</Label>
                    <Select
                      value={historyForm.event_format || "none"}
                      onValueChange={(v) => setHistoryForm((h) => ({
                        ...h,
                        event_format: v === "none" ? "" : (v as "Indoor" | "Beach"),
                      }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        <SelectItem value="Indoor">Indoor</SelectItem>
                        <SelectItem value="Beach">Beach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Event Location</Label>
                    <Input
                      value={historyForm.event_location}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, event_location: e.target.value }))}
                      placeholder="City, Venue"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Placement</Label>
                    <Input
                      type="number"
                      min={1}
                      value={historyForm.placement}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, placement: e.target.value }))}
                      placeholder="1, 2, 3..."
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Team Members (comma-separated)</Label>
                    <Input
                      value={historyForm.team_members_text}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, team_members_text: e.target.value }))}
                      placeholder="Jane Doe, Mary Smith"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Result Notes</Label>
                    <Textarea
                      rows={2}
                      value={historyForm.result_notes}
                      onChange={(e) => setHistoryForm((h) => ({ ...h, result_notes: e.target.value }))}
                      placeholder="e.g. Won bronze in a 12-team bracket"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Event Images (up to 4)</Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {historyForm.event_image_urls.map((imageUrl, index) => (
                        <div key={`history-image-slot-${index}`} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Image {index + 1}</Label>
                          <ImageUpload
                            value={imageUrl}
                            onChange={(url) => setHistoryForm((h) => {
                              const next = [...h.event_image_urls];
                              next[index] = url;
                              return { ...h, event_image_urls: next };
                            })}
                            folder="player-history"
                            aspectClass="h-40"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetHistoryForm}>Reset</Button>
                    <Button type="button" onClick={saveHistory} disabled={historySaving}>
                      {historySaving ? "Saving..." : historyEditingId ? "Update Entry" : "Add Entry"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Save the player first to add past teams, team members, and event results.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogOpen(false);
              setHistoryRows([]);
              resetHistoryForm();
            }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
};

export default CoachPlayers;
