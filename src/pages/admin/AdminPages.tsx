import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
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

const PAGE_GROUPS = [
  {
    label: "Main Pages",
    pages: [
      { slug: "home", label: "Home" },
      { slug: "about", label: "About Us" },
      { slug: "programs", label: "Programs" },
      { slug: "leagues", label: "Leagues & Tournaments" },
      { slug: "registration", label: "Registration" },
      { slug: "bursary", label: "Financial Aid / Bursary" },
      { slug: "membership", label: "Membership" },
      { slug: "summer_league", label: "Summer League" },
    ],
  },
  {
    label: "About Sub-pages",
    pages: [
      { slug: "about_mission", label: "About / Mission" },
      { slug: "about_executives", label: "About / Executives" },
      { slug: "about_governing_bodies", label: "About / Governing Bodies" },
      { slug: "about_annual_reports", label: "About / Annual Reports" },
      { slug: "about_anti_doping", label: "About / Anti-Doping" },
    ],
  },
  {
    label: "Programs Sub-pages",
    pages: [
      { slug: "programs_junior", label: "Programs / Junior Program" },
      { slug: "programs_junior_girls", label: "Programs / Paradise Hitters (Girls)" },
      { slug: "programs_junior_boys", label: "Programs / Big Wave Riders (Boys)" },
      { slug: "programs_senior", label: "Programs / Senior National Teams" },
      { slug: "programs_senior_mens", label: "Programs / Men's National Team" },
      { slug: "programs_senior_womens", label: "Programs / Women's National Team" },
      { slug: "programs_youth_camps", label: "Programs / Youth Camps" },
      { slug: "programs_coaching", label: "Programs / Coaching Program" },
      { slug: "programs_referee", label: "Programs / Referee Program" },
    ],
  },
  {
    label: "Leagues Sub-pages",
    pages: [
      { slug: "leagues_winter", label: "Leagues / Winter League" },
      { slug: "leagues_spring", label: "Leagues / Spring League" },
      { slug: "leagues_beach_tournaments", label: "Leagues / Beach Tournaments" },
      { slug: "leagues_bermuda_open", label: "Leagues / Bermuda Open" },
      { slug: "leagues_corporate", label: "Leagues / Corporate Tournament" },
      { slug: "leagues_island_games", label: "Leagues / NatWest Island Games" },
      { slug: "leagues_rules", label: "Leagues / Rules" },
    ],
  },
  {
    label: "Registration Sub-pages",
    pages: [
      { slug: "registration_winter", label: "Registration / Winter League" },
      { slug: "registration_beach", label: "Registration / Beach" },
    ],
  },
  {
    label: "Bursary Sub-pages",
    pages: [
      { slug: "bursary_adopt_athlete", label: "Bursary / Adopt-an-Athlete" },
      { slug: "bursary_youth_bursaries", label: "Bursary / Youth Bursaries" },
    ],
  },
  {
    label: "Gallery Sub-pages",
    pages: [
      { slug: "gallery", label: "Gallery" },
      { slug: "gallery_history", label: "Gallery / History" },
      { slug: "gallery_videos", label: "Gallery / Videos" },
      { slug: "gallery_social", label: "Gallery / Social Media" },
    ],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.pages);

const AdminPages = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  const [blocks, setBlocks] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchBlocks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("page_content")
      .select("*")
      .eq("page_slug", selectedPage)
      .order("section_key");
    setBlocks((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBlocks();
  }, [selectedPage]);

  const updateBlock = (id: string, field: string, value: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const block of blocks) {
      await supabase
        .from("page_content")
        .update({ text_value: block.text_value, image_url: block.image_url })
        .eq("id", block.id);
    }
    setSaving(false);
    toast({ title: "All changes saved!" });
  };

  const handleAddBlock = async () => {
    const key = prompt("Enter a section key (e.g. hero_title, about_text):");
    if (!key) return;
    const type = confirm("Is this an image block? (OK = Image, Cancel = Text)") ? "image" : "text";
    const { error } = await supabase.from("page_content").insert({
      page_slug: selectedPage,
      section_key: key,
      content_type: type,
      text_value: type === "text" ? "" : null,
      image_url: type === "image" ? "" : null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    fetchBlocks();
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Delete this content block?")) return;
    await supabase.from("page_content").delete().eq("id", id);
    toast({ title: "Block deleted" });
    fetchBlocks();
  };

  const currentLabel = ALL_PAGES.find((p) => p.slug === selectedPage)?.label ?? selectedPage;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Page Content</h1>
            <p className="text-sm text-muted-foreground mt-1">Editing: <strong>{currentLabel}</strong></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddBlock}>
              <Plus className="h-4 w-4 mr-2" /> Add Block
            </Button>
            <Button onClick={handleSaveAll} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>

        {/* Page selector */}
        <select
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {PAGE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.pages.map(({ slug, label }) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : blocks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No content blocks for this page yet. Click "Add Block" to create one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => (
              <Card key={block.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {block.section_key}{" "}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{block.content_type}</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(block.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {block.content_type === "image" ? (
                    <ImageUpload
                      value={block.image_url || ""}
                      onChange={(url) => updateBlock(block.id, "image_url", url)}
                      folder="pages"
                    />
                  ) : (
                    <Textarea
                      value={block.text_value || ""}
                      onChange={(e) => updateBlock(block.id, "text_value", e.target.value)}
                      rows={3}
                    />
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
