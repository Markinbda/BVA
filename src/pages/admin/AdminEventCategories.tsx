import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#6b7280',
];

interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const emptyCategory = { name: "", color: "#3b82f6" };

const AdminEventCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState<{ name: string; color: string }>(emptyCategory);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; color: string }>(emptyCategory);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchCategories = async () => {
    const { data } = await (supabase as any).from("event_categories").select("*").order("name");
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const logAudit = async (action: string, details: object) => {
    if (!user) return;
    await (supabase as any).from("admin_audit_logs").insert({
      user_id: user.id,
      action,
      target_path: "/admin/event-categories",
      details,
    });
  };

  const handleAdd = async () => {
    if (!newCat.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const { error, data } = await (supabase as any)
      .from("event_categories")
      .insert({ name: newCat.name.trim(), color: newCat.color })
      .select()
      .single();
    if (error) {
      toast({ title: "Error creating category", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit("create_event_category", { name: newCat.name, color: newCat.color });
    toast({ title: "Category created!" });
    setNewCat(emptyCategory);
    fetchCategories();
  };

  const handleEditStart = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, color: cat.color });
  };

  const handleEditSave = async (id: string) => {
    if (!editForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any)
      .from("event_categories")
      .update({ name: editForm.name.trim(), color: editForm.color })
      .eq("id", id);
    if (error) {
      toast({ title: "Error updating category", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Category updated!" });
    setEditingId(null);
    fetchCategories();
  };

  const handleDelete = async (cat: Category) => {
    // Check if any events use this category
    const { data: eventsUsing } = await (supabase as any)
      .from("events")
      .select("id")
      .eq("category_id", cat.id)
      .limit(1);
    if (eventsUsing && eventsUsing.length > 0) {
      toast({
        title: "Cannot delete category",
        description: "This category is used by one or more events. Reassign those events first.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    const { error } = await (supabase as any).from("event_categories").delete().eq("id", cat.id);
    if (error) {
      toast({ title: "Error deleting category", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit("delete_event_category", { id: cat.id, name: cat.name });
    toast({ title: "Category deleted" });
    fetchCategories();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Event Categories</h1>
        </div>

        {/* Add New Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Name</label>
              <Input
                placeholder="e.g. Tournament"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCat({ ...newCat, color: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${newCat.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Selected: {newCat.color}</p>
            </div>
            <Button onClick={handleAdd} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </CardContent>
        </Card>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : categories.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No categories yet.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    {editingId === cat.id ? (
                      <>
                        <div
                          className="w-5 h-5 rounded-full shrink-0 border border-border"
                          style={{ backgroundColor: editForm.color }}
                        />
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="flex-1 h-8"
                          autoFocus
                        />
                        <div className="flex gap-1 flex-wrap">
                          {COLOR_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, color: c })}
                              className={`w-5 h-5 rounded-full border-2 transition-all ${editForm.color === c ? "border-foreground" : "border-transparent"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleEditSave(cat.id)}>
                          <Save className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-5 h-5 rounded-full shrink-0 border border-border"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{cat.color}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleEditStart(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminEventCategories;
