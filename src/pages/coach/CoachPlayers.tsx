import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const CoachPlayers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

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
    setDialogOpen(true);
  };

  const openEdit = (player: Player) => {
    setEditingId(player.id);
    setForm({ ...player });
    setDialogOpen(true);
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

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
          <div className="grid gap-3">
            {filtered.map((player) => (
              <Card key={player.id}>
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 flex-1 text-sm">
                    <div>
                      <p className="font-medium text-foreground">
                        {player.first_name} {player.last_name}
                      </p>
                      <p className="text-muted-foreground">{player.team || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p>{player.volleyball_position || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Age / DOB</p>
                      <p>{player.age ?? "—"}{player.date_of_birth ? ` · ${player.date_of_birth}` : ""}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="truncate">{player.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(player)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(player.id, `${player.first_name} ${player.last_name}`)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
