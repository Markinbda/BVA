import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CoachLayout from "@/components/coach/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, Mail, Clock, Dumbbell, CalendarRange } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  players: number;
  teams: number;
  emails: number;
  drills: number;
  plans: number;
}

const CoachDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ players: 0, teams: 0, emails: 0, drills: 0, plans: 0 });
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [playersRes, teamsRes, emailsRes, drillsRes, plansRes, profileRes] = await Promise.all([
        (supabase as any).from("coach_players").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("coach_teams").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("coach_email_history").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("coach_drills").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("coach_practice_plans").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("profiles").select("display_name").eq("user_id", user.id).single(),
      ]);
      setStats({
        players: playersRes.count ?? 0,
        teams: teamsRes.count ?? 0,
        emails: emailsRes.count ?? 0,
        drills: drillsRes.count ?? 0,
        plans: plansRes.count ?? 0,
      });
      setDisplayName(profileRes.data?.display_name ?? user.email ?? "Coach");
    };

    load();
  }, [user]);

  const tiles = [
    { label: "Players", value: stats.players, icon: Users, to: "/coach/players", color: "text-blue-500" },
    { label: "Teams", value: stats.teams, icon: ClipboardList, to: "/coach/teams", color: "text-green-500" },
    { label: "Drills", value: stats.drills, icon: Dumbbell, to: "/coach/drills", color: "text-amber-500" },
    { label: "Practice Plans", value: stats.plans, icon: CalendarRange, to: "/coach/practice-plans", color: "text-cyan-600" },
    { label: "Emails Sent", value: stats.emails, icon: Mail, to: "/coach/email-history", color: "text-purple-500" },
  ];

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, {displayName}</h1>
          <p className="text-muted-foreground mt-1">Coach Portal — Bermuda Volleyball Association</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiles.map(({ label, value, icon: Icon, to, color }) => (
            <Link key={label} to={to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className={`h-5 w-5 ${color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/coach/players" className="block text-sm text-primary hover:underline">+ Add a player</Link>
              <Link to="/coach/teams" className="block text-sm text-primary hover:underline">+ Create a team</Link>
              <Link to="/coach/drills" className="block text-sm text-primary hover:underline">+ Create a drill</Link>
              <Link to="/coach/practice-plans" className="block text-sm text-primary hover:underline">+ Build a practice plan</Link>
              <Link to="/coach/email" className="block text-sm text-primary hover:underline">+ Compose an email</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View your <Link to="/coach/email-history" className="text-primary hover:underline">email history</Link> to see recent sends.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CoachLayout>
  );
};

export default CoachDashboard;
