import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import HeroSlider from "@/components/HeroSlider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, ArrowRight, Star, MapPin } from "lucide-react";
import placeholderNews from "@/assets/placeholder-news.jpg";

const quickLinks = [
{ label: "Membership", path: "/membership", icon: Users, desc: "Join the BVA family" },
{ label: "Schedule", path: "/events", icon: Calendar, desc: "Upcoming events" },
{ label: "Junior Programs", path: "/programs/junior", icon: Star, desc: "Ages 12–18" },
{ label: "Summer League", path: "/summer-league", icon: Trophy, desc: "Beach volleyball" }];


const fallbackNews = [
{ id: "1", title: "2025 Raffle Winners Announced!", date: "2025-03-01", category: "News", excerpt: "Congratulations to all the winners of the BVA 2025 raffle fundraiser.", image_url: null },
{ id: "2", title: "Bermuda Volleyball Team Wins Silver at Nike Festival", date: "2025-02-01", category: "National Team", excerpt: "Bermuda's women's volleyball team captured a silver medal at the Nike International Volleyball Festival.", image_url: null },
{ id: "3", title: "National Teams to Compete in US Open", date: "2024-05-01", category: "National Team", excerpt: "Bermuda's national volleyball teams will compete in the US Open Volleyball Championships.", image_url: null }];


const fallbackEvents = [
{ title: "Summer Beach League Opens", date: "2025-05-05", location: "Horseshoe Bay Beach" },
{ title: "Indoor League Night", date: "2025-03-05", location: "CedarBridge Gym" },
{ title: "March Break Youth Camp", date: "2025-03-17", location: "CedarBridge Academy" }];


const Index = () => {
  const { data: newsArticles } = useQuery({
    queryKey: ["home-news"],
    queryFn: async () => {
      const { data } = await supabase.
      from("news_articles").
      select("*").
      eq("published", true).
      order("date", { ascending: false }).
      limit(3);
      return data as any[] ?? [];
    }
  });

  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: async () => {
      const { data } = await supabase.
      from("events").
      select("*").
      eq("published", true).
      order("date", { ascending: true }).
      limit(4);
      return data as any[] ?? [];
    }
  });

  const { data: sponsors } = useQuery({
    queryKey: ["home-sponsors"],
    queryFn: async () => {
      const { data } = await supabase.
      from("sponsors").
      select("*").
      eq("active", true).
      order("sort_order");
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

      {/* Content */}
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
                    <img src={article.image_url || placeholderNews} alt={article.title} className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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

            {/* Upcoming Events */}
            <section>
              <div className="mb-8 flex items-center justify-between opacity-0 animate-fade-in">
                <h2 className="font-heading text-3xl font-bold uppercase text-foreground">Upcoming Events</h2>
                <Link to="/events" className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline transition-colors">
                  Full Calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {displayEvents.map((event: any, i: number) =>
                <div
                  key={event.title}
                  className="group flex items-center gap-4 rounded-xl border border-transparent bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-accent/20 hover:-translate-y-0.5 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-base font-semibold truncate">{event.title}</h3>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" /> {event.location}
                      </p>
                    </div>
                    <span className="hidden sm:inline-block shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{event.date}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8 opacity-0 animate-fade-in-right" style={{ animationDelay: "200ms" }}>
            {/* Sponsors */}
            <Card className="overflow-hidden border-transparent shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg uppercase">Our Sponsors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Thank you to our sponsors for supporting volleyball in Bermuda.</p>
                <div className="grid grid-cols-2 gap-3">
                  {displaySponsors.map((s: any) =>
                  <div key={s.name} className="flex h-20 items-center justify-center rounded-lg bg-muted/60 p-3 text-center transition-colors hover:bg-muted">
                      {s.logo_url ?
                    <img src={s.logo_url} alt={s.name} className="max-h-14 max-w-full object-contain" /> :

                    <span className="text-xs font-medium text-muted-foreground">{s.name}</span>
                    }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary/90 p-6 text-primary-foreground text-center shadow-lg">
              <h3 className="font-heading text-xl font-bold uppercase">Join BVA</h3>
              <p className="mt-2 text-sm text-primary-foreground/70">Membership starts free for youth players.</p>
              <Button asChild size="sm" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
                <Link to="/membership">View Plans</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>);

};

export default Index;