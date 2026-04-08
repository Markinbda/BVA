import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";

interface Slide {
  id: string;
  sort_order: number;
  title: string;
  subtitle: string;
  description: string;
  link: string;
  image_url: string;
  enabled: boolean;
}

const emptySlide = (): Omit<Slide, "id"> => ({
  sort_order: 0,
  title: "",
  subtitle: "",
  description: "",
  link: "/",
  image_url: "",
  enabled: true,
});

const AdminHeroSlides = () => {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySlide());
  const [saving, setSaving] = useState(false);

  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("hero_slides")
      .select("*")
      .order("sort_order");
    if (error) toast({ title: "Failed to load slides", description: error.message, variant: "destructive" });
    setSlides(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  const openAdd = () => {
    setEditingId(null);
    const maxOrder = slides.reduce((m, s) => Math.max(m, s.sort_order), 0);
    setForm({ ...emptySlide(), sort_order: maxOrder + 1 });
    setDialogOpen(true);
  };

  const openEdit = (slide: Slide) => {
    setEditingId(slide.id);
    setForm({ ...slide });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    let error;
    if (editingId) {
      ({ error } = await (supabase as any)
        .from("hero_slides")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("hero_slides").insert(form));
    }
    if (error) {
      toast({ title: "Failed to save slide", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Slide updated" : "Slide added" });
      setDialogOpen(false);
      fetchSlides();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete slide "${title}"?`)) return;
    const { error } = await (supabase as any).from("hero_slides").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slide deleted" });
      setSlides((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const toggleEnabled = async (slide: Slide) => {
    const { error } = await (supabase as any)
      .from("hero_slides")
      .update({ enabled: !slide.enabled, updated_at: new Date().toISOString() })
      .eq("id", slide.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      setSlides((prev) => prev.map((s) => s.id === slide.id ? { ...s, enabled: !s.enabled } : s));
    }
  };

  const moveSlide = async (id: string, direction: "up" | "down") => {
    const idx = slides.findIndex((s) => s.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= slides.length) return;

    const a = slides[idx];
    const b = slides[swapIdx];
    const newOrderA = b.sort_order;
    const newOrderB = a.sort_order;

    await Promise.all([
      (supabase as any).from("hero_slides").update({ sort_order: newOrderA }).eq("id", a.id),
      (supabase as any).from("hero_slides").update({ sort_order: newOrderB }).eq("id", b.id),
    ]);
    fetchSlides();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Homepage Slider</h1>
            <p className="text-sm text-muted-foreground">
              Manage the hero slider images and text on the homepage
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Slide
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : slides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No slides yet. Click Add Slide to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <Card key={slide.id} className={slide.enabled ? "" : "opacity-60"}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Order controls */}
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveSlide(slide.id, "up")}
                        disabled={idx === 0}
                      >▲</button>
                      <span className="text-xs font-mono text-muted-foreground">{slide.sort_order}</span>
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveSlide(slide.id, "down")}
                        disabled={idx === slides.length - 1}
                      >▼</button>
                    </div>

                    {/* Image preview */}
                    <div className="shrink-0 w-28 h-16 rounded overflow-hidden bg-muted border border-border flex items-center justify-center">
                      {slide.image_url ? (
                        <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground text-center px-1">No image</span>
                      )}
                    </div>

                    {/* Text info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{slide.title}</span>
                        {slide.subtitle && (
                          <span className="text-muted-foreground">/ {slide.subtitle}</span>
                        )}
                        {!slide.enabled && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{slide.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{slide.link}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleEnabled(slide)}
                        title={slide.enabled ? "Hide slide" : "Show slide"}
                      >
                        {slide.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(slide)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(slide.id, slide.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Slide" : "Add Slide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Slide Image</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                folder="hero-slides"
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="mt-2 w-full h-40 object-cover rounded-lg border border-border"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g. Beach, Grass & Indoor"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Subtitle</Label>
                <Input
                  placeholder="e.g. Tournaments"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="Short description shown beneath the title"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Link (page to open)</Label>
                <Input
                  placeholder="/leagues"
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
              <Label htmlFor="enabled">Show this slide on the homepage</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminHeroSlides;
