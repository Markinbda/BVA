import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, UserPlus, UserCheck, Clock, Users, Loader2, SlidersHorizontal,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlayerResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[] | null;
  recentTeam: string | null;
  recentSeason: string | null;
  followStatus: "none" | "pending" | "accepted" | "self";
  followRequestId: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const initials = (name: string | null) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatColor: Record<string, string> = {
  Indoor: "bg-blue-100 text-blue-700",
  Beach: "bg-yellow-100 text-yellow-700",
  Grass: "bg-green-100 text-green-700",
};

// ── Component ──────────────────────────────────────────────────────────────────

const PlayerSearch = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [nameQuery, setNameQuery] = useState("");
  const [teamQuery, setTeamQuery] = useState("");
  const [seasonQuery, setSeasonQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Auto-search when name query changes (debounced)
  useEffect(() => {
    if (!nameQuery.trim() && !teamQuery.trim() && !seasonQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => handleSearch(), 400);
    return () => clearTimeout(timer);
  }, [nameQuery, teamQuery, seasonQuery]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);

    // 1. Search profiles by display_name
    let profileQuery = supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, roles");

    if (nameQuery.trim()) {
      profileQuery = profileQuery.ilike("display_name", `%${nameQuery.trim()}%`);
    }

    const { data: profilesRaw } = await profileQuery.limit(50);
    let profiles = (profilesRaw ?? []) as {
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
      roles: string[] | null;
    }[];

    // Exclude self
    if (user) profiles = profiles.filter((p) => p.user_id !== user.id);

    // 2. If team or season filter, restrict to matching user_ids from season_participation
    if (teamQuery.trim() || seasonQuery.trim()) {
      let seasonQ = (supabase as any)
        .from("season_participation")
        .select("user_id, team_name, season_name, format, year");

      if (teamQuery.trim()) seasonQ = seasonQ.ilike("team_name", `%${teamQuery.trim()}%`);
      if (seasonQuery.trim()) seasonQ = seasonQ.ilike("season_name", `%${seasonQuery.trim()}%`);

      const { data: seasonData } = await seasonQ.limit(200);
      const matchingIds = new Set((seasonData ?? []).map((s: any) => s.user_id));

      // If we only have season/team filter (no name), pull those profiles
      if (!nameQuery.trim()) {
        const extraIds = [...matchingIds].filter(
          (id) => id !== user?.id
        );
        if (extraIds.length > 0) {
          const { data: extraProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, roles")
            .in("user_id", extraIds);
          profiles = (extraProfiles ?? []) as typeof profiles;
        } else {
          profiles = [];
        }
      } else {
        profiles = profiles.filter((p) => matchingIds.has(p.user_id));
      }
    }

    if (profiles.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const allIds = profiles.map((p) => p.user_id);

    // 3. Get most recent team for each user
    const { data: seasons } = await (supabase as any)
      .from("season_participation")
      .select("user_id, team_name, season_name, year")
      .in("user_id", allIds)
      .order("year", { ascending: false });

    const teamMap = new Map<string, { team: string; season: string }>();
    (seasons ?? []).forEach((s: any) => {
      if (!teamMap.has(s.user_id) && s.team_name) {
        teamMap.set(s.user_id, { team: s.team_name, season: s.season_name });
      }
    });

    // 4. Get follow status for each result (only if logged in)
    const followMap = new Map<string, { status: string; id: string }>();
    if (user) {
      const { data: followData } = await (supabase as any)
        .from("follow_requests")
        .select("id, recipient_id, requester_id, status")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .in("recipient_id", allIds)
        .or(`requester_id.in.(${allIds.join(",")})`, { foreignTable: undefined });

      // Re-query more specifically
      const { data: sentRequests } = await (supabase as any)
        .from("follow_requests")
        .select("id, recipient_id, status")
        .eq("requester_id", user.id)
        .in("recipient_id", allIds);

      (sentRequests ?? []).forEach((r: any) => {
        followMap.set(r.recipient_id, { status: r.status, id: r.id });
      });
    }

    const results: PlayerResult[] = profiles.map((p) => {
      const teamInfo = teamMap.get(p.user_id);
      const followInfo = followMap.get(p.user_id);
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        roles: p.roles,
        recentTeam: teamInfo?.team ?? null,
        recentSeason: teamInfo?.season ?? null,
        followStatus: !user
          ? "none"
          : p.user_id === user.id
          ? "self"
          : followInfo
          ? (followInfo.status as "pending" | "accepted")
          : "none",
        followRequestId: followInfo?.id ?? null,
      };
    });

    setResults(results);
    setLoading(false);
  }, [nameQuery, teamQuery, seasonQuery, user]);

  const sendFollowRequest = async (targetId: string) => {
    if (!user) {
      toast({ title: "Please sign in to follow players", variant: "destructive" });
      return;
    }
    setActionLoading(targetId);
    const { error } = await (supabase as any)
      .from("follow_requests")
      .insert({ requester_id: user.id, recipient_id: targetId, status: "pending" });
    setActionLoading(null);
    if (error) {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    } else {
      setResults((prev) =>
        prev.map((r) =>
          r.user_id === targetId ? { ...r, followStatus: "pending" } : r
        )
      );
      toast({ title: "Follow request sent!" });
    }
  };

  const cancelRequest = async (targetId: string, requestId: string) => {
    setActionLoading(targetId);
    await (supabase as any).from("follow_requests").delete().eq("id", requestId);
    setActionLoading(null);
    setResults((prev) =>
      prev.map((r) =>
        r.user_id === targetId
          ? { ...r, followStatus: "none", followRequestId: null }
          : r
      )
    );
    toast({ title: "Follow request cancelled" });
  };

  const FollowButton = ({ result }: { result: PlayerResult }) => {
    const busy = actionLoading === result.user_id;
    if (result.followStatus === "self") return null;
    if (result.followStatus === "accepted") {
      return (
        <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
          <UserCheck className="h-3.5 w-3.5" /> Following
        </Badge>
      );
    }
    if (result.followStatus === "pending") {
      return (
        <Button size="sm" variant="outline"
          className="gap-1.5 text-muted-foreground"
          disabled={busy}
          onClick={() => cancelRequest(result.user_id, result.followRequestId!)}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
          Pending
        </Button>
      );
    }
    return (
      <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => sendFollowRequest(result.user_id)}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
        Follow
      </Button>
    );
  };

  return (
    <Layout>
      <PageHeader
        title="Player Search"
        subtitle="Find and connect with BVA members"
      />

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">

        {/* Search box */}
        <div className="rounded-xl bg-card border p-5 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 text-base h-11"
              placeholder="Search by name…"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showFilters ? "Hide filters" : "More filters (team, season)"}
            </button>
            {(nameQuery || teamQuery || seasonQuery) && (
              <button
                type="button"
                onClick={() => { setNameQuery(""); setTeamQuery(""); setSeasonQuery(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Team Name</Label>
                <Input placeholder="e.g. Spike Nation…" value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Season / League</Label>
                <Input placeholder="e.g. Winter League…" value={seasonQuery}
                  onChange={(e) => setSeasonQuery(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading && (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No players found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different name or remove filters.</p>
            </CardContent>
          </Card>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((r) => (
              <Card key={r.user_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={r.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {initials(r.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold">{r.display_name ?? "BVA Member"}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {(r.roles ?? []).slice(0, 2).map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
                          ))}
                        </div>
                        {(r.recentTeam || r.recentSeason) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {r.recentTeam && <span className="font-medium text-foreground">{r.recentTeam}</span>}
                            {r.recentTeam && r.recentSeason && " · "}
                            {r.recentSeason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <FollowButton result={r} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-10">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">Type a name above to search for BVA members.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PlayerSearch;
