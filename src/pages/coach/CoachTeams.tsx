import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Mail, Copy, Filter } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  season_year: number | null;
  gender: string | null;
  age_group: string | null;
}

const GENDER_OPTIONS = ["Mixed", "Male", "Female"];
const AGE_GROUP_OPTIONS = ["U10", "U12", "U14", "U16", "U18", "U20", "Senior", "Masters", "Open"];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  team: string;
  email: string | null;
}

const CoachTeams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formYear, setFormYear] = useState<string>("");
  const [formGender, setFormGender] = useState<string>("");
  const [formAgeGroup, setFormAgeGroup] = useState<string>("");
  const [saving, setSaving] = useState(false);
  // Filters
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>("all");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    // Fetch teams owned by this coach, plus teams they're assigned to via team_coaches
    const [ownedRes, assignedRes, playersRes] = await Promise.all([
      (supabase as any).from("coach_teams").select("*").eq("coach_id", user.id).order("name"),
      (supabase as any).from("team_coaches").select("team_id").eq("user_id", user.id),
      (supabase as any).from("coach_players").select("id, first_name, last_name, team, email").eq("coach_id", user.id),
    ]);
    const ownedTeams = ownedRes.data ?? [];
    const assignedTeamIds: string[] = (assignedRes.data ?? []).map((r: any) => r.team_id);
    // Fetch assigned teams detail (exclude already-owned)
    const ownedIds = ownedTeams.map((t: Team) => t.id);
    const missingIds = assignedTeamIds.filter((id) => !ownedIds.includes(id));
    let assignedTeams: Team[] = [];
    if (missingIds.length > 0) {
      const { data } = await (supabase as any)
        .from("coach_teams")
        .select("*")
        .in("id", missingIds)
        .order("name");
      assignedTeams = data ?? [];
    }
    setTeams([...ownedTeams, ...assignedTeams]);
    setPlayers(playersRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Auto-derive teams from player.team field (free-text groups)
  const playerGroups = players.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.team.trim() || "Unassigned";
    (acc[key] = acc[key] ?? []).push(p);
    return acc;
  }, {});

  const openAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormDesc("");
    setFormYear("none");
    setFormGender("none");
    setFormAgeGroup("none");
    setDialogOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingId(team.id);
    setFormName(team.name);
    setFormDesc(team.description ?? "");
    setFormYear(team.season_year ? String(team.season_year) : "none");
    setFormGender(team.gender ?? "none");
    setFormAgeGroup(team.age_group ?? "none");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast({ title: "Team name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      coach_id: user.id,
      name: formName.trim(),
      description: formDesc.trim() || null,
      season_year: formYear && formYear !== "none" ? Number(formYear) : null,
      gender: formGender && formGender !== "none" ? formGender : null,
      age_group: formAgeGroup && formAgeGroup !== "none" ? formAgeGroup : null,
    };
    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("coach_teams").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("coach_teams").insert(payload));
    }
    if (error) {
      toast({ title: "Failed to save team", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Team updated" : "Team created" });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"?`)) return;
    const { error } = await (supabase as any).from("coach_teams").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team deleted" });
      setTeams((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const copyEmails = (emails: string[]) => {
    const list = emails.filter(Boolean).join(", ");
    navigator.clipboard.writeText(list);
    toast({ title: "Emails copied to clipboard" });
  };

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teams & Mailing Lists</h1>
            <p className="text-muted-foreground text-sm">
              Mailing lists are auto-generated from player team assignments
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> New Team
          </Button>
        </div>

        {/* Filters */}
        {teams.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[130px] h-8 text-sm">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger className="w-[130px] h-8 text-sm">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="All age groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All age groups</SelectItem>
                    {AGE_GROUP_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(filterYear !== "all" || filterGender !== "all" || filterAgeGroup !== "all") && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFilterYear("all"); setFilterGender("all"); setFilterAgeGroup("all"); }}>Clear filters</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Named teams (from coach_teams table) */}
        {teams.length > 0 && (() => {
          const filtered = teams.filter((t) =>
            (filterYear === "all" || String(t.season_year) === filterYear) &&
            (filterGender === "all" || t.gender === filterGender) &&
            (filterAgeGroup === "all" || t.age_group === filterAgeGroup)
          );
          return (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Registered Teams ({filtered.length})</h2>
            {filtered.length === 0 && (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No teams match the selected filters.</CardContent></Card>
            )}
            {filtered.map((team) => (
              <Card key={team.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {team.season_year && <Badge variant="outline" className="text-xs">{team.season_year}</Badge>}
                      {team.gender && <Badge variant="outline" className="text-xs">{team.gender}</Badge>}
                      {team.age_group && <Badge variant="outline" className="text-xs">{team.age_group}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(team)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(team.id, team.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {team.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          );
        })()}

        {/* Auto-generated mailing lists from player groups */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Mailing Lists (auto-generated from players)
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : Object.keys(playerGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No players yet. Add players with team names to generate mailing lists.
              </CardContent>
            </Card>
          ) : (
            Object.entries(playerGroups).map(([groupName, groupPlayers]) => {
              const emails = groupPlayers.map((p) => p.email).filter(Boolean) as string[];
              return (
                <Card key={groupName}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
                    <div>
                      <CardTitle className="text-base">{groupName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {groupPlayers.length} player{groupPlayers.length !== 1 ? "s" : ""} · {emails.length} email{emails.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={emails.length === 0}
                        onClick={() => copyEmails(emails)}
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy Emails
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {groupPlayers.map((p) => (
                        <Badge key={p.id} variant="secondary" className="gap-1">
                          {p.first_name} {p.last_name}
                          {p.email && <Mail className="h-3 w-3 text-muted-foreground" />}
                        </Badge>
                      ))}
                    </div>
                    {emails.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-3 break-all">
                        {emails.join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Team" : "New Team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Team Name *</Label>
              <Input placeholder="e.g. U14 Girls Varsity" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Year</Label>
                <Select value={formYear} onValueChange={setFormYear}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Gender</Label>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Age Group</Label>
                <Select value={formAgeGroup} onValueChange={setFormAgeGroup}>
                  <SelectTrigger><SelectValue placeholder="Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {AGE_GROUP_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Optional notes about this team" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
};

export default CoachTeams;
