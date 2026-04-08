import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

const fallbackPhotos = [
  { id: "1", category: "Beach", alt: "Beach volleyball at Horseshoe Bay", image_url: "" },
  { id: "2", category: "Indoor", alt: "Indoor league match at CedarBridge", image_url: "" },
  { id: "3", category: "National Team", alt: "Women's National Team at Nike Festival", image_url: "" },
  { id: "4", category: "Youth Camps", alt: "March Break camp group photo", image_url: "" },
  { id: "5", category: "Beach", alt: "Summer beach tournament doubles", image_url: "" },
  { id: "6", category: "Indoor", alt: "Men's league championship game", image_url: "" },
  { id: "7", category: "National Team", alt: "Men's National Team at ECVA Championships", image_url: "" },
  { id: "8", category: "Tournaments", alt: "BVA Beach Classic tournament", image_url: "" },
];

const GALLERY_PAGE_SIZE = 24;

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"default" | "newest" | "oldest">("default");

  const { data: photos, isLoading } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("sort_order");
      return (data as any[]) ?? [];
    },
  });

  const displayPhotos = photos?.length ? photos : fallbackPhotos;
  const categories = ["All", ...Array.from(new Set(displayPhotos.map((p: any) => p.category)))];
  const filtered = useMemo(() => {
    let result = activeCategory === "All" ? displayPhotos : displayPhotos.filter((p: any) => p.category === activeCategory);
    if (sortOrder === "newest") {
      result = [...result].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === "oldest") {
      result = [...result].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return result;
  }, [displayPhotos, activeCategory, sortOrder]);
  const totalPages = Math.ceil(filtered.length / GALLERY_PAGE_SIZE);
  const paginatedFiltered = filtered.slice((currentPage - 1) * GALLERY_PAGE_SIZE, currentPage * GALLERY_PAGE_SIZE);

  // Reset page on filter/sort change
  useEffect(() => { setCurrentPage(1); }, [activeCategory, sortOrder]);

  const openLightbox = (index: number) => {
    if (filtered[index]?.image_url) setLightboxIndex(index);
  };

  const navigateLightbox = (dir: -1 | 1) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < filtered.length) setLightboxIndex(next);
  };

  const currentPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <Layout>
      <PageHeader title="Gallery" subtitle="Photos from BVA events, leagues, and programs" />
      <div className="container mx-auto px-4 py-12">
        {/* Filters & Sort */}
        <div className="mb-8 flex flex-wrap items-center gap-2 opacity-0 animate-fade-in">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as string)}
              className={`rounded-full px-4 py-2 font-heading text-sm font-semibold uppercase transition-colors ${
                activeCategory === cat
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent/20"
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="ml-auto">
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {paginatedFiltered.map((photo: any, i: number) => {
                const globalIndex = (currentPage - 1) * GALLERY_PAGE_SIZE + i;
                return (
                  <div
                    key={photo.id}
                    className={`group relative aspect-square overflow-hidden rounded-lg bg-muted opacity-0 animate-scale-in ${photo.image_url ? "cursor-pointer" : ""}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                    onClick={() => openLightbox(globalIndex)}
                  >
                    {photo.image_url ? (
                      <img src={photo.image_url} alt={photo.alt || ""} data-db-image="1" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-sm text-muted-foreground">
                        📷 {photo.alt}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <div>
                        <span className="text-xs font-semibold uppercase text-accent">{photo.category}</span>
                        <p className="text-sm text-primary-foreground">{photo.alt}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95 overflow-hidden">
          {currentPhoto && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={currentPhoto.image_url}
                alt={currentPhoto.alt || ""}
                className="max-w-full max-h-[85vh] object-contain"
              />

              {/* Nav buttons */}
              {lightboxIndex !== null && lightboxIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {lightboxIndex !== null && lightboxIndex < filtered.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Caption */}
              {currentPhoto.alt && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <span className="text-xs font-semibold uppercase text-accent">{currentPhoto.category}</span>
                  <p className="text-sm text-white">{currentPhoto.alt}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Gallery;
