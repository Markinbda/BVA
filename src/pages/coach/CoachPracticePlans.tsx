import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Eye, Trash2, Calendar, Search } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  name: string;
  practice_date: string | null;
  team_id: string | null;
  number_of_players: number | null;
  practice_focus: string | null;
  is_shared: boolean;
  created_at: string;
}

const CoachPracticePlans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [teamId, setTeamId] = useState("none");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [plansRes, teamsRes] = await Promise.all([
      (supabase as any).from("coach_practice_plans").select("*").order("practice_date", { ascending: false, nullsFirst: false }),
      (supabase as any).from("coach_teams").select("id, name").eq("coach_id", user.id).order("name"),
    ]);

    if (plansRes.error || teamsRes.error) {
      toast({
        title: "Failed to load practice plans",
        description: plansRes.error?.message || teamsRes.error?.message || "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setPlans(plansRes.data ?? []);
    setTeams(teamsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.practice_focus ?? "").toLowerCase().includes(term) ||
        (teamById[p.team_id ?? ""] ?? "").toLowerCase().includes(term)
      );
    });
  }, [plans, search, teamById]);

  const openCreate = () => {
    setName("");
    setDate("");
    setTeamId("none");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Plan name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      coach_id: user.id,
      name: name.trim(),
      practice_date: date || null,
      team_id: teamId !== "none" ? teamId : null,
      status: 1,
    };

    const { data, error } = await (supabase as any)
      .from("coach_practice_plans")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      toast({ title: "Failed to create plan", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Practice plan created" });
    setDialogOpen(false);
    setSaving(false);
    navigate(`/coach/practice-plans/${data.id}`);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete practice plan \"${plan.name}\"?`)) return;
    const { error } = await (supabase as any).from("coach_practice_plans").delete().eq("id", plan.id);
    if (error) {
      toast({ title: "Failed to delete plan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Practice plan deleted" });
    await loadData();
  };

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Practice Plans</h1>
            <p className="text-sm text-muted-foreground">Build and organize full training sessions from your drill library.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Practice Plan
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plans..." />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Loading plans...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No practice plans found.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.is_shared && <span className="text-xs rounded-full px-2 py-1 bg-muted">Shared</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {plan.practice_date ?? "No date set"}
                    </div>
                    <div>Team: {plan.team_id ? teamById[plan.team_id] ?? "Unknown team" : "None"}</div>
                    <div>Players: {plan.number_of_players ?? "-"}</div>
                    {plan.practice_focus && <div>Focus: {plan.practice_focus}</div>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/coach/practice-plans/${plan.id}`}>
                      <Button size="sm" className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    </Link>
                    <Link to={`/coach/practice-plans/${plan.id}/view`}>
                      <Button variant="outline" size="sm" className="gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                    </Link>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleDelete(plan)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Practice Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. U18 Wednesday Session" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-date">Practice Date</Label>
              <Input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
};

export default CoachPracticePlans;
