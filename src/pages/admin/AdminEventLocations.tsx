import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, Save, X, MapPin } from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  name: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  country: "Bermuda",
  latitude: "",
  longitude: "",
  notes: "",
};

const AdminEventLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLocations = async () => {
    const { data, error } = await (supabase as any).from("event_locations").select("*").order("name");
    if (error) {
      toast({ title: "Failed to load locations", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setLocations(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const logAudit = async (action: string, details: object) => {
    if (!user) return;
    await (supabase as any).from("admin_audit_logs").insert({
      user_id: user.id,
      action,
      target_path: "/admin/event-locations",
      details,
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      address: loc.address ?? "",
      city: loc.city ?? "",
      province: loc.province ?? "",
      postal_code: loc.postal_code ?? "",
      country: loc.country ?? "Bermuda",
      latitude: loc.latitude != null ? String(loc.latitude) : "",
      longitude: loc.longitude != null ? String(loc.longitude) : "",
      notes: loc.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address || null,
      city: form.city || null,
      province: form.province || null,
      postal_code: form.postal_code || null,
      country: form.country || "Bermuda",
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await (supabase as any).from("event_locations").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Error updating location", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Location updated!" });
    } else {
      const { error } = await (supabase as any).from("event_locations").insert(payload);
      if (error) {
        toast({ title: "Error creating location", description: error.message, variant: "destructive" });
        return;
      }
      await logAudit("create_event_location", { name: payload.name });
      toast({ title: "Location created!" });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchLocations();
  };

  const handleDelete = async (loc: Location) => {
    const { data: eventsUsing } = await (supabase as any)
      .from("events")
      .select("id")
      .eq("location_id", loc.id)
      .limit(1);
    if (eventsUsing && eventsUsing.length > 0) {
      toast({
        title: "Cannot delete location",
        description: "This location is used by one or more events. Reassign those events first.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Delete location "${loc.name}"?`)) return;
    const { error } = await (supabase as any).from("event_locations").delete().eq("id", loc.id);
    if (error) {
      toast({ title: "Error deleting location", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit("delete_event_location", { id: loc.id, name: loc.name });
    toast({ title: "Location deleted" });
    fetchLocations();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Event Locations</h1>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Location
          </Button>
        </div>

        {/* Form Panel */}
        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editingId ? "Edit Location" : "New Location"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Name <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. Horseshoe Bay Beach"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Address</label>
                  <Input
                    placeholder="Street address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">City</label>
                  <Input
                    placeholder="City / Parish"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Province</label>
                  <Input
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Postal Code</label>
                  <Input
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Country</label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 32.2559"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. -64.8398"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Notes</label>
                <Textarea
                  placeholder="Parking, access instructions, etc."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" /> Save Location
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locations Table */}
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : locations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No locations yet.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Country</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {loc.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{loc.address || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{loc.city || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{loc.country || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(loc)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEventLocations;
