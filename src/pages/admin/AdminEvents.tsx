import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, X, Save, Tag, MapPin } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface LocationOption {
  id: string;
  name: string;
  city: string | null;
}

interface Event {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_id: string | null;
  category_id: string | null;
  cost: string | null;
  description: string | null;
  image_url: string | null;
  notes: string | null;
  published: boolean;
  event_categories: { name: string; color: string } | null;
  event_locations: { name: string; city: string | null } | null;
}

const emptyEvent = {
  title: "",
  date: new Date().toISOString().split("T")[0],
  end_date: "",
  start_time: "",
  end_time: "",
  location: "",
  location_id: "",
  category_id: "",
  cost: "",
  description: "",
  image_url: "",
  notes: "",
  published: true,
};

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [editing, setEditing] = useState<Partial<typeof emptyEvent & { id?: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchEvents = async () => {
    const { data } = await (supabase as any)
      .from("events")
      .select("*, event_categories(name, color), event_locations(name, city)")
      .order("date", { ascending: false });
    setEvents((data as any) ?? []);
    setLoading(false);
  };

  const fetchLookups = async () => {
    const [{ data: cats }, { data: locs }] = await Promise.all([
      (supabase as any).from("event_categories").select("id, name, color").order("name"),
      (supabase as any).from("event_locations").select("id, name, city").order("name"),
    ]);
    setCategories(cats ?? []);
    setLocationOptions(locs ?? []);
  };

  useEffect(() => {
    fetchEvents();
    fetchLookups();
  }, []);

  const logAudit = async (action: string, details: object) => {
    if (!user) return;
    await (supabase as any).from("admin_audit_logs").insert({
      user_id: user.id,
      action,
      target_path: "/admin/events",
      details,
    });
  };

  const handleSave = async () => {
    if (!editing?.title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      title: editing.title,
      date: editing.date || new Date().toISOString().split("T")[0],
      end_date: editing.end_date || null,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
      location: editing.location || null,
      location_id: editing.location_id || null,
      category_id: editing.category_id || null,
      cost: editing.cost || null,
      description: editing.description || null,
      image_url: editing.image_url || null,
      notes: editing.notes || null,
      published: editing.published ?? false,
    };

    const isEdit = !!(editing as any).id;

    if (isEdit) {
      const { error } = await (supabase as any).from("events").update(payload).eq("id", (editing as any).id);
      if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
      await logAudit("update_event", { id: (editing as any).id, title: payload.title });
    } else {
      const { error } = await (supabase as any).from("events").insert(payload);
      if (error) { toast({ title: "Error creating", description: error.message, variant: "destructive" }); return; }
      await logAudit("create_event", { title: payload.title });
    }

    toast({ title: isEdit ? "Event updated!" : "Event created!" });
    setEditing(null);
    fetchEvents();
    queryClient.invalidateQueries({ queryKey: ["events-public"] });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm("Delete this event?")) return;
    await (supabase as any).from("events").delete().eq("id", id);
    await logAudit("delete_event", { id, title });
    toast({ title: "Event deleted" });
    fetchEvents();
    queryClient.invalidateQueries({ queryKey: ["events-public"] });
  };

  const openEdit = (e: Event) => {
    setEditing({
      id: e.id,
      title: e.title,
      date: e.date,
      end_date: e.end_date ?? "",
      start_time: e.start_time ?? "",
      end_time: e.end_time ?? "",
      location: e.location ?? "",
      location_id: e.location_id ?? "",
      category_id: e.category_id ?? "",
      cost: e.cost ?? "",
      description: e.description ?? "",
      image_url: e.image_url ?? "",
      notes: e.notes ?? "",
      published: e.published,
    });
  };

  // --- Form view ---
  if (editing) {
    return (
      <AdminLayout>
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {(editing as any).id ? "Edit Event" : "New Event"}
            </h1>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Title <span className="text-destructive">*</span></label>
              <Input
                value={editing.title || ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Description</label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={4}
              />
            </div>

            {/* Start date + time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Start Date</label>
                <Input
                  type="date"
                  value={editing.date || ""}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Start Time</label>
                <Input
                  type="time"
                  value={editing.start_time || ""}
                  onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                />
              </div>
            </div>

            {/* End date + time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">End Date (optional)</label>
                <Input
                  type="date"
                  value={editing.end_date || ""}
                  onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">End Time</label>
                <Input
                  type="time"
                  value={editing.end_time || ""}
                  onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Category</label>
              <Select
                value={editing.category_id || ""}
                onValueChange={(val) => setEditing({ ...editing, category_id: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location (structured) */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Location (from list)</label>
              <Select
                value={editing.location_id || ""}
                onValueChange={(val) => setEditing({ ...editing, location_id: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a venue..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locationOptions.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}{loc.city ? ` — ${loc.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location (free text override) */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Location (free text override)</label>
              <Input
                placeholder="e.g. North Hall, CedarBridge Academy"
                value={editing.location || ""}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })}
              />
            </div>

            {/* Cost */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Cost</label>
              <Input
                placeholder="e.g. $50/person or Free"
                value={editing.cost || ""}
                onChange={(e) => setEditing({ ...editing, cost: e.target.value })}
              />
            </div>

            {/* Image */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Image</label>
              <ImageUpload
                value={editing.image_url || ""}
                onChange={(url) => setEditing({ ...editing, image_url: url })}
                folder="events"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Notes</label>
              <Textarea
                placeholder="Internal notes (not shown publicly)"
                value={editing.notes || ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Published */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={editing.published ?? false}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="published" className="text-sm font-medium">Published</label>
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" /> Save Event
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // --- List view ---
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEditing(emptyEvent)}>
              <Plus className="h-4 w-4 mr-2" /> Add Event
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/event-categories">
                <Tag className="h-4 w-4 mr-2" /> Manage Categories
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/event-locations">
                <MapPin className="h-4 w-4 mr-2" /> Manage Locations
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No events yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {events.map((e) => {
              const cat = e.event_categories;
              const loc = e.event_locations;
              return (
                <Card key={e.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    {cat && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                        title={cat.name}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{e.title}</p>
                        {cat && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}40` }}
                          >
                            {cat.name}
                          </Badge>
                        )}
                        <Badge variant={e.published ? "default" : "secondary"} className="text-xs">
                          {e.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {e.date}
                        {e.start_time ? ` at ${e.start_time}` : ""}
                        {loc ? ` · ${loc.name}${loc.city ? `, ${loc.city}` : ""}` : e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id, e.title)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
