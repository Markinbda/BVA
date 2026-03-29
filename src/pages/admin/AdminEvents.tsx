import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  location: string | null;
  cost: string | null;
  description: string | null;
  image_url: string | null;
  published: boolean;
}

const emptyEvent = { title: "", date: new Date().toISOString().split("T")[0], end_date: "", location: "", cost: "", description: "", image_url: "", published: false };

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("date", { ascending: false });
    setEvents((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSave = async () => {
    if (!editing?.title) { toast({ title: "Title is required", variant: "destructive" }); return; }

    const payload = {
      title: editing.title,
      date: editing.date || new Date().toISOString().split("T")[0],
      end_date: editing.end_date || null,
      location: editing.location || null,
      cost: editing.cost || null,
      description: editing.description || null,
      image_url: editing.image_url || null,
      published: editing.published ?? false,
    };

    if (editing.id) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) { toast({ title: "Error creating", description: error.message, variant: "destructive" }); return; }
    }

    toast({ title: editing.id ? "Event updated!" : "Event created!" });
    setEditing(null);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "Event deleted" });
    fetchEvents();
  };

  if (editing) {
    return (
      <AdminLayout>
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">{editing.id ? "Edit Event" : "New Event"}</h1>
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Title</label>
              <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Start Date</label>
                <Input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">End Date (optional)</label>
                <Input type="date" value={editing.end_date || ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Location</label>
                <Input value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Cost</label>
                <Input value={editing.cost || ""} onChange={(e) => setEditing({ ...editing, cost: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Description</label>
              <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={5} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Image</label>
              <ImageUpload value={editing.image_url || ""} onChange={(url) => setEditing({ ...editing, image_url: url })} folder="events" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="published" checked={editing.published ?? false} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="rounded" />
              <label htmlFor="published" className="text-sm font-medium">Published</label>
            </div>
            <Button onClick={handleSave} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Event</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <Button onClick={() => setEditing(emptyEvent)}><Plus className="h-4 w-4 mr-2" /> Add Event</Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No events yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{e.title}</p>
                    <p className="text-sm text-muted-foreground">{e.date}{e.location ? ` · ${e.location}` : ""} · {e.published ? "✅ Published" : "📝 Draft"}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminEvents;
