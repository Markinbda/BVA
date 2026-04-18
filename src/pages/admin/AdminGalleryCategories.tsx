import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown } from "lucide-react";

interface GalleryCategory {
  id: string;
  name: string;
  sort_order: number;
}

const AdminGalleryCategories = () => {
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetch = async () => {
    const { data, error } = await (supabase as any)
      .from("gallery_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load gallery categories", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const maxOrder = categories.length ? Math.max(...categories.map(c => c.sort_order)) : -1;
    const { error } = await (supabase as any).from("gallery_categories").insert({ name, sort_order: maxOrder + 1 });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category added" });
    setNewName("");
    setAdding(false);
    fetch();
  };

  const handleSaveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("gallery_categories").update({ name }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // Also update category text in gallery_photos for consistency
    const original = categories.find(c => c.id === id)?.name;
    if (original && original !== name) {
      await (supabase as any).from("gallery_photos").update({ category: name }).eq("category", original);
    }
    toast({ title: "Category updated" });
    setEditingId(null);
    fetch();
  };

  const handleDelete = async (cat: GalleryCategory) => {
    const { data: photos } = await (supabase as any)
      .from("gallery_photos").select("id", { count: "exact", head: true }).eq("category", cat.name);
    const count = (photos as any)?.length ?? 0;
    if (!confirm(`Delete "${cat.name}"?${count > 0 ? `\n\nThis category has photos — they will keep the category label but it won't appear in the dropdown.` : ""}`)) return;
    const { error } = await (supabase as any).from("gallery_categories").delete().eq("id", cat.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category deleted" });
    fetch();
  };

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const a = categories[index];
    const b = categories[swapIndex];

    // Swap sort_order values
    await Promise.all([
      (supabase as any).from("gallery_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      (supabase as any).from("gallery_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetch();
  };

  return (
    <AdminLayout>
      <div className="max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Gallery Categories</h1>
          <Button onClick={() => { setAdding(true); setEditingId(null); }} disabled={adding}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        {/* Add new */}
        {adding && (
          <Card>
            <CardContent className="pt-5 flex gap-2 items-center">
              <Input
                autoFocus
                placeholder="Category name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              />
              <Button onClick={handleAdd}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}><X className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : categories.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No categories yet. Add one above.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <Card key={cat.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  {/* Sort arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      disabled={i === 0}
                      onClick={() => moveCategory(i, -1)}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-default transition-colors"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={i === categories.length - 1}
                      onClick={() => moveCategory(i, 1)}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-default transition-colors"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Name / edit */}
                  {editingId === cat.id ? (
                    <Input
                      autoFocus
                      className="flex-1 h-8"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(cat.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                  )}

                  {/* Actions */}
                  {editingId === cat.id ? (
                    <>
                      <Button size="sm" onClick={() => handleSaveEdit(cat.id)}><Save className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditingName(cat.name); setAdding(false); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminGalleryCategories;
