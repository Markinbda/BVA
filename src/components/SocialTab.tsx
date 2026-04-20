import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, UserCheck, UserMinus, UserX, Users, Search, Loader2, Check, X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FollowRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  // Joined profile info
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    roles: string[] | null;
  };
  recentTeam?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const initials = (name: string | null) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ── Component ──────────────────────────────────────────────────────────────────

const SocialTab = ({ pendingCount, onPendingChange }: {
  pendingCount: number;
  onPendingChange: (n: number) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pending, setPending] = useState<FollowRequest[]>([]);
  const [followers, setFollowers] = useState<FollowRequest[]>([]);
  const [following, setFollowing] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPending(), loadFollowers(), loadFollowing()]);
    setLoading(false);
  };

  // Load pending incoming requests
  const loadPending = async () => {
    const { data } = await (supabase as any)
      .from("follow_requests")
      .select("*")
      .eq("recipient_id", user!.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const enriched = await enrichWithProfiles(data ?? [], "requester_id");
    setPending(enriched);
    onPendingChange(enriched.length);
  };

  // Load accepted followers (people who follow me)
  const loadFollowers = async () => {
    const { data } = await (supabase as any)
      .from("follow_requests")
      .select("*")
      .eq("recipient_id", user!.id)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false });

    const enriched = await enrichWithProfiles(data ?? [], "requester_id");
    setFollowers(enriched);
  };

  // Load accepted following (people I follow)
  const loadFollowing = async () => {
    const { data } = await (supabase as any)
      .from("follow_requests")
      .select("*")
      .eq("requester_id", user!.id)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false });

    const enriched = await enrichWithProfiles(data ?? [], "recipient_id");
    setFollowing(enriched);
  };

  // Fetch profile data for a list of follow requests
  const enrichWithProfiles = async (
    requests: FollowRequest[],
    idField: "requester_id" | "recipient_id"
  ): Promise<FollowRequest[]> => {
    if (requests.length === 0) return [];
    const ids = requests.map((r) => r[idField]);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, roles")
      .in("user_id", ids);

    // Get most recent team for each user
    const { data: seasons } = await (supabase as any)
      .from("season_participation")
      .select("user_id, team_name, year")
      .in("user_id", ids)
      .order("year", { ascending: false });

    const teamMap = new Map<string, string>();
    (seasons ?? []).forEach((s: any) => {
      if (!teamMap.has(s.user_id) && s.team_name) teamMap.set(s.user_id, s.team_name);
    });

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    return requests.map((r) => ({
      ...r,
      profile: profileMap.get(r[idField]) as any ?? null,
      recentTeam: teamMap.get(r[idField]) ?? null,
    }));
  };

  // Accept a follow request
  const accept = async (req: FollowRequest) => {
    await (supabase as any)
      .from("follow_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", req.id);
    toast({ title: `You are now connected with ${req.profile?.display_name ?? "this user"}` });
    loadAll();
  };

  // Decline a follow request
  const decline = async (req: FollowRequest) => {
    await (supabase as any)
      .from("follow_requests")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", req.id);
    toast({ title: "Follow request declined" });
    loadAll();
  };

  // Unfollow (delete the accepted request)
  const unfollow = async (req: FollowRequest) => {
    if (!confirm(`Unfollow ${req.profile?.display_name ?? "this user"}?`)) return;
    await (supabase as any)
      .from("follow_requests")
      .delete()
      .eq("id", req.id);
    toast({ title: "Unfollowed" });
    loadFollowing();
  };

  // Remove a follower (delete their accepted request)
  const removeFollower = async (req: FollowRequest) => {
    if (!confirm(`Remove ${req.profile?.display_name ?? "this follower"}?`)) return;
    await (supabase as any)
      .from("follow_requests")
      .delete()
      .eq("id", req.id);
    toast({ title: "Follower removed" });
    loadFollowers();
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="requests">
      <TabsList className="mb-5 w-full sm:w-auto">
        <TabsTrigger value="requests" className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" /> Requests
          {pending.length > 0 && (
            <Badge className="ml-1 h-4 px-1.5 text-xs bg-accent text-white">{pending.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="followers" className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" /> Followers
          {followers.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">{followers.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="following" className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Following
          {following.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">{following.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Pending Requests ── */}
      <TabsContent value="requests">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold uppercase">Follow Requests</h3>
          <Link to="/players">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Find Member
            </Button>
          </Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={<Bell className="h-8 w-8" />}
            title="No pending requests"
            subtitle="When someone requests to follow you, it will appear here." />
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <PlayerCard key={req.id} req={req} idField="requester_id">
                <div className="flex gap-2 mt-3 sm:mt-0">
                  <Button size="sm" className="gap-1.5" onClick={() => accept(req)}>
                    <Check className="h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => decline(req)}>
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              </PlayerCard>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Followers ── */}
      <TabsContent value="followers">
        <div className="mb-3">
          <h3 className="font-heading text-lg font-bold uppercase">Followers</h3>
          <p className="text-sm text-muted-foreground">People who follow you.</p>
        </div>
        {followers.length === 0 ? (
          <EmptyState icon={<UserCheck className="h-8 w-8" />}
            title="No followers yet"
            subtitle="Share your profile to get followed by other BVA members." />
        ) : (
          <div className="space-y-3">
            {followers.map((req) => (
              <PlayerCard key={req.id} req={req} idField="requester_id">
                <Button size="sm" variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive mt-3 sm:mt-0"
                  onClick={() => removeFollower(req)}>
                  <UserX className="h-3.5 w-3.5" /> Remove
                </Button>
              </PlayerCard>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Following ── */}
      <TabsContent value="following">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold uppercase">Following</h3>
            <p className="text-sm text-muted-foreground">Players you follow.</p>
          </div>
          <Link to="/players">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Find Member
            </Button>
          </Link>
        </div>
        {following.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />}
            title="Not following anyone yet"
            subtitle="Use Player Search to find and follow other BVA members." />
        ) : (
          <div className="space-y-3">
            {following.map((req) => (
              <PlayerCard key={req.id} req={req} idField="recipient_id">
                <Button size="sm" variant="outline"
                  className="gap-1.5 mt-3 sm:mt-0"
                  onClick={() => unfollow(req)}>
                  <UserMinus className="h-3.5 w-3.5" /> Unfollow
                </Button>
              </PlayerCard>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const PlayerCard = ({
  req,
  idField,
  children,
}: {
  req: FollowRequest;
  idField: "requester_id" | "recipient_id";
  children: React.ReactNode;
}) => {
  const targetId = req[idField];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarImage src={req.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {initials(req.profile?.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{req.profile?.display_name ?? "BVA Member"}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {(req.profile?.roles ?? []).slice(0, 2).map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                ))}
                {req.recentTeam && (
                  <span className="text-muted-foreground">· {req.recentTeam}</span>
                )}
              </div>
            </div>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <Card className="border-dashed">
    <CardContent className="py-10 text-center">
      <div className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40 flex items-center justify-center">{icon}</div>
      <p className="font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </CardContent>
  </Card>
);

export default SocialTab;
