import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, X, Users, ClipboardList } from "lucide-react";

const MAX_COACHES = 4;

interface CoachTeam {
  id: string;
  name: string;
  description: string | null;
  season_year: number | null;
  gender: string | null;
  age_group: string | null;
  coach_id: string; // owner
  owner_name: string;
}

interface CoachAssignment {
  id: string;
  user_id: string;
  sort_order: number;
  display_name: string;
  email: string;
}

interface SystemUser {
  user_id: string;
  display_name: string;
  email: string;
}

const AdminTeams = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [assignments, setAssignments] = useState<Record<string, CoachAssignment[]>>({});
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<CoachTeam | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [teamsRes, profilesRes, permissionsRes] = await Promise.all([
      (supabase as any)
        .from("coach_teams")
        .select("id, name, description, season_year, gender, age_group, coach_id")
        .order("name"),
      (supabase as any).from("profiles").select("user_id, display_name"),
      (supabase as any)
        .from("user_permissions")
        .select("user_id, permission")
        .eq("permission", "manage_coaches"),
    ]);

    const profileMap: Record<string, string> = {};
    for (const p of (profilesRes.data ?? [])) {
      profileMap[p.user_id] = p.display_name ?? "Unknown";
    }

    // Fetch emails via auth via admin-user-management or just use profiles
    const enrichedTeams: CoachTeam[] = (teamsRes.data ?? []).map((t: any) => ({
      ...t,
      owner_name: profileMap[t.coach_id] ?? "Unknown",
    }));
    setTeams(enrichedTeams);

    // System users = those with manage_coaches permission
    const coachUserIds = (permissionsRes.data ?? []).map((r: any) => r.user_id as string);
    const coachProfiles = (profilesRes.data ?? []).filter((p: any) =>
      coachUserIds.includes(p.user_id)
    );
    setSystemUsers(
      coachProfiles.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name ?? "Unknown",
        email: "",
      }))
    );

    // Fetch all team_coaches assignments
    const teamIds = enrichedTeams.map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: assignData } = await (supabase as any)
        .from("team_coaches")
        .select("id, team_id, user_id, sort_order")
        .in("team_id", teamIds)
        .order("sort_order");

      const byTeam: Record<string, CoachAssignment[]> = {};
      for (const row of (assignData ?? [])) {
        const name = profileMap[row.user_id] ?? "Unknown";
        if (!byTeam[row.team_id]) byTeam[row.team_id] = [];
        byTeam[row.team_id].push({
          id:           row.id,
          user_id:      row.user_id,
          sort_order:   row.sort_order,
          display_name: name,
          email:        "",
        });
      }
      setAssignments(byTeam);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAssign = (team: CoachTeam) => {
    setSelectedTeam(team);
    setSelectedUserId("");
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedTeam || !selectedUserId) return;
    const current = assignments[selectedTeam.id] ?? [];
    if (current.length >= MAX_COACHES) {
      toast({ title: `Max ${MAX_COACHES} coaches per team`, variant: "destructive" });
      return;
    }
    if (current.some((a) => a.user_id === selectedUserId)) {
      toast({ title: "This coach is already assigned to the team", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("team_coaches").insert({
      team_id:    selectedTeam.id,
      user_id:    selectedUserId,
      sort_order: current.length,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to assign coach", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coach assigned" });
      setAssignOpen(false);
      fetchData();
    }
  };

  const handleRemove = async (assignmentId: string, teamId: string) => {
    const { error } = await (supabase as any)
      .from("team_coaches")
      .delete()
      .eq("id", assignmentId);
    if (error) {
      toast({ title: "Failed to remove coach", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coach removed" });
      setAssignments((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] ?? []).filter((a) => a.id !== assignmentId),
      }));
    }
  };

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.age_group ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.gender ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const badge = (text: string | null | undefined) =>
    text ? (
      <Badge variant="secondary" className="text-xs">
        {text}
      </Badge>
    ) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Teams &amp; Coach Assignments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assign up to {MAX_COACHES} coaches (system users) to each team.
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16 text-muted-foreground text-sm">
            Loading teams…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                {teams.length === 0
                  ? "No teams yet. Coaches create teams in the Coach Portal."
                  : "No teams match your search."}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((team) => {
              const coaches = assignments[team.id] ?? [];
              const canAdd = coaches.length < MAX_COACHES;
              return (
                <Card key={team.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{team.name}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {badge(team.age_group)}
                          {badge(team.gender)}
                          {team.season_year && badge(String(team.season_year))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssign(team)}
                        disabled={!canAdd}
                        className="shrink-0 gap-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Owner: {team.owner_name}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {coaches.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No coaches assigned yet.</p>
                    ) : (
                      coaches.map((coach, idx) => (
                        <div
                          key={coach.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {idx + 1}
                            </div>
                            <span className="text-sm truncate">{coach.display_name}</span>
                          </div>
                          <button
                            onClick={() => handleRemove(coach.id, team.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove coach"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                    {!canAdd && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        Maximum {MAX_COACHES} coaches reached.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Coach Dialog */}
      <Dialog open={assignOpen} onOpenChange={(v) => !saving && setAssignOpen(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Coach — {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {assignments[selectedTeam?.id ?? ""]?.length ?? 0} / {MAX_COACHES} coaches assigned.
            </p>
            {systemUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No coaches available. Grant users the <strong>Coach portal</strong> permission in System Users first.
              </p>
            ) : (
              <div className="space-y-1.5">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coach…" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemUsers
                      .filter(
                        (u) =>
                          !(assignments[selectedTeam?.id ?? ""] ?? []).some(
                            (a) => a.user_id === u.user_id
                          )
                      )
                      .map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.display_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={saving || !selectedUserId}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {saving ? "Assigning…" : "Assign Coach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeams;
