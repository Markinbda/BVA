import type { Tables } from "@/integrations/supabase/types";

type LeagueMatch = Tables<"league_matches">;
type LeagueTeam = Tables<"league_teams">;

export interface TeamNightResult {
  teamId: string;
  teamName: string;
  rung: number;
  wins: number;
  losses: number;
  pointDiff: number;
  position: number;
  pointsAwarded: number;
}

/**
 * Generate a round-robin schedule for a list of teams.
 * Returns pairs of [teamA_id, teamB_id].
 */
export function generateRoundRobin(teamIds: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

/**
 * Calculate nightly standings from completed matches for a single rung.
 * Ranks teams by wins (desc), then point differential (desc).
 */
export function calculateRungStandings(
  matches: LeagueMatch[],
  teams: LeagueTeam[],
  rung: number
): TeamNightResult[] {
  const rungMatches = matches.filter((m) => m.rung === rung);
  const rungTeams = teams.filter((t) => t.current_rung === rung);

  const stats = new Map<string, { wins: number; losses: number; pointDiff: number; teamName: string }>();

  for (const team of rungTeams) {
    stats.set(team.id, { wins: 0, losses: 0, pointDiff: 0, teamName: team.team_name });
  }

  for (const match of rungMatches) {
    if (match.score_a == null || match.score_b == null) continue;
    const diff = match.score_a - match.score_b;

    const statA = stats.get(match.team_a_id);
    const statB = stats.get(match.team_b_id);

    if (statA) {
      statA.pointDiff += diff;
      if (diff > 0) statA.wins++;
      else statA.losses++;
    }
    if (statB) {
      statB.pointDiff -= diff;
      if (diff < 0) statB.wins++;
      else statB.losses++;
    }
  }

  const sorted = Array.from(stats.entries())
    .map(([teamId, s]) => ({ teamId, ...s, rung }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointDiff - a.pointDiff;
    });

  // Assign position-based points: Rung 1 = 1-5, Rung 2 = 6-10
  const basePoints = (rung - 1) * 5;
  return sorted.map((team, index) => ({
    teamId: team.teamId,
    teamName: team.teamName,
    rung,
    wins: team.wins,
    losses: team.losses,
    pointDiff: team.pointDiff,
    position: index + 1,
    pointsAwarded: basePoints + index + 1,
  }));
}

/**
 * Determine the promotion/relegation swap.
 * Returns [demotedTeamId, promotedTeamId] or null if no swap needed.
 */
export function getPromotionSwap(
  rung1Standings: TeamNightResult[],
  rung2Standings: TeamNightResult[]
): [string, string] | null {
  if (rung1Standings.length === 0 || rung2Standings.length === 0) return null;
  const demoted = rung1Standings[rung1Standings.length - 1]; // last place rung 1
  const promoted = rung2Standings[0]; // first place rung 2
  return [demoted.teamId, promoted.teamId];
}

/**
 * Calculate cumulative standings across all weeks.
 */
export function calculateCumulativeStandings(
  weeklyStandings: Tables<"league_weekly_standings">[],
  teams: LeagueTeam[]
): {
  teamId: string;
  teamName: string;
  totalPoints: number;
  totalWins: number;
  totalLosses: number;
  currentRung: number;
}[] {
  const cumulative = new Map<string, { totalPoints: number; totalWins: number; totalLosses: number }>();

  for (const ws of weeklyStandings) {
    const existing = cumulative.get(ws.team_id) || { totalPoints: 0, totalWins: 0, totalLosses: 0 };
    existing.totalPoints += ws.points_awarded;
    existing.totalWins += ws.wins;
    existing.totalLosses += ws.losses;
    cumulative.set(ws.team_id, existing);
  }

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return Array.from(cumulative.entries())
    .map(([teamId, stats]) => {
      const team = teamMap.get(teamId);
      return {
        teamId,
        teamName: team?.team_name ?? "Unknown",
        currentRung: team?.current_rung ?? 1,
        ...stats,
      };
    })
    .sort((a, b) => a.totalPoints - b.totalPoints);
}
