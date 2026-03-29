import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calculator, ChevronRight } from "lucide-react";
import {
  calculateRungStandings,
  getPromotionSwap,
  generateRoundRobin,
  type TeamNightResult,
} from "@/lib/leagueUtils";

const AdminLeagueWeek = () => {
  const { seasonId, weekNum } = useParams<{ seasonId: string; weekNum: string }>();
  const weekNumber = Number(weekNum);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, { score_a: string; score_b: string }>>({});
  const [calculated, setCalculated] = useState<TeamNightResult[] | null>(null);

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

  const { data: matches = [] } = useQuery({
    queryKey: ["league_matches", seasonId, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_matches")
        .select("*")
        .eq("season_id", seasonId!)
        .eq("week_number", weekNumber);
      if (error) throw error;
      // Initialize scores state
      const initial: Record<string, { score_a: string; score_b: string }> = {};
      data.forEach((m) => {
        initial[m.id] = {
          score_a: m.score_a?.toString() ?? "",
          score_b: m.score_b?.toString() ?? "",
        };
      });
      setScores(initial);
      return data;
    },
    enabled: !!seasonId,
  });

  const { data: existingStandings = [] } = useQuery({
    queryKey: ["league_weekly_standings", seasonId, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_weekly_standings")
        .select("*")
        .eq("season_id", seasonId!)
        .eq("week_number", weekNumber);
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const weekFinalized = existingStandings.length > 0;

  const saveScores = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(scores).map(([id, s]) => ({
        id,
        score_a: s.score_a ? parseInt(s.score_a) : null,
        score_b: s.score_b ? parseInt(s.score_b) : null,
      }));
      for (const u of updates) {
        const { error } = await supabase
          .from("league_matches")
          .update({ score_a: u.score_a, score_b: u.score_b })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_matches", seasonId, weekNumber] });
      toast({ title: "Scores saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCalculate = () => {
    // Build match objects with entered scores
    const matchesWithScores = matches.map((m) => ({
      ...m,
      score_a: scores[m.id]?.score_a ? parseInt(scores[m.id].score_a) : null,
      score_b: scores[m.id]?.score_b ? parseInt(scores[m.id].score_b) : null,
    }));

    const rung1 = calculateRungStandings(matchesWithScores, teams, 1);
    const rung2 = calculateRungStandings(matchesWithScores, teams, 2);
    setCalculated([...rung1, ...rung2]);
  };

  const finalizeWeek = useMutation({
    mutationFn: async () => {
      if (!calculated || !seasonId) return;

      // Save scores first
      await saveScores.mutateAsync();

      // Delete any existing standings for this week (re-calculation)
      await supabase
        .from("league_weekly_standings")
        .delete()
        .eq("season_id", seasonId)
        .eq("week_number", weekNumber);

      // Insert standings
      const standingsRows = calculated.map((r) => ({
        season_id: seasonId,
        week_number: weekNumber,
        team_id: r.teamId,
        rung: r.rung,
        position: r.position,
        points_awarded: r.pointsAwarded,
        wins: r.wins,
        losses: r.losses,
        point_diff: r.pointDiff,
      }));

      const { error: sError } = await supabase.from("league_weekly_standings").insert(standingsRows);
      if (sError) throw sError;

      // Handle promotion/relegation
      const rung1 = calculated.filter((r) => r.rung === 1);
      const rung2 = calculated.filter((r) => r.rung === 2);
      const swap = getPromotionSwap(rung1, rung2);

      if (swap) {
        const [demotedId, promotedId] = swap;
        await supabase.from("league_teams").update({ current_rung: 2 }).eq("id", demotedId);
        await supabase.from("league_teams").update({ current_rung: 1 }).eq("id", promotedId);
      }

      // Generate next week's matches if not last week
      if (season && weekNumber < season.num_weeks) {
        const nextWeek = weekNumber + 1;

        // Check if next week matches already exist
        const { data: existing } = await supabase
          .from("league_matches")
          .select("id")
          .eq("season_id", seasonId)
          .eq("week_number", nextWeek)
          .limit(1);

        if (!existing || existing.length === 0) {
          // Re-fetch teams to get updated rungs
          const { data: updatedTeams } = await supabase
            .from("league_teams")
            .select("*")
            .eq("season_id", seasonId);

          if (updatedTeams) {
            const rung1Ids = updatedTeams.filter((t) => t.current_rung === 1).map((t) => t.id);
            const rung2Ids = updatedTeams.filter((t) => t.current_rung === 2).map((t) => t.id);

            const nextMatches = [
              ...generateRoundRobin(rung1Ids).map(([a, b]) => ({
                season_id: seasonId,
                week_number: nextWeek,
                rung: 1,
                team_a_id: a,
                team_b_id: b,
              })),
              ...generateRoundRobin(rung2Ids).map(([a, b]) => ({
                season_id: seasonId,
                week_number: nextWeek,
                rung: 2,
                team_a_id: a,
                team_b_id: b,
              })),
            ];

            await supabase.from("league_matches").insert(nextMatches);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_weekly_standings"] });
      queryClient.invalidateQueries({ queryKey: ["league_teams"] });
      setCalculated(null);
      toast({ title: `Week ${weekNumber} finalized!` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const allScoresEntered = matches.length > 0 && matches.every((m) => {
    const s = scores[m.id];
    return s && s.score_a !== "" && s.score_b !== "";
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/leagues"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase">
              {season?.name} — Week {weekNumber}
            </h1>
            {weekFinalized && <Badge variant="secondary">Finalized</Badge>}
          </div>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No matches generated for this week yet. Go back and generate matches or finalize the previous week.
            </CardContent>
          </Card>
        ) : (
          <>
            {[1, 2].map((rung) => {
              const rungMatches = matches.filter((m) => m.rung === rung);
              if (rungMatches.length === 0) return null;
              return (
                <Card key={rung}>
                  <CardHeader>
                    <CardTitle className="font-heading text-xl uppercase">Rung {rung} Matches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team A</TableHead>
                          <TableHead className="w-24 text-center">Score</TableHead>
                          <TableHead className="w-8 text-center">vs</TableHead>
                          <TableHead className="w-24 text-center">Score</TableHead>
                          <TableHead>Team B</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rungMatches.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{teamMap.get(m.team_a_id)?.team_name ?? "?"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                className="w-20 text-center"
                                value={scores[m.id]?.score_a ?? ""}
                                onChange={(e) =>
                                  setScores((prev) => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], score_a: e.target.value },
                                  }))
                                }
                                disabled={weekFinalized}
                              />
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">vs</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                className="w-20 text-center"
                                value={scores[m.id]?.score_b ?? ""}
                                onChange={(e) =>
                                  setScores((prev) => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], score_b: e.target.value },
                                  }))
                                }
                                disabled={weekFinalized}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{teamMap.get(m.team_b_id)?.team_name ?? "?"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}

            {!weekFinalized && (
              <div className="flex gap-3">
                <Button onClick={() => saveScores.mutate()} variant="outline">
                  Save Scores
                </Button>
                <Button onClick={handleCalculate} disabled={!allScoresEntered}>
                  <Calculator className="mr-2 h-4 w-4" /> Calculate Results
                </Button>
              </div>
            )}

            {/* Calculated results preview */}
            {calculated && !weekFinalized && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase">Nightly Results Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2].map((rung) => {
                    const rungResults = calculated.filter((r) => r.rung === rung);
                    if (rungResults.length === 0) return null;
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
                            {rungResults.map((r) => {
                              const swap = getPromotionSwap(
                                calculated.filter((c) => c.rung === 1),
                                calculated.filter((c) => c.rung === 2)
                              );
                              const isDemoted = swap && swap[0] === r.teamId;
                              const isPromoted = swap && swap[1] === r.teamId;
                              return (
                                <TableRow key={r.teamId}>
                                  <TableCell>{r.position}</TableCell>
                                  <TableCell className="font-medium">
                                    {r.teamName}
                                    {isDemoted && <Badge variant="destructive" className="ml-2">↓ Relegated</Badge>}
                                    {isPromoted && <Badge className="ml-2 bg-accent text-accent-foreground">↑ Promoted</Badge>}
                                  </TableCell>
                                  <TableCell>{r.wins}</TableCell>
                                  <TableCell>{r.losses}</TableCell>
                                  <TableCell>{r.pointDiff > 0 ? `+${r.pointDiff}` : r.pointDiff}</TableCell>
                                  <TableCell className="font-bold">{r.pointsAwarded}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}

                  <Button onClick={() => finalizeWeek.mutate()} className="mt-4">
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Finalize Week {weekNumber} & Generate Next Week
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Show finalized standings */}
            {weekFinalized && existingStandings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase">Week {weekNumber} Final Standings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2].map((rung) => {
                    const rungStandings = existingStandings
                      .filter((s) => s.rung === rung)
                      .sort((a, b) => a.position - b.position);
                    if (rungStandings.length === 0) return null;
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
                            {rungStandings.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell>{s.position}</TableCell>
                                <TableCell className="font-medium">{teamMap.get(s.team_id)?.team_name ?? "?"}</TableCell>
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
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLeagueWeek;
