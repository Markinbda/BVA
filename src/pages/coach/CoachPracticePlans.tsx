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
import { Plus, Pencil, Eye, Trash2, Calendar, Search, Copy } from "lucide-react";

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
  const [copyingId, setCopyingId] = useState<string | null>(null);
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

  const handleCopy = async (plan: Plan) => {
    if (!user) return;

    setCopyingId(plan.id);
    try {
      const copyPayload = {
        coach_id: user.id,
        team_id: plan.team_id,
        name: `${plan.name} (Copy)`,
        practice_date: plan.practice_date,
        number_of_players: plan.number_of_players,
        practice_focus: plan.practice_focus,
        is_shared: false,
        status: 1,
      };

      const { data: newPlan, error: newPlanError } = await (supabase as any)
        .from("coach_practice_plans")
        .insert(copyPayload)
        .select("id")
        .single();

      if (newPlanError) throw new Error(newPlanError.message);

      const { data: sourceItems, error: sourceItemsError } = await (supabase as any)
        .from("coach_practice_plan_items")
        .select("item_type, drill_id, file_path, note_title, note_text, duration_minutes, sort_order")
        .eq("practice_plan_id", plan.id)
        .order("sort_order", { ascending: true });

      if (sourceItemsError) throw new Error(sourceItemsError.message);

      if ((sourceItems ?? []).length > 0) {
        const insertItems = sourceItems.map((item: any) => ({
          practice_plan_id: newPlan.id,
          item_type: item.item_type,
          drill_id: item.drill_id,
          file_path: item.file_path,
          note_title: item.note_title,
          note_text: item.note_text,
          duration_minutes: item.duration_minutes,
          sort_order: item.sort_order,
        }));

        const { error: insertItemsError } = await (supabase as any)
          .from("coach_practice_plan_items")
          .insert(insertItems);

        if (insertItemsError) throw new Error(insertItemsError.message);
      }

      toast({ title: "Practice plan copied" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to copy plan", description: err.message, variant: "destructive" });
    } finally {
      setCopyingId(null);
    }
  };

  const formatPracticeDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Practice Plans List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">Name</th>
                      <th className="py-3 pr-4 font-medium">Practice Date</th>
                      <th className="py-3 pr-4 font-medium">Team</th>
                      <th className="py-3 pr-4 font-medium">Shared</th>
                      <th className="py-3 pr-4 font-medium">Practice Focus</th>
                      <th className="py-3 pr-0 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((plan) => (
                      <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-3 pr-4 font-medium text-foreground">{plan.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatPracticeDate(plan.practice_date)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{plan.team_id ? teamById[plan.team_id] ?? "Unknown team" : "None"}</td>
                        <td className="py-3 pr-4">
                          {plan.is_shared ? (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted">Yes</span>
                          ) : (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{plan.practice_focus || "-"}</td>
                        <td className="py-3 pr-0">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={copyingId === plan.id ? "Copying" : "Copy"}
                              disabled={copyingId === plan.id}
                              onClick={() => handleCopy(plan)}
                              className="h-8 w-8"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Link to={`/coach/practice-plans/${plan.id}/view`}>
                              <Button variant="ghost" size="icon" title="View" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/coach/practice-plans/${plan.id}`}>
                              <Button variant="ghost" size="icon" title="Edit" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => handleDelete(plan)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
