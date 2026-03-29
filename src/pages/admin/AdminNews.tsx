import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface NewsArticle {
  id: string;
  title: string;
  date: string;
  category: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  published: boolean;
}

const emptyArticle = { title: "", date: new Date().toISOString().split("T")[0], category: "General", excerpt: "", content: "", image_url: "", published: false };

const AdminNews = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [editing, setEditing] = useState<Partial<NewsArticle> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchArticles = async () => {
    const { data } = await supabase.from("news_articles").select("*").order("date", { ascending: false });
    setArticles((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleSave = async () => {
    if (!editing?.title) { toast({ title: "Title is required", variant: "destructive" }); return; }

    const payload = {
      title: editing.title,
      date: editing.date || new Date().toISOString().split("T")[0],
      category: editing.category || "General",
      excerpt: editing.excerpt || null,
      content: editing.content || null,
      image_url: editing.image_url || null,
      published: editing.published ?? false,
    };

    if (editing.id) {
      const { error } = await supabase.from("news_articles").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("news_articles").insert(payload);
      if (error) { toast({ title: "Error creating", description: error.message, variant: "destructive" }); return; }
    }

    toast({ title: editing.id ? "Article updated!" : "Article created!" });
    setEditing(null);
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    await supabase.from("news_articles").delete().eq("id", id);
    toast({ title: "Article deleted" });
    fetchArticles();
  };

  if (editing) {
    return (
      <AdminLayout>
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">{editing.id ? "Edit Article" : "New Article"}</h1>
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Title</label>
              <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Date</label>
                <Input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Category</label>
                <Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Excerpt (short summary)</label>
              <Textarea value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Full Content</label>
              <Textarea value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={8} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Image</label>
              <ImageUpload value={editing.image_url || ""} onChange={(url) => setEditing({ ...editing, image_url: url })} folder="news" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="published" checked={editing.published ?? false} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="rounded" />
              <label htmlFor="published" className="text-sm font-medium">Published (visible on website)</label>
            </div>
            <Button onClick={handleSave} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Article</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">News Articles</h1>
          <Button onClick={() => setEditing(emptyArticle)}><Plus className="h-4 w-4 mr-2" /> Add Article</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : articles.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No articles yet. Click "Add Article" to create one.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {a.image_url && <img src={a.image_url} alt="" className="w-16 h-12 object-cover rounded" />}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{a.title}</p>
                      <p className="text-sm text-muted-foreground">{a.date} · {a.category} · {a.published ? "✅ Published" : "📝 Draft"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminNews;
