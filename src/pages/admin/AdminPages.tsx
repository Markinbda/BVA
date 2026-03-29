import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2 } from "lucide-react";

interface PageContent {
  id: string;
  page_slug: string;
  section_key: string;
  content_type: string;
  text_value: string | null;
  image_url: string | null;
}

const PAGE_OPTIONS = [
  { slug: "about", label: "About" },
  { slug: "bursary", label: "Bursary" },
  { slug: "membership", label: "Membership" },
  { slug: "home", label: "Home Page" },
  { slug: "programs", label: "Programs" },
  { slug: "leagues", label: "Leagues" },
  { slug: "registration", label: "Registration" },
];

const AdminPages = () => {
  const [selectedPage, setSelectedPage] = useState("about");
  const [blocks, setBlocks] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchBlocks = async () => {
    setLoading(true);
    const { data } = await supabase.from("page_content").select("*").eq("page_slug", selectedPage).order("section_key");
    setBlocks((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBlocks(); }, [selectedPage]);

  const updateBlock = (id: string, field: string, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const block of blocks) {
      await supabase.from("page_content").update({
        text_value: block.text_value,
        image_url: block.image_url,
      }).eq("id", block.id);
    }
    setSaving(false);
    toast({ title: "All changes saved!" });
  };

  const handleAddBlock = async () => {
    const key = prompt("Enter a section name (e.g. hero_title, about_text):");
    if (!key) return;
    const type = confirm("Is this an image block? (OK = Image, Cancel = Text)") ? "image" : "text";
    const { error } = await supabase.from("page_content").insert({
      page_slug: selectedPage,
      section_key: key,
      content_type: type,
      text_value: type === "text" ? "" : null,
      image_url: type === "image" ? "" : null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    fetchBlocks();
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Delete this content block?")) return;
    await supabase.from("page_content").delete().eq("id", id);
    toast({ title: "Block deleted" });
    fetchBlocks();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground">Page Content</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddBlock}><Plus className="h-4 w-4 mr-2" /> Add Block</Button>
            <Button onClick={handleSaveAll} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save All"}</Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {PAGE_OPTIONS.map(({ slug, label }) => (
            <Button key={slug} variant={selectedPage === slug ? "default" : "outline"} size="sm" onClick={() => setSelectedPage(slug)}>
              {label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : blocks.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No content blocks for this page. Click "Add Block" to start.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => (
              <Card key={block.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{block.section_key} ({block.content_type})</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(block.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {block.content_type === "image" ? (
                    <ImageUpload value={block.image_url || ""} onChange={(url) => updateBlock(block.id, "image_url", url)} folder="pages" />
                  ) : (
                    <Textarea value={block.text_value || ""} onChange={(e) => updateBlock(block.id, "text_value", e.target.value)} rows={4} />
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

export default AdminPages;
