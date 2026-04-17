import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, Save } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

interface Drill {
  id: string;
  name: string;
  duration_minutes: number | null;
}

interface Plan {
  id: string;
  name: string;
  team_id: string | null;
  practice_date: string | null;
  number_of_players: number | null;
  practice_focus: string | null;
  intro: string | null;
  notes: string | null;
  warm_up_notes: string | null;
  post_notes: string | null;
  is_shared: boolean;
}

interface PlanItem {
  id: string;
  item_type: "drill" | "note";
  drill_id: string | null;
  note_title: string | null;
  note_text: string | null;
  duration_minutes: number | null;
  sort_order: number;
}

const CoachPracticePlanEditor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [newDrillId, setNewDrillId] = useState("none");
  const [newDrillDuration, setNewDrillDuration] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteDuration, setNewNoteDuration] = useState("");

  const loadData = async () => {
    if (!id || !user) return;
    setLoading(true);

    const [planRes, itemsRes, drillsRes, teamsRes] = await Promise.all([
      (supabase as any).from("coach_practice_plans").select("*").eq("id", id).single(),
      (supabase as any).from("coach_practice_plan_items").select("*").eq("practice_plan_id", id).order("sort_order"),
      (supabase as any).from("coach_drills").select("id, name, duration_minutes").order("name"),
      (supabase as any).from("coach_teams").select("id, name").eq("coach_id", user.id).order("name"),
    ]);

    if (planRes.error || itemsRes.error || drillsRes.error || teamsRes.error) {
      toast({
        title: "Failed to load plan",
        description: planRes.error?.message || itemsRes.error?.message || drillsRes.error?.message || teamsRes.error?.message || "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setPlan(planRes.data);
    setItems((itemsRes.data ?? []) as PlanItem[]);
    setDrills(drillsRes.data ?? []);
    setTeams(teamsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  const drillById = useMemo(() => Object.fromEntries(drills.map((d) => [d.id, d])), [drills]);

  const totalMinutes = useMemo(() => {
    return items.reduce((sum, item) => {
      const duration = item.duration_minutes ?? (item.drill_id ? drillById[item.drill_id]?.duration_minutes ?? 0 : 0);
      return sum + (duration ?? 0);
    }, 0);
  }, [items, drillById]);

  const patchPlan = (key: keyof Plan, value: any) => {
    setPlan((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveHeader = async () => {
    if (!plan) return;
    setSavingHeader(true);

    const payload = {
      name: plan.name,
      team_id: plan.team_id,
      practice_date: plan.practice_date,
      number_of_players: plan.number_of_players,
      practice_focus: plan.practice_focus,
      intro: plan.intro,
      notes: plan.notes,
      warm_up_notes: plan.warm_up_notes,
      post_notes: plan.post_notes,
      is_shared: plan.is_shared,
    };

    const { error } = await (supabase as any).from("coach_practice_plans").update(payload).eq("id", plan.id);

    if (error) {
      toast({ title: "Failed to save plan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plan saved" });
    }

    setSavingHeader(false);
  };

  const addDrillItem = async () => {
    if (!id || newDrillId === "none") {
      toast({ title: "Select a drill first", variant: "destructive" });
      return;
    }

    const nextOrder = items.length;
    const payload = {
      practice_plan_id: id,
      item_type: "drill",
      drill_id: newDrillId,
      duration_minutes: newDrillDuration.trim() ? Number(newDrillDuration) : null,
      sort_order: nextOrder,
    };

    const { error } = await (supabase as any).from("coach_practice_plan_items").insert(payload);
    if (error) {
      toast({ title: "Failed to add drill", description: error.message, variant: "destructive" });
      return;
    }

    setNewDrillId("none");
    setNewDrillDuration("");
    await loadData();
  };

  const addNoteItem = async () => {
    if (!id || !newNoteText.trim()) {
      toast({ title: "Note text is required", variant: "destructive" });
      return;
    }

    const nextOrder = items.length;
    const payload = {
      practice_plan_id: id,
      item_type: "note",
      note_title: newNoteTitle.trim() || null,
      note_text: newNoteText.trim(),
      duration_minutes: newNoteDuration.trim() ? Number(newNoteDuration) : null,
      sort_order: nextOrder,
    };

    const { error } = await (supabase as any).from("coach_practice_plan_items").insert(payload);
    if (error) {
      toast({ title: "Failed to add note", description: error.message, variant: "destructive" });
      return;
    }

    setNewNoteTitle("");
    setNewNoteText("");
    setNewNoteDuration("");
    await loadData();
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await (supabase as any).from("coach_practice_plan_items").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Failed to delete item", description: error.message, variant: "destructive" });
      return;
    }
    await normalizeSortOrder();
  };

  const normalizeSortOrder = async () => {
    if (!id) return;
    const { data, error } = await (supabase as any)
      .from("coach_practice_plan_items")
      .select("id")
      .eq("practice_plan_id", id)
      .order("sort_order");

    if (error) {
      toast({ title: "Failed to reorder items", description: error.message, variant: "destructive" });
      return;
    }

    const updates = (data ?? []).map((row: any, idx: number) =>
      (supabase as any).from("coach_practice_plan_items").update({ sort_order: idx }).eq("id", row.id)
    );

    await Promise.all(updates);
    await loadData();
  };

  const moveItem = async (itemId: string, direction: "up" | "down") => {
    const currentIndex = items.findIndex((i) => i.id === itemId);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[currentIndex];
    const target = items[targetIndex];

    const [resA, resB] = await Promise.all([
      (supabase as any).from("coach_practice_plan_items").update({ sort_order: target.sort_order }).eq("id", current.id),
      (supabase as any).from("coach_practice_plan_items").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);

    if (resA.error || resB.error) {
      toast({ title: "Failed to reorder", description: resA.error?.message || resB.error?.message, variant: "destructive" });
      return;
    }

    await loadData();
  };

  if (loading) {
    return (
      <CoachLayout>
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading practice plan...</CardContent></Card>
      </CoachLayout>
    );
  }

  if (!plan) {
    return (
      <CoachLayout>
        <Card><CardContent className="py-10 text-center text-muted-foreground">Practice plan not found.</CardContent></Card>
      </CoachLayout>
    );
  }

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Practice Plan</h1>
            <p className="text-sm text-muted-foreground">Total scheduled time: {totalMinutes} minutes</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/coach/practice-plans/${plan.id}/view`}>
              <Button variant="outline" className="gap-2"><Eye className="h-4 w-4" /> View</Button>
            </Link>
            <Button onClick={saveHeader} disabled={savingHeader} className="gap-2">
              <Save className="h-4 w-4" />
              {savingHeader ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Plan Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={plan.name} onChange={(e) => patchPlan("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Practice Date</Label>
                <Input type="date" value={plan.practice_date ?? ""} onChange={(e) => patchPlan("practice_date", e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={plan.team_id ?? "none"} onValueChange={(value) => patchPlan("team_id", value === "none" ? null : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of Players</Label>
                <Input
                  type="number"
                  min={0}
                  value={plan.number_of_players ?? ""}
                  onChange={(e) => patchPlan("number_of_players", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Practice Focus</Label>
              <Input value={plan.practice_focus ?? ""} onChange={(e) => patchPlan("practice_focus", e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>Intro</Label>
              <Textarea rows={2} value={plan.intro ?? ""} onChange={(e) => patchPlan("intro", e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea rows={3} value={plan.notes ?? ""} onChange={(e) => patchPlan("notes", e.target.value || null)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warm-Up Notes</Label>
                <Textarea rows={3} value={plan.warm_up_notes ?? ""} onChange={(e) => patchPlan("warm_up_notes", e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Post-Practice Notes</Label>
                <Textarea rows={3} value={plan.post_notes ?? ""} onChange={(e) => patchPlan("post_notes", e.target.value || null)} />
              </div>
            </div>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={plan.is_shared} onChange={(e) => patchPlan("is_shared", e.target.checked)} />
              Share with other coaches
            </label>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Add Drill Item</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Drill</Label>
                <Select value={newDrillId} onValueChange={setNewDrillId}>
                  <SelectTrigger><SelectValue placeholder="Select drill" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a drill</SelectItem>
                    {drills.map((drill) => (
                      <SelectItem key={drill.id} value={drill.id}>{drill.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration Override (minutes)</Label>
                <Input type="number" min={0} value={newDrillDuration} onChange={(e) => setNewDrillDuration(e.target.value)} />
              </div>
              <Button onClick={addDrillItem} className="gap-2"><Plus className="h-4 w-4" /> Add Drill</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Add Note Item</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Note Title</Label>
                <Input value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} placeholder="e.g. Team Talk" />
              </div>
              <div className="space-y-2">
                <Label>Note Text</Label>
                <Textarea rows={3} value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={0} value={newNoteDuration} onChange={(e) => setNewNoteDuration(e.target.value)} />
              </div>
              <Button onClick={addNoteItem} className="gap-2"><Plus className="h-4 w-4" /> Add Note</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Timeline Items ({items.length})</CardTitle></CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const drill = item.drill_id ? drillById[item.drill_id] : null;
                  const duration = item.duration_minutes ?? drill?.duration_minutes ?? null;

                  return (
                    <div key={item.id} className="border rounded-md p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {item.item_type === "drill" ? `Drill: ${drill?.name ?? "Unknown"}` : `Note: ${item.note_title ?? "Untitled"}`}
                          </p>
                          {item.item_type === "note" && item.note_text && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.note_text}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Duration: {duration ?? "-"} minutes</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="outline" size="icon" onClick={() => moveItem(item.id, "up")} disabled={index === 0}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => moveItem(item.id, "down")} disabled={index === items.length - 1}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => deleteItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  );
};

export default CoachPracticePlanEditor;
