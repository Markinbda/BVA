import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, Loader2, Check } from "lucide-react";

interface GalleryPhoto {
  id: string;
  image_url: string;
  alt: string | null;
  category: string;
}

interface GalleryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  folder?: string;
}

const GalleryPicker = ({ open, onClose, onSelect, folder = "general" }: GalleryPickerProps) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gallery_photos")
      .select("id, image_url, alt, category")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as GalleryPhoto[];
    setPhotos(list);
    const cats = Array.from(new Set(list.map((p) => p.category).filter(Boolean)));
    setCategories(["All", ...cats]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchPhotos();
      setSelected(null);
      setSearch("");
      setFilterCat("All");
    }
  }, [open, fetchPhotos]);

  const filtered = photos.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.alt ?? "").toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.image_url.toLowerCase().includes(q);
    const matchCat = filterCat === "All" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image must be under 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("bva-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("bva-images").getPublicUrl(path);
    toast({ title: "Image uploaded!" });
    setUploading(false);
    onSelect(publicUrl);
    onClose();
  };

  const triggerFileInput = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(file);
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Choose an Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="gallery" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-4 w-fit shrink-0">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          {/* ── Gallery tab ── */}
          <TabsContent value="gallery" className="flex flex-col flex-1 overflow-hidden mt-0 px-6 pb-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 py-4 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filterCat === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  No images found.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {filtered.map((photo) => {
                    const isSelected = selected === photo.image_url;
                    return (
                      <button
                        key={photo.id}
                        onClick={() => setSelected(isSelected ? null : photo.image_url)}
                        className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/40"
                        }`}
                      >
                        <img
                          src={photo.image_url}
                          alt={photo.alt ?? ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>
                        )}
                        {photo.alt && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {photo.alt}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border shrink-0 mt-4">
              <span className="text-sm text-muted-foreground">
                {filtered.length} image{filtered.length !== 1 ? "s" : ""}
                {selected ? " · 1 selected" : ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={!selected}>
                  Use Selected Image
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Upload tab ── */}
          <TabsContent value="upload" className="flex flex-col flex-1 px-6 pb-6">
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div
                className="w-full max-w-md border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={triggerFileInput}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleUpload(file);
                }}
              >
                {uploading ? (
                  <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium text-foreground">Click or drag to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WEBP, SVG up to 10MB</p>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                The image will be uploaded and immediately selected.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryPicker;
