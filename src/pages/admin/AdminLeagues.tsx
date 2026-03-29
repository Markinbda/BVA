import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, Trophy } from "lucide-react";
import { generateRoundRobin } from "@/lib/leagueUtils";

const AdminLeagues = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [seasonName, setSeasonName] = useState("");
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamRung, setTeamRung] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  const { data: seasons = [] } = useQuery({
    queryKey: ["league_seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_seasons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["league_teams", selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];
      const { data, error } = await supabase
        .from("league_teams")
        .select("*")
        .eq("season_id", selectedSeason)
        .order("current_rung")
        .order("team_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSeason,
  });

  const createSeason = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("league_seasons").insert({ name: seasonName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_seasons"] });
      setSeasonName("");
      setSeasonDialogOpen(false);
      toast({ title: "Season created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addTeam = useMutation({
    mutationFn: async () => {
      if (!selectedSeason) return;
      const { error } = await supabase.from("league_teams").insert({
        season_id: selectedSeason,
        team_name: teamName,
        current_rung: teamRung,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_teams"] });
      setTeamName("");
      setTeamDialogOpen(false);
      toast({ title: "Team added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("league_teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league_teams"] });
      toast({ title: "Team removed" });
    },
  });

  const generateWeek1 = useMutation({
    mutationFn: async () => {
      if (!selectedSeason) return;
      const rung1Teams = teams.filter((t) => t.current_rung === 1).map((t) => t.id);
      const rung2Teams = teams.filter((t) => t.current_rung === 2).map((t) => t.id);

      const matches = [
        ...generateRoundRobin(rung1Teams).map(([a, b]) => ({
          season_id: selectedSeason,
          week_number: 1,
          rung: 1,
          team_a_id: a,
          team_b_id: b,
        })),
        ...generateRoundRobin(rung2Teams).map(([a, b]) => ({
          season_id: selectedSeason,
          week_number: 1,
          rung: 2,
          team_a_id: a,
          team_b_id: b,
        })),
      ];

      const { error } = await supabase.from("league_matches").insert(matches);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Week 1 matches generated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activeSeason = seasons.find((s) => s.id === selectedSeason);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase">League Manager</h1>
            <p className="text-muted-foreground">Manage seasons, teams, and weekly matches</p>
          </div>
          <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Season</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Season</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Season Name</Label>
                  <Input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="e.g. Winter 2026" />
                </div>
                <Button onClick={() => createSeason.mutate()} disabled={!seasonName.trim()}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Season Selection */}
        <div className="grid gap-3 md:grid-cols-3">
          {seasons.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-all ${selectedSeason === s.id ? "ring-2 ring-primary" : "hover:shadow-md"}`}
              onClick={() => setSelectedSeason(s.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <Trophy className="h-5 w-5 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="font-heading text-lg font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.status} • {s.num_weeks} weeks</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Season Details */}
        {activeSeason && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-xl uppercase">{activeSeason.name} — Teams</CardTitle>
              <div className="flex gap-2">
                <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Add Team</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Team</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Team Name</Label>
                        <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" />
                      </div>
                      <div>
                        <Label>Starting Rung</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={teamRung}
                          onChange={(e) => setTeamRung(Number(e.target.value))}
                        >
                          <option value={1}>Rung 1</option>
                          <option value={2}>Rung 2</option>
                        </select>
                      </div>
                      <Button onClick={() => addTeam.mutate()} disabled={!teamName.trim()}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((rung) => {
                const rungTeams = teams.filter((t) => t.current_rung === rung);
                return (
                  <div key={rung}>
                    <h3 className="font-heading text-lg font-semibold mb-2">Rung {rung} ({rungTeams.length} teams)</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rungTeams.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{t.team_name}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => deleteTeam.mutate(t.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rungTeams.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No teams yet</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button
                  onClick={() => generateWeek1.mutate()}
                  disabled={teams.length < 2}
                  variant="outline"
                >
                  Generate Week 1 Matches
                </Button>
                {Array.from({ length: activeSeason.num_weeks }, (_, i) => i + 1).map((week) => (
                  <Button key={week} variant="ghost" size="sm" asChild>
                    <Link to={`/admin/leagues/${activeSeason.id}/week/${week}`}>
                      Week {week} <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLeagues;
