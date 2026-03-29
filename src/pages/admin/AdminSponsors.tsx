import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
  active: boolean;
}

const emptySponsor = { name: "", logo_url: "", website_url: "", sort_order: 0, active: true };

const AdminSponsors = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editing, setEditing] = useState<Partial<Sponsor> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSponsors = async () => {
    const { data } = await supabase.from("sponsors").select("*").order("sort_order");
    setSponsors((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSponsors(); }, []);

  const handleSave = async () => {
    if (!editing?.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = {
      name: editing.name,
      logo_url: editing.logo_url || null,
      website_url: editing.website_url || null,
      sort_order: editing.sort_order ?? 0,
      active: editing.active ?? true,
    };

    if (editing.id) {
      const { error } = await supabase.from("sponsors").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("sponsors").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Sponsor saved!" });
    setEditing(null);
    fetchSponsors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sponsor?")) return;
    await supabase.from("sponsors").delete().eq("id", id);
    toast({ title: "Sponsor deleted" });
    fetchSponsors();
  };

  if (editing) {
    return (
      <AdminLayout>
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">{editing.id ? "Edit Sponsor" : "New Sponsor"}</h1>
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Sponsor Name</label>
              <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Website URL</label>
              <Input value={editing.website_url || ""} onChange={(e) => setEditing({ ...editing, website_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Logo</label>
              <ImageUpload value={editing.logo_url || ""} onChange={(url) => setEditing({ ...editing, logo_url: url })} folder="sponsors" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="rounded" />
              <label htmlFor="active" className="text-sm font-medium">Active (shown on website)</label>
            </div>
            <Button onClick={handleSave} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Sponsor</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Sponsors</h1>
          <Button onClick={() => setEditing(emptySponsor)}><Plus className="h-4 w-4 mr-2" /> Add Sponsor</Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sponsors.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No sponsors yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {sponsors.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {s.logo_url && <img src={s.logo_url} alt={s.name} className="w-12 h-12 object-contain rounded" />}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-sm text-muted-foreground">{s.active ? "✅ Active" : "⏸ Inactive"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSponsors;
