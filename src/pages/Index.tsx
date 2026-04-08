import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import HeroSlider from "@/components/HeroSlider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar, Users, Trophy, ArrowRight, Star, MapPin, ExternalLink } from "lucide-react";
import placeholderNews from "@/assets/Splash screen/Mens Beach.jpg";

const fallbackNews = [
{ id: "1", title: "2025 Raffle Winners Announced!", date: "2025-03-01", category: "News", excerpt: "Congratulations to all the winners of the BVA 2025 raffle fundraiser.", image_url: null },
{ id: "2", title: "Bermuda Volleyball Team Wins Silver at Nike Festival", date: "2025-02-01", category: "National Team", excerpt: "Bermuda's women's volleyball team captured a silver medal at the Nike International Volleyball Festival.", image_url: null },
{ id: "3", title: "National Teams to Compete in US Open", date: "2024-05-01", category: "National Team", excerpt: "Bermuda's national volleyball teams will compete in the US Open Volleyball Championships.", image_url: null }];

const fallbackEvents = [
{ id: "1", title: "Summer Beach League Opens", date: "2025-05-05", location: "Horseshoe Bay Beach" },
{ id: "2", title: "Indoor League Night", date: "2025-03-05", location: "CedarBridge Gym" },
{ id: "3", title: "March Break Youth Camp", date: "2025-03-17", location: "CedarBridge Academy" },
{ id: "4", title: "Bermuda Open Tournament", date: "2025-06-01", location: "Elbow Beach" }];

const formatEventDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(day).padStart(2, "0"),
  };
};

const Index = () => {
  const navigate = useNavigate();
  const [selectedSponsor, setSelectedSponsor] = useState<any | null>(null);

  const { data: newsArticles } = useQuery({
    queryKey: ["home-news"],
    queryFn: async () => {
      const { data } = await supabase.from("news_articles").select("*").eq("published", true).order("date", { ascending: false }).limit(3);
      return data as any[] ?? [];
    }
  });

  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("published", true).order("date", { ascending: true }).limit(4);
      return data as any[] ?? [];
    }
  });

  const { data: sponsors } = useQuery({
    queryKey: ["home-sponsors"],
    queryFn: async () => {
      const { data } = await supabase.from("sponsors").select("*").eq("active", true).order("sort_order");
      return data as any[] ?? [];
    }
  });

  const displayNews = newsArticles?.length ? newsArticles : fallbackNews;
  const displayEvents = events?.length ? events : fallbackEvents;
  const displaySponsors = sponsors?.length ? sponsors : [
    { name: "Coral Beach & Tennis Club" }, { name: "Docksiders" }, { name: "BDA Spirits" }, { name: "BVA Supporters" }];

  return (
    <Layout>
      <HeroSlider />

      {/* Main content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-16 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-20">

            {/* Latest News */}
            <section>
              <div className="mb-8 flex items-center justify-between opacity-0 animate-fade-in">
                <h2 className="font-heading text-3xl font-bold uppercase text-foreground">Latest News</h2>
                <Link to="/news" className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline transition-colors">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayNews.map((article: any, i: number) =>
                  <Link to={`/news/${article.id}`} key={article.id} className="group">
                    <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
                      <div className="h-36 overflow-hidden">
                        <img src={article.image_url || placeholderNews} alt={article.title} data-db-image="1" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                      <CardHeader className="pb-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-accent">{article.category}</span>
                        <CardTitle className="font-heading text-lg leading-tight group-hover:text-accent transition-colors">{article.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        <p className="mt-3 text-xs text-muted-foreground/60">{article.date}</p>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            </section>

            {/* Upcoming Events — small tiles */}
            <section>
              <div className="mb-6 flex items-center justify-between opacity-0 animate-fade-in">
                <h2 className="font-heading text-3xl font-bold uppercase text-foreground">Upcoming Events</h2>
                <Link to="/events" className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline transition-colors">
                  Full Calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {displayEvents.map((event: any, i: number) => {
                  const { month, day } = formatEventDate(event.date);
                  return (
                    <button
                      key={event.id ?? event.title}
                      onClick={() => navigate("/events", { state: { openEventId: event.id } })}
                      className="group flex flex-col items-center text-center rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200 opacity-0 animate-slide-up cursor-pointer"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors mb-2">
                        <span className="text-[10px] font-bold uppercase text-accent leading-none">{month}</span>
                        <span className="text-lg font-bold text-accent leading-tight">{day}</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{event.title}</p>
                      {event.location && (
                        <p className="mt-1 flex items-center gap-0.5 text-[10px] text-muted-foreground line-clamp-1">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />{event.location}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sidebar — CTA only, sponsors moved to bottom */}
          <aside className="space-y-8 opacity-0 animate-fade-in-right" style={{ animationDelay: "200ms" }}>
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary/90 p-6 text-primary-foreground text-center shadow-lg">
              <h3 className="font-heading text-xl font-bold uppercase">Join the BVA</h3>
              <p className="mt-2 text-sm text-primary-foreground/70">Membership starts free for youth players.</p>
              <Button asChild size="sm" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
                <Link to="/membership">View Plans</Link>
              </Button>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Membership", path: "/membership", icon: Users },
                { label: "Schedule", path: "/events", icon: Calendar },
                { label: "Junior Programs", path: "/programs/junior", icon: Star },
                { label: "Summer League", path: "/summer-league", icon: Trophy },
              ].map(({ label, path, icon: Icon }) => (
                <Link key={label} to={path} className="group flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-4 text-center shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-200">
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">{label}</span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Sponsors — full width above footer */}
      <section className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold uppercase text-center text-foreground mb-2">Our Sponsors</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Thank you to our sponsors for supporting volleyball in Bermuda.</p>
          <div className="flex flex-wrap justify-center gap-5">
            {displaySponsors.map((s: any) => (
              <button
                key={s.id ?? s.name}
                onClick={() => setSelectedSponsor(s)}
                className="group relative h-36 w-52 rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {/* Logo fills the button */}
                {s.logo_url && (
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                {/* 50% gradient overlay — dark at bottom, fades up */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/10" />
                {/* Sponsor name pinned to bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <span className="text-sm font-bold text-white drop-shadow leading-tight line-clamp-2">{s.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor popup */}
      <Dialog open={!!selectedSponsor} onOpenChange={(open) => !open && setSelectedSponsor(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectedSponsor && (
            <>
              {/* Logo / image header */}
              <div className="relative h-48 bg-muted flex items-center justify-center">
                {selectedSponsor.logo_url ? (
                  <img
                    src={selectedSponsor.logo_url}
                    alt={selectedSponsor.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-heading font-bold text-3xl">
                    {selectedSponsor.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <h2 className="absolute bottom-4 left-4 right-4 font-heading text-xl font-bold text-white leading-tight">
                  {selectedSponsor.name}
                </h2>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {selectedSponsor.description && (
                  <p className="text-sm text-foreground leading-relaxed">{selectedSponsor.description}</p>
                )}
                {selectedSponsor.website_url && (
                  <a
                    href={selectedSponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" /> Visit Website
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Index;
