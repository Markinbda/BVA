import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Trophy, Loader2, Search } from "lucide-react";

interface SeasonEntry {
  id: string;
  user_id: string;
  family_member_id: string | null;
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
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
}

const FORMATS = ["Indoor", "Beach", "Grass"];
const PLACEMENTS = [
  { label: "1st Place 🥇", value: 1 },
  { label: "2nd Place 🥈", value: 2 },
  { label: "3rd Place 🥉", value: 3 },
  { label: "4th", value: 4 },
  { label: "5th", value: 5 },
  { label: "Other", value: 0 },
];

const emptyForm = {
  user_id: "",
  family_member_id: "",
  season_name: "",
  year: new Date().getFullYear(),
  format: "Indoor",
  team_name: "",
  division: "",
  placement: 0,
  roster: "",   // JSON string
  coach_notes: "",
  awards: "",
};

const AdminSeasons = () => {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<SeasonEntry[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SeasonEntry | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [seasonsRes, profilesRes] = await Promise.all([
      (supabase as any).from("season_participation").select("*").order("year", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    setSeasons((seasonsRes.data ?? []).map((s: any) => ({
      ...s,
      roster: s.roster ?? [],
      match_results: s.match_results ?? [],
    })));
    setProfiles(profilesRes.data ?? []);
    setLoading(false);
  };

  const userName = (uid: string) =>
    profiles.find((p) => p.user_id === uid)?.display_name ?? uid.slice(0, 8) + "…";

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (s: SeasonEntry) => {
    setEditing(s);
    setForm({
      user_id: s.user_id,
      family_member_id: s.family_member_id ?? "",
      season_name: s.season_name,
      year: s.year,
      format: s.format,
      team_name: s.team_name ?? "",
      division: s.division ?? "",
      placement: s.placement ?? 0,
      roster: JSON.stringify(s.roster, null, 2),
      coach_notes: s.coach_notes ?? "",
      awards: s.awards ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.season_name || !form.year) {
      toast({ title: "User, season name and year are required", variant: "destructive" });
      return;
    }
    let roster: any[] = [];
    try {
      roster = form.roster ? JSON.parse(form.roster) : [];
    } catch {
      toast({ title: "Roster JSON is invalid", variant: "destructive" });
      return;
    }

    const payload = {
      user_id: form.user_id,
      family_member_id: form.family_member_id || null,
      season_name: form.season_name,
      year: form.year,
      format: form.format,
      team_name: form.team_name || null,
      division: form.division || null,
      placement: form.placement || null,
      roster,
      coach_notes: form.coach_notes || null,
      awards: form.awards || null,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    if (editing) {
      await (supabase as any).from("season_participation").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("season_participation").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    loadAll();
    toast({ title: editing ? "Season updated" : "Season added" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this season entry?")) return;
    await (supabase as any).from("season_participation").delete().eq("id", id);
    loadAll();
    toast({ title: "Season deleted" });
  };

  const filtered = seasons.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.season_name.toLowerCase().includes(q) ||
      (s.team_name ?? "").toLowerCase().includes(q) ||
      userName(s.user_id).toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Season History</h1>
            <p className="text-muted-foreground">Manage member season participation records, placements and rosters.</p>
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Season Entry
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by member, season, team…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground">No season entries found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Season</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{userName(s.user_id)}</td>
                    <td className="px-4 py-3">{s.season_name}</td>
                    <td className="px-4 py-3">{s.year}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{s.format}</Badge>
                    </td>
                    <td className="px-4 py-3">{s.team_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {s.placement === 1 ? "🥇 1st" : s.placement === 2 ? "🥈 2nd" : s.placement === 3 ? "🥉 3rd" : s.placement ? `#${s.placement}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">
              {editing ? "Edit Season Entry" : "Add Season Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Member *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm((p) => ({ ...p, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member…" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.display_name ?? p.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Season Name *</Label>
                <Input placeholder="e.g. Winter League" value={form.season_name}
                  onChange={(e) => setForm((p) => ({ ...p, season_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Year *</Label>
                <Input type="number" value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm((p) => ({ ...p, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Placement</Label>
                <Select value={String(form.placement)} onValueChange={(v) => setForm((p) => ({ ...p, placement: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Select placement…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No placement</SelectItem>
                    {PLACEMENTS.map((p) => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Team Name</Label>
                <Input value={form.team_name} onChange={(e) => setForm((p) => ({ ...p, team_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Division</Label>
                <Input placeholder="e.g. Open, Recreational…" value={form.division}
                  onChange={(e) => setForm((p) => ({ ...p, division: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Roster (JSON array)</Label>
              <Textarea rows={4} placeholder={'[{"name": "Alice", "role": "Setter"}, {"name": "Bob"}]'}
                value={form.roster} onChange={(e) => setForm((p) => ({ ...p, roster: e.target.value }))}
                className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Each item: {`{ "name": "...", "role": "..." }`}</p>
            </div>

            <div className="space-y-1">
              <Label>Awards</Label>
              <Input placeholder="e.g. MVP, Most Improved…" value={form.awards}
                onChange={(e) => setForm((p) => ({ ...p, awards: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Coach / Organiser Notes</Label>
              <Textarea rows={2} value={form.coach_notes}
                onChange={(e) => setForm((p) => ({ ...p, coach_notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSeasons;
