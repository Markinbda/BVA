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

interface FavoriteDrill {
  id: string;
  name: string;
  duration_minutes: number | null;
}

const CoachDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ players: 0, teams: 0, emails: 0, drills: 0, plans: 0 });
  const [displayName, setDisplayName] = useState("");
  const [favoriteDrills, setFavoriteDrills] = useState<FavoriteDrill[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [ownPlayersRes, ownTeamsRes, assignedPlayersRes, assignedTeamsRes, emailsRes, drillsRes, plansRes, profileRes, favoritesRes] = await Promise.all([
        (supabase as any).from("coach_players").select("id").eq("coach_id", user.id),
        (supabase as any).from("coach_teams").select("id").eq("coach_id", user.id),
        (supabase as any).rpc("get_players_for_assigned_teams", { p_user_id: user.id }),
        (supabase as any).rpc("get_assigned_teams_for_user", { p_user_id: user.id }),
        (supabase as any).from("coach_email_history").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("coach_drills").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("coach_practice_plans").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        (supabase as any).from("profiles").select("display_name").eq("user_id", user.id).single(),
        (supabase as any).from("coach_favorite_drills").select("drill_id").eq("coach_id", user.id).limit(8),
      ]);

      const ownPlayerIds = new Set<string>((ownPlayersRes.data ?? []).map((row: any) => row.id));
      for (const row of assignedPlayersRes.data ?? []) {
        if (row?.id) ownPlayerIds.add(row.id);
      }

      const ownTeamIds = new Set<string>((ownTeamsRes.data ?? []).map((row: any) => row.id));
      for (const row of assignedTeamsRes.data ?? []) {
        if (row?.id) ownTeamIds.add(row.id);
      }

      let favoriteRows: FavoriteDrill[] = [];
      if (!favoritesRes.error) {
        const favoriteIds = (favoritesRes.data ?? []).map((row: any) => row.drill_id).filter(Boolean);
        if (favoriteIds.length > 0) {
          const { data: drillsData, error: drillsError } = await (supabase as any)
            .from("coach_drills")
            .select("id, name, duration_minutes")
            .in("id", favoriteIds)
            .order("name");
          if (!drillsError) {
            favoriteRows = drillsData ?? [];
          }
        }
      }

      setStats({
        players: ownPlayerIds.size,
        teams: ownTeamIds.size,
        emails: emailsRes.count ?? 0,
        drills: drillsRes.count ?? 0,
        plans: plansRes.count ?? 0,
      });
      setDisplayName(profileRes.data?.display_name ?? user.email ?? "Coach");
      setFavoriteDrills(favoriteRows);
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> Favorite Drills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {favoriteDrills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No favorites yet. Turn on favorites in <Link to="/coach/drills" className="text-primary hover:underline">Drill Library</Link>.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {favoriteDrills.map((drill) => (
                  <Link
                    key={drill.id}
                    to={`/coach/drills?drillId=${drill.id}`}
                    className="rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors"
                    title="Open this drill"
                  >
                    <div className="text-sm font-medium text-foreground">{drill.name}</div>
                    <div className="text-xs text-muted-foreground">{drill.duration_minutes ?? "-"} min</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  );
};

export default CoachDashboard;
