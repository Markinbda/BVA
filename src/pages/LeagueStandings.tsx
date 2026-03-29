import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { calculateCumulativeStandings } from "@/lib/leagueUtils";
import { useMemo } from "react";

const LeagueStandings = () => {
  const { seasonId } = useParams<{ seasonId: string }>();

  const { data: season } = useQuery({
    queryKey: ["league_season", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("league_seasons").select("*").eq("id", seasonId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["league_teams", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("league_teams").select("*").eq("season_id", seasonId!);
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  const { data: allStandings = [] } = useQuery({
    queryKey: ["league_weekly_standings_all", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_weekly_standings")
        .select("*")
        .eq("season_id", seasonId!)
        .order("week_number")
        .order("rung")
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  const cumulative = useMemo(() => calculateCumulativeStandings(allStandings, teams), [allStandings, teams]);
  const completedWeeks = useMemo(() => {
    const weeks = new Set(allStandings.map((s) => s.week_number));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [allStandings]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  return (
    <Layout>
      <PageHeader title={season?.name ?? "League Standings"} subtitle="Overall standings and weekly results" />
      <div className="container mx-auto px-4 py-12 space-y-8">
        {/* Cumulative Standings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl uppercase">Overall Standings</CardTitle>
          </CardHeader>
          <CardContent>
            {cumulative.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No results yet. Check back after the first week of play.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Current Rung</TableHead>
                    <TableHead>Total Points</TableHead>
                    <TableHead>W-L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cumulative.map((team, i) => (
                    <TableRow key={team.teamId}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{team.teamName}</TableCell>
                      <TableCell><Badge variant="outline">Rung {team.currentRung}</Badge></TableCell>
                      <TableCell className="font-bold text-primary">{team.totalPoints}</TableCell>
                      <TableCell>{team.totalWins}-{team.totalLosses}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Weekly Breakdown */}
        {completedWeeks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl uppercase">Weekly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={String(completedWeeks[completedWeeks.length - 1])}>
                <TabsList className="flex flex-wrap h-auto gap-1">
                  {completedWeeks.map((w) => (
                    <TabsTrigger key={w} value={String(w)}>Week {w}</TabsTrigger>
                  ))}
                </TabsList>
                {completedWeeks.map((week) => {
                  const weekData = allStandings.filter((s) => s.week_number === week);
                  return (
                    <TabsContent key={week} value={String(week)} className="space-y-4 mt-4">
                      {[1, 2].map((rung) => {
                        const rungData = weekData.filter((s) => s.rung === rung);
                        if (rungData.length === 0) return null;
                        return (
                          <div key={rung}>
                            <h3 className="font-heading text-lg font-semibold mb-2">Rung {rung}</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Pos</TableHead>
                                  <TableHead>Team</TableHead>
                                  <TableHead>W</TableHead>
                                  <TableHead>L</TableHead>
                                  <TableHead>Diff</TableHead>
                                  <TableHead>Points</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rungData.map((s) => (
                                  <TableRow key={s.id}>
                                    <TableCell>{s.position}</TableCell>
                                    <TableCell className="font-medium">
                                      {teamMap.get(s.team_id)?.team_name ?? "?"}
                                    </TableCell>
                                    <TableCell>{s.wins}</TableCell>
                                    <TableCell>{s.losses}</TableCell>
                                    <TableCell>{s.point_diff > 0 ? `+${s.point_diff}` : s.point_diff}</TableCell>
                                    <TableCell className="font-bold">{s.points_awarded}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default LeagueStandings;
