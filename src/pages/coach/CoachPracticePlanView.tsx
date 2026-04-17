import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

interface Drill {
  id: string;
  name: string;
  description: string | null;
  equipment: string | null;
  coach_role: string | null;
  assistant_role: string | null;
  duration_minutes: number | null;
}

interface Plan {
  id: string;
  name: string;
  practice_date: string | null;
  number_of_players: number | null;
  practice_focus: string | null;
  intro: string | null;
  notes: string | null;
  warm_up_notes: string | null;
  post_notes: string | null;
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

const CoachPracticePlanView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);

    const [planRes, itemsRes, drillsRes] = await Promise.all([
      (supabase as any).from("coach_practice_plans").select("*").eq("id", id).single(),
      (supabase as any).from("coach_practice_plan_items").select("*").eq("practice_plan_id", id).order("sort_order"),
      (supabase as any).from("coach_drills").select("id, name, description, equipment, coach_role, assistant_role, duration_minutes"),
    ]);

    setPlan(planRes.data ?? null);
    setItems((itemsRes.data ?? []) as PlanItem[]);
    setDrills(drillsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const drillById = useMemo(() => Object.fromEntries(drills.map((d) => [d.id, d])), [drills]);

  const totalMinutes = useMemo(() => {
    return items.reduce((sum, item) => {
      const d = item.drill_id ? drillById[item.drill_id] : null;
      const duration = item.duration_minutes ?? d?.duration_minutes ?? 0;
      return sum + (duration ?? 0);
    }, 0);
  }, [items, drillById]);

  if (loading) {
    return (
      <CoachLayout>
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading plan...</CardContent></Card>
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
            <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
            <p className="text-sm text-muted-foreground">
              Date: {plan.practice_date ?? "N/A"} | Total Duration: {totalMinutes} minutes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/coach/practice-plans/${plan.id}`}>
              <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Editor</Button>
            </Link>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Plan Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Practice Focus:</span> {plan.practice_focus ?? "-"}</p>
            <p><span className="font-medium">Players:</span> {plan.number_of_players ?? "-"}</p>
            <p><span className="font-medium">Intro:</span> {plan.intro ?? "-"}</p>
            <p><span className="font-medium">General Notes:</span> {plan.notes ?? "-"}</p>
            <p><span className="font-medium">Warm-Up Notes:</span> {plan.warm_up_notes ?? "-"}</p>
            <p><span className="font-medium">Post-Practice Notes:</span> {plan.post_notes ?? "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items in this plan.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => {
                  const drill = item.drill_id ? drillById[item.drill_id] : null;
                  const duration = item.duration_minutes ?? drill?.duration_minutes ?? null;

                  return (
                    <div key={item.id} className="border rounded-md p-3">
                      <p className="text-sm font-semibold">{index + 1}. {item.item_type === "drill" ? drill?.name ?? "Unknown drill" : item.note_title ?? "Note"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Duration: {duration ?? "-"} minutes</p>

                      {item.item_type === "note" && item.note_text && (
                        <p className="text-sm mt-2 whitespace-pre-wrap">{item.note_text}</p>
                      )}

                      {item.item_type === "drill" && drill && (
                        <div className="mt-2 space-y-1 text-sm">
                          {drill.description && <p>{drill.description}</p>}
                          {drill.equipment && <p><span className="font-medium">Equipment:</span> {drill.equipment}</p>}
                          {drill.coach_role && <p><span className="font-medium">Coach Role:</span> {drill.coach_role}</p>}
                          {drill.assistant_role && <p><span className="font-medium">Assistant Role:</span> {drill.assistant_role}</p>}
                        </div>
                      )}
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

export default CoachPracticePlanView;
