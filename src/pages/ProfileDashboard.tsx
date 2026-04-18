import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User, Mail, Phone, MapPin, Calendar, Edit2, Plus, Trash2,
  Camera, Trophy, Users, Shield, ChevronRight, Lock, Loader2, Heart, ClipboardList,
} from "lucide-react";
import SocialTab from "@/components/SocialTab";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  roles: string[] | null;
  volleyball_formats: string[] | null;
  team_formats: string[] | null;
  medical_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  experience_level: string | null;
  photo_consent: boolean | null;
}

interface FamilyMember {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  role: string | null;
  notes: string | null;
}

interface Season {
  id: string;
  season_name: string;
  year: number;
  format: string;
  team_name: string | null;
  division: string | null;
  placement: number | null;
  roster: { name: string; role?: string }[];
  match_results: { opponent: string; score: string }[];
  coach_notes: string | null;
  awards: string | null;
  family_member_id: string | null;
}

interface LinkedPlayerRecord {
  id: string;
  first_name: string;
  last_name: string;
  team: string | null;
  volleyball_position: string | null;
}

interface PlayerPastHistory {
  id: string;
  player_id: string;
  team_name: string;
  team_members: string[];
  event_name: string;
  event_format: "Indoor" | "Beach" | null;
  event_date: string | null;
  event_location: string | null;
  event_image_urls: string[];
  placement: number | null;
  result_notes: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLES = ["Parent / Guardian", "Player", "Coach", "Volunteer / Helper"];
const FORMATS = ["Indoor", "Beach", "Grass"];
const TEAM_FORMATS = ["Twos (2v2)", "Fours (4v4)", "Sixes (6v6)", "Any / All Formats"];
const EXPERIENCE_LEVELS = ["Beginner", "Recreational", "Intermediate", "Competitive", "Advanced"];
const MEMBER_ROLES = ["Player", "Parent / Guardian", "Coach", "Volunteer"];

// ── Medal helper ───────────────────────────────────────────────────────────────

const Medal = ({ placement }: { placement: number | null }) => {
  if (!placement) return null;
  if (placement === 1) return <span className="text-xl" title="1st Place">🥇</span>;
  if (placement === 2) return <span className="text-xl" title="2nd Place">🥈</span>;
  if (placement === 3) return <span className="text-xl" title="3rd Place">🥉</span>;
  return <span className="text-xs text-muted-foreground font-medium">#{placement}</span>;
};

const placementLabel = (p: number | null) => {
  if (!p) return null;
  if (p === 1) return "1st Place";
  if (p === 2) return "2nd Place";
  if (p === 3) return "3rd Place";
  return `${p}th Place`;
};

const formatColor: Record<string, string> = {
  Indoor: "bg-blue-100 text-blue-700",
  Beach: "bg-yellow-100 text-yellow-700",
  Grass: "bg-green-100 text-green-700",
};

// ── Toggle helper ──────────────────────────────────────────────────────────────

const toggle = (arr: string[], val: string) =>
  arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

// ── Main Component ─────────────────────────────────────────────────────────────

const ProfileDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [linkedPlayers, setLinkedPlayers] = useState<LinkedPlayerRecord[]>([]);
  const [pastHistory, setPastHistory] = useState<PlayerPastHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFollows, setPendingFollows] = useState(0);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [memberForm, setMemberForm] = useState({ full_name: "", date_of_birth: "", role: "", notes: "" });

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadFamily(), loadSeasons(), loadLinkedPlayerData()]);
    setLoading(false);
  };

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .single();
    if (data) setProfile(data as unknown as Profile);
  };

  const loadFamily = async () => {
    const { data } = await (supabase as any)
      .from("family_members")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at");
    setFamily(data ?? []);
  };

  const loadSeasons = async () => {
    const { data } = await (supabase as any)
      .from("season_participation")
      .select("*")
      .eq("user_id", user!.id)
      .order("year", { ascending: false })
      .order("season_name");
    setSeasons((data ?? []).map((s: any) => ({
      ...s,
      roster: s.roster ?? [],
      match_results: s.match_results ?? [],
    })));
  };

  const loadLinkedPlayerData = async () => {
    if (!user?.email) return;
    const { data: playersData, error: playersError } = await (supabase as any)
      .rpc("get_players_by_email_normalized", { p_email: user.email });

    if (playersError) {
      toast({ title: "Failed to load linked player profile", description: playersError.message, variant: "destructive" });
      return;
    }

    const players: LinkedPlayerRecord[] = (playersData ?? []).sort((a: LinkedPlayerRecord, b: LinkedPlayerRecord) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    );
    setLinkedPlayers(players);

    const playerIds = players.map((player) => player.id);
    if (playerIds.length === 0) {
      setPastHistory([]);
      return;
    }

    const { data: historyData, error: historyError } = await (supabase as any)
      .from("player_past_history")
      .select("id, player_id, team_name, team_members, event_name, event_format, event_date, event_location, event_image_urls, event_image_url, placement, result_notes")
      .in("player_id", playerIds)
      .order("event_date", { ascending: false });

    if (historyError) {
      toast({ title: "Failed to load player history", description: historyError.message, variant: "destructive" });
      return;
    }

    setPastHistory((historyData ?? []).map((item: any) => ({
      ...item,
      team_members: Array.isArray(item.team_members) ? item.team_members : [],
      event_image_urls: Array.isArray(item.event_image_urls)
        ? item.event_image_urls.slice(0, 4).filter((url: string) => typeof url === "string" && url.trim().length > 0)
        : (item.event_image_url ? [item.event_image_url] : []),
    })));
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || file.type.split("/").pop() || "jpg";
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("bva-images")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Avatar upload failed", description: uploadError.message, variant: "destructive" });
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("bva-images").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl;
    await supabase.from("profiles").update({ avatar_url: avatarUrl } as any).eq("user_id", user.id);
    setProfile((p) => p ? { ...p, avatar_url: avatarUrl } : p);
    setAvatarUploading(false);
    toast({ title: "Profile photo updated" });
  };

  // ── Save profile ───────────────────────────────────────────────────────────

  const openEditProfile = () => {
    setEditForm({ ...profile });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(editForm as any)
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setProfile((p) => p ? { ...p, ...editForm } : p);
      setEditOpen(false);
      toast({ title: "Profile updated" });
    }
  };

  // ── Change password ────────────────────────────────────────────────────────

  const savePassword = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.next.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
    setSaving(false);
    if (error) {
      toast({ title: "Password change failed", description: error.message, variant: "destructive" });
    } else {
      setPasswordOpen(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password updated successfully" });
    }
  };

  // ── Family members ─────────────────────────────────────────────────────────

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({ full_name: "", date_of_birth: "", role: "", notes: "" });
    setFamilyOpen(true);
  };

  const openEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setMemberForm({
      full_name: m.full_name,
      date_of_birth: m.date_of_birth ?? "",
      role: m.role ?? "",
      notes: m.notes ?? "",
    });
    setFamilyOpen(true);
  };

  const saveMember = async () => {
    if (!memberForm.full_name.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editingMember) {
      await (supabase as any)
        .from("family_members")
        .update({ ...memberForm, updated_at: new Date().toISOString() })
        .eq("id", editingMember.id);
    } else {
      await (supabase as any)
        .from("family_members")
        .insert({ ...memberForm, user_id: user!.id });
    }
    setSaving(false);
    setFamilyOpen(false);
    loadFamily();
    toast({ title: editingMember ? "Family member updated" : "Family member added" });
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    await (supabase as any).from("family_members").delete().eq("id", id);
    loadFamily();
    toast({ title: "Family member removed" });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const initials = (name: string | null) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const seasonsByYear = seasons.reduce<Record<number, Season[]>>((acc, s) => {
    (acc[s.year] = acc[s.year] || []).push(s);
    return acc;
  }, {});

  const historyByPlayer = pastHistory.reduce<Record<string, PlayerPastHistory[]>>((acc, row) => {
    (acc[row.player_id] = acc[row.player_id] || []).push(row);
    return acc;
  }, {});

  const totalGolds =
    seasons.filter((s) => s.placement === 1).length +
    pastHistory.filter((h) => h.placement === 1).length;

  const totalPodiums =
    seasons.filter((s) => s.placement && s.placement <= 3).length +
    pastHistory.filter((h) => h.placement && h.placement <= 3).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ── Hero header ── */}
      <div className="bg-primary pb-6 pt-10 text-primary-foreground">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 ring-4 ring-white/30">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-accent text-2xl font-bold text-white">
                  {initials(profile?.display_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow hover:bg-accent/80 transition-colors"
                title="Change photo"
              >
                {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 sm:justify-start">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="border-white/30 bg-white text-primary hover:bg-white/90"
              >
                Upload Photo
              </Button>
            </div>

            {/* Name & info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">
                {profile?.display_name || user?.email}
              </h1>
              <p className="mt-1 text-primary-foreground/60 text-sm">{user?.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {(profile?.roles ?? []).map((r) => (
                  <Badge key={r} className="bg-accent/30 text-primary-foreground border-0 text-xs">{r}</Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={openEditProfile}>
                <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
              </Button>
              <Button size="sm" variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setPasswordOpen(true)}>
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Password
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-1 bg-accent" />

      {/* ── Tabs ── */}
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue="profile">
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <TabsList className="flex-wrap h-auto w-full sm:w-auto">
              <TabsTrigger value="profile" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Family
                {family.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">{family.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="seasons" className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Season History
                {seasons.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">{seasons.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" /> Social
                {pendingFollows > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-xs bg-accent text-white">{pendingFollows}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <button
              onClick={() => navigate("/my-notes")}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors shrink-0"
            >
              <ClipboardList className="h-4 w-4 text-primary" />
              My Coach Notes
            </button>
          </div>

          {/* ─────────────────────────────────── Profile tab ── */}
          <TabsContent value="profile" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">

              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                    <User className="h-4 w-4 text-accent" /> Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={profile?.display_name} />
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date of Birth"
                    value={profile?.date_of_birth ? `${new Date(profile.date_of_birth).toLocaleDateString()} (age ${getAge(profile.date_of_birth)})` : null} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile?.phone} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={profile?.address} />
                </CardContent>
              </Card>

              {/* Emergency & Medical */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                    <Shield className="h-4 w-4 text-accent" /> Emergency &amp; Medical
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Emergency Contact" value={profile?.emergency_contact_name} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Emergency Phone" value={profile?.emergency_contact_phone} />
                  <InfoRow icon={<Shield className="h-4 w-4" />} label="Medical Notes"
                    value={profile?.medical_notes || "None provided"} />
                </CardContent>
              </Card>

              {/* Volleyball Preferences */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                    <Trophy className="h-4 w-4 text-accent" /> Volleyball Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formats</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(profile?.volleyball_formats ?? []).length > 0
                        ? (profile?.volleyball_formats ?? []).map((f) => (
                            <span key={f} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${formatColor[f] ?? "bg-muted text-foreground"}`}>{f}</span>
                          ))
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team Sizes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(profile?.team_formats ?? []).length > 0
                        ? (profile?.team_formats ?? []).map((f) => (
                            <Badge key={f} variant="secondary">{f}</Badge>
                          ))
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience Level</p>
                    <Badge variant="outline">{profile?.experience_level || "Not set"}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Quick stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                    <Trophy className="h-4 w-4 text-accent" /> Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <StatBox label="Seasons Played" value={seasons.length} />
                  <StatBox label="Family Members" value={family.length} />
                  <StatBox label="Gold Medals" value={totalGolds} emoji="🥇" />
                  <StatBox label="Podium Finishes" value={totalPodiums} emoji="🏆" />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                    <Users className="h-4 w-4 text-accent" /> Linked Player Team Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {linkedPlayers.length === 0 ? (
                    <p className="text-muted-foreground">
                      No player roster is currently linked to your account email.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {linkedPlayers.map((player) => (
                        <div key={player.id} className="rounded-md border p-3">
                          <p className="font-medium text-foreground">{player.first_name} {player.last_name}</p>
                          <p className="text-muted-foreground">
                            Team: {player.team || "Not assigned"}
                            {player.volleyball_position ? ` · Position: ${player.volleyball_position}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1">
                    <Button size="sm" onClick={() => navigate("/player")} className="gap-2">
                      <ClipboardList className="h-4 w-4" /> View Video Footage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button onClick={openEditProfile} size="lg" className="gap-2 px-8">
                <Edit2 className="h-4 w-4" /> Edit Profile
              </Button>
            </div>
          </TabsContent>

          {/* ─────────────────────────────────── Family tab ── */}
          <TabsContent value="family">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold uppercase">Family Members</h2>
                <p className="text-sm text-muted-foreground">Manage linked family members and their participation.</p>
              </div>
              <Button onClick={openAddMember} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Member
              </Button>
            </div>

            {family.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">No family members added yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add family members to track their participation.</p>
                  <Button onClick={openAddMember} variant="outline" className="mt-4 gap-1.5">
                    <Plus className="h-4 w-4" /> Add Family Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {family.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                              {initials(m.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{m.full_name}</p>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {m.role && <Badge variant="secondary" className="text-xs">{m.role}</Badge>}
                              {m.date_of_birth && (
                                <span className="text-xs text-muted-foreground">
                                  Age {getAge(m.date_of_birth)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditMember(m)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeMember(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {m.notes && <p className="mt-2 text-xs text-muted-foreground">{m.notes}</p>}
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">
                          Seasons:{" "}
                          <span className="font-medium text-foreground">
                            {seasons.filter((s) => s.family_member_id === m.id).length}
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─────────────────────────────────── Seasons tab ── */}
          <TabsContent value="seasons">
            <div className="mb-4">
              <h2 className="font-heading text-xl font-bold uppercase">Season History</h2>
              <p className="text-sm text-muted-foreground">Your full volleyball participation history, organised by year.</p>
            </div>

            {seasons.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">No season history yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your participation history will appear here once seasons are recorded by BVA administrators.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(seasonsByYear)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([year, yearSeasons]) => (
                    <div key={year}>
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="font-heading text-lg font-bold text-primary">{year}</h3>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-sm text-muted-foreground">{yearSeasons.length} season{yearSeasons.length !== 1 ? "s" : ""}</span>
                      </div>
                      <Accordion type="multiple" className="space-y-2">
                        {yearSeasons.map((s) => (
                          <AccordionItem key={s.id} value={s.id} className="rounded-xl border bg-card px-0 shadow-sm overflow-hidden">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                              <div className="flex flex-1 items-center gap-3 text-left">
                                <Medal placement={s.placement} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold">{s.season_name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${formatColor[s.format] ?? "bg-muted text-foreground"}`}>
                                      {s.format}
                                    </span>
                                    {s.division && <Badge variant="outline" className="text-xs">{s.division}</Badge>}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    {s.team_name && <span>Team: <span className="font-medium text-foreground">{s.team_name}</span></span>}
                                    {s.placement && (
                                      <span className="font-medium text-foreground">{placementLabel(s.placement)}</span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="border-t bg-muted/20 px-4 pb-4 pt-3">
                              <div className="grid gap-4 sm:grid-cols-2">
                                {/* Team Roster */}
                                {s.roster.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team Roster</p>
                                    <ul className="space-y-1">
                                      {s.roster.map((r, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                          <span>{r.name}</span>
                                          {r.role && <Badge variant="outline" className="text-xs">{r.role}</Badge>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Match Results */}
                                {s.match_results.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match Results</p>
                                    <ul className="space-y-1">
                                      {s.match_results.map((r, i) => (
                                        <li key={i} className="flex items-center justify-between text-sm">
                                          <span>vs. {r.opponent}</span>
                                          <Badge variant="secondary">{r.score}</Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Awards */}
                                {s.awards && (
                                  <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Awards</p>
                                    <p className="text-sm">🏆 {s.awards}</p>
                                  </div>
                                )}

                                {/* Coach Notes */}
                                {s.coach_notes && (
                                  <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coach Notes</p>
                                    <p className="text-sm text-muted-foreground italic">"{s.coach_notes}"</p>
                                  </div>
                                )}

                                {/* Family member tag */}
                                {s.family_member_id && (
                                  <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participant</p>
                                    <Badge variant="secondary">
                                      {family.find((f) => f.id === s.family_member_id)?.full_name ?? "Family Member"}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ))}

                {linkedPlayers.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <h3 className="font-heading text-lg font-bold text-primary">Coach-Recorded Past Events</h3>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground">{pastHistory.length} entries</span>
                    </div>

                    <div className="space-y-3">
                      {pastHistory.length === 0 && (
                        <Card className="border-dashed">
                          <CardContent className="py-6 text-sm text-muted-foreground">
                            No past team or event history has been added by your coach yet.
                          </CardContent>
                        </Card>
                      )}
                      {linkedPlayers.map((player) => {
                        const rows = historyByPlayer[player.id] ?? [];
                        if (rows.length === 0) return null;
                        return (
                          <Card key={player.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">
                                {player.first_name} {player.last_name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {rows.map((row) => (
                                <div key={row.id} className="rounded-md border p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-foreground flex items-center gap-2">
                                        <Medal placement={row.placement} />
                                        {row.event_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Team: {row.team_name}
                                        {row.event_format ? ` · ${row.event_format}` : ""}
                                        {row.event_date ? ` · ${new Date(row.event_date).toLocaleDateString()}` : ""}
                                        {row.event_location ? ` · ${row.event_location}` : ""}
                                      </p>
                                      {row.event_image_urls.length > 0 ? (
                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                          {row.event_image_urls.map((imageUrl, index) => (
                                            <img
                                              key={`${row.id}-image-${index}`}
                                              src={imageUrl}
                                              alt={`${row.event_name} ${index + 1}`}
                                              className="h-24 w-full rounded-md border object-cover"
                                            />
                                          ))}
                                        </div>
                                      ) : null}
                                      {row.team_members.length > 0 ? (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Team Members: {row.team_members.join(", ")}
                                        </p>
                                      ) : null}
                                      {row.result_notes ? (
                                        <p className="text-xs italic text-muted-foreground mt-1">"{row.result_notes}"</p>
                                      ) : null}
                                    </div>
                                    {row.placement ? (
                                      <Badge variant="outline">{placementLabel(row.placement)}</Badge>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─────────────────────────────────── Social tab ── */}
          <TabsContent value="social">
            <SocialTab
              pendingCount={pendingFollows}
              onPendingChange={setPendingFollows}
            />
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Edit Profile Modal ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">

            {/* Personal */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Personal Information</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Full Name" id="ep-name">
                  <Input id="ep-name" value={editForm.display_name ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, display_name: e.target.value }))} />
                </FormField>
                <FormField label="Date of Birth" id="ep-dob">
                  <Input id="ep-dob" type="date" value={editForm.date_of_birth ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
                </FormField>
                <FormField label="Phone" id="ep-phone">
                  <Input id="ep-phone" type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Address" id="ep-address">
                    <Textarea id="ep-address" rows={2} value={editForm.address ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                  </FormField>
                </div>
              </div>
            </section>

            {/* Roles */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Areas of Interest</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <CheckItem key={r} label={r}
                    checked={(editForm.roles ?? []).includes(r)}
                    onChange={() => setEditForm((p) => ({ ...p, roles: toggle(p.roles ?? [], r) }))} />
                ))}
              </div>
            </section>

            {/* Formats */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Volleyball Formats</h3>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <CheckItem key={f} label={f}
                    checked={(editForm.volleyball_formats ?? []).includes(f)}
                    onChange={() => setEditForm((p) => ({ ...p, volleyball_formats: toggle(p.volleyball_formats ?? [], f) }))} />
                ))}
              </div>
            </section>

            {/* Team formats */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Team Sizes</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {TEAM_FORMATS.map((f) => (
                  <CheckItem key={f} label={f}
                    checked={(editForm.team_formats ?? []).includes(f)}
                    onChange={() => setEditForm((p) => ({ ...p, team_formats: toggle(p.team_formats ?? [], f) }))} />
                ))}
              </div>
            </section>

            {/* Experience */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Experience Level</h3>
              <RadioGroup value={editForm.experience_level ?? ""} onValueChange={(v) => setEditForm((p) => ({ ...p, experience_level: v }))} className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((l) => (
                  <label key={l} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent/10 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                    <RadioGroupItem value={l} />
                    {l}
                  </label>
                ))}
              </RadioGroup>
            </section>

            {/* Emergency & Medical */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Emergency &amp; Medical</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Emergency Contact Name" id="ep-ecname">
                  <Input id="ep-ecname" value={editForm.emergency_contact_name ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, emergency_contact_name: e.target.value }))} />
                </FormField>
                <FormField label="Emergency Contact Phone" id="ep-ecphone">
                  <Input id="ep-ecphone" type="tel" value={editForm.emergency_contact_phone ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, emergency_contact_phone: e.target.value }))} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Medical / Accessibility Notes" id="ep-medical">
                    <Textarea id="ep-medical" rows={2} value={editForm.medical_notes ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, medical_notes: e.target.value }))} />
                  </FormField>
                </div>
              </div>
            </section>

            {/* Photo consent */}
            <CheckItem
              label="I consent to photos/videos being used for BVA promotional purposes"
              checked={editForm.photo_consent ?? false}
              onChange={() => setEditForm((p) => ({ ...p, photo_consent: !p.photo_consent }))} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Modal ── */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="New Password" id="pw-new">
              <Input id="pw-new" type="password" value={passwordForm.next}
                onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} />
            </FormField>
            <FormField label="Confirm New Password" id="pw-confirm">
              <Input id="pw-confirm" type="password" value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button onClick={savePassword} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Family Member Modal ── */}
      <Dialog open={familyOpen} onOpenChange={setFamilyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">
              {editingMember ? "Edit Family Member" : "Add Family Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Full Name *" id="fm-name">
              <Input id="fm-name" value={memberForm.full_name}
                onChange={(e) => setMemberForm((p) => ({ ...p, full_name: e.target.value }))} />
            </FormField>
            <FormField label="Date of Birth" id="fm-dob">
              <Input id="fm-dob" type="date" value={memberForm.date_of_birth}
                onChange={(e) => setMemberForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
            </FormField>
            <div className="space-y-1">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-2">
                {MEMBER_ROLES.map((r) => (
                  <label key={r} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/10 ${memberForm.role === r ? "border-accent bg-accent/10" : ""}`}>
                    <input type="radio" className="hidden" checked={memberForm.role === r} onChange={() => setMemberForm((p) => ({ ...p, role: r }))} />
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <FormField label="Notes" id="fm-notes">
              <Textarea id="fm-notes" rows={2} placeholder="Any relevant notes…"
                value={memberForm.notes}
                onChange={(e) => setMemberForm((p) => ({ ...p, notes: e.target.value }))} />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFamilyOpen(false)}>Cancel</Button>
            <Button onClick={saveMember} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingMember ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// ── Small helper components ────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-start gap-2.5">
    <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || <span className="text-muted-foreground italic text-xs">Not provided</span>}</p>
    </div>
  </div>
);

const StatBox = ({ label, value, emoji }: { label: string; value: number; emoji?: string }) => (
  <div className="rounded-lg bg-muted/50 p-3 text-center">
    <p className="text-2xl font-bold text-primary">{emoji ? `${emoji} ` : ""}{value}</p>
    <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
  </div>
);

const FormField = ({ label, id, children }: { label: string; id: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

const CheckItem = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm hover:bg-accent/10 has-[:checked]:border-accent has-[:checked]:bg-accent/10 transition-colors">
    <Checkbox checked={checked} onCheckedChange={onChange} />
    {label}
  </label>
);

export default ProfileDashboard;
