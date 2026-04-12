import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cfEmbedUrl, cfThumbUrl, cfWatchUrl, VIDEO_CATEGORIES } from "@/pages/coach/CoachVideos";

interface PublicVideo {
  id: string;
  title: string;
  description: string | null;
  video_uid: string;
  categories: string[];
  created_at: string;
}

const skills = [
  { title: "Passing (Bumping)", desc: "Learn the fundamentals of forearm passing" },
  { title: "Setting (Volleying)", desc: "Master the overhead set technique" },
  { title: "Underhand Serve", desc: "The basics of the underhand serve" },
  { title: "Spiking", desc: "Attacking the ball with power and precision" },
  { title: "Jump Serve", desc: "Advanced serving for experienced players" },
  { title: "Blocking", desc: "Defensive techniques at the net" },
  { title: "Digging", desc: "Defensive passing of hard-driven attacks" },
];

const Videos = () => {
  const [publicVideos, setPublicVideos] = useState<PublicVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    (supabase as any)
      .from("coach_videos")
      .select("id, title, description, video_uid, categories, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: PublicVideo[] | null }) => {
        setPublicVideos(data ?? []);
        setLoadingVideos(false);
      });
  }, []);

  const usedCategories = VIDEO_CATEGORIES.filter(c =>
    publicVideos.some(v => v.categories?.includes(c))
  );

  const filteredVideos = filterCategory === "all"
    ? publicVideos
    : publicVideos.filter(v => v.categories?.includes(filterCategory));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  return (
    <Layout>
      <PageHeader title="Videos" subtitle="BVA match footage, highlights, and skill tutorials" />
      <div className="container mx-auto max-w-6xl px-4 py-12 space-y-12">

        {/* ── BVA Featured Videos ───────────────────────────────────────────── */}
        <section className="opacity-0 animate-fade-in">
          <h2 className="mb-1 font-heading text-2xl font-bold uppercase">BVA Videos</h2>
          <p className="mb-5 text-muted-foreground text-sm">
            Match footage, tournament highlights, and more from Bermuda Volleyball Association.
          </p>

          {/* Category filter */}
          {!loadingVideos && usedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => setFilterCategory("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >All</button>
              {usedCategories.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >{c}</button>
              ))}
            </div>
          )}

          {loadingVideos && (
            <div className="flex justify-center py-12 text-muted-foreground text-sm">Loading videos…</div>
          )}

          {!loadingVideos && filteredVideos.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-12 text-center">
              <p className="text-muted-foreground text-sm">No videos available yet. Check back soon!</p>
            </div>
          )}

          {!loadingVideos && filteredVideos.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map(video => (
                <Card key={video.id} className="overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="relative aspect-video bg-black">
                    {playingId === video.id ? (
                      <>
                        <iframe
                          src={`${cfEmbedUrl(video.video_uid)}?autoplay=true`}
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                        <button
                          onClick={() => setPlayingId(null)}
                          className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <img
                          src={cfThumbUrl(video.video_uid)}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <button
                          onClick={() => setPlayingId(video.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="h-6 w-6 text-black ml-1" />
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-sm leading-snug" title={video.title}>{video.title}</p>
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(video.categories ?? []).map(c => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">{formatDate(video.created_at)}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
                        <a href={cfWatchUrl(video.video_uid)} target="_blank" rel="noopener noreferrer" title="Open full screen">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Skill Tutorials ───────────────────────────────────────────────── */}
        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-2 font-heading text-2xl font-bold uppercase">Basic Beach Volleyball Skills</h2>
          <p className="mb-6 text-muted-foreground text-sm">
            Educational video tutorials covering fundamental volleyball skills. Videos sourced from Capt'n Bills.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {skills.map((skill, i) => (
              <Card
                key={skill.title}
                className="group opacity-0 animate-slide-up transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                style={{ animationDelay: `${100 + i * 70}ms` }}
              >
                <div className="relative flex h-32 items-center justify-center bg-muted rounded-t-lg overflow-hidden">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 transition-colors group-hover:bg-accent/40">
                    <Play className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="font-heading font-semibold text-sm uppercase">{skill.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{skill.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── YouTube ───────────────────────────────────────────────────────── */}
        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">BVA on YouTube</h2>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <p className="text-muted-foreground text-sm">Watch match highlights and event coverage on the official BVA YouTube channel.</p>
              <a
                href="https://www.youtube.com/@bdavolleyball"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Visit Channel
              </a>
            </CardContent>
          </Card>
        </section>

        <div className="rounded-lg bg-muted p-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <p className="text-sm text-muted-foreground">
            Have great match footage to share? Email{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Videos;
