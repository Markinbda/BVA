import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy } from "lucide-react";
import placeholderBeach from "@/assets/placeholder-beach.jpg";
import placeholderNews from "@/assets/placeholder-news.jpg";

const leagues = [
  {
    title: "Summer Beach Leagues",
    description: "BVA runs beach volleyball leagues Monday through Thursday at Horseshoe Bay Beach and Elbow Beach from May to September. Formats include 2v2 and 4v4, with recreational and competitive divisions.",
    details: ["Season: May – September", "Format: 2v2 and 4v4", "Fee: $225-450/team", "Locations: Horseshoe Bay & Elbow Beach"],
    image: placeholderBeach,
  },
  {
    title: "Winter Indoor League",
    description: "Indoor volleyball leagues run from November through February at CedarBridge Academy gymnasium. Divisions include competitive and recreational 6v6 play.",
    details: ["Season: November – February", "Format: 6v6", "Fee: $150/team", "Location: CedarBridge Academy Gym"],
    image: placeholderNews,
  },
  {
    title: "Grass Leagues",
    description: "Grass volleyball events held at various outdoor venues across Bermuda during spring and fall seasons.",
    details: ["Season: Spring & Fall", "Format: 4v4 and 6v6", "Fee: $75/team", "Location: Various"],
    image: placeholderBeach,
  },
];

const tournaments = [
  { title: "BVA Beach Classic", date: "July 2025", format: "Doubles", location: "Horseshoe Bay" },
  { title: "Indoor Championship", date: "April 2025", format: "6v6", location: "CedarBridge Gym" },
  { title: "Bermuda Open", date: "August 2025", format: "4v4 Beach", location: "Horseshoe Bay" },
  { title: "Annual Corporate Tournament", date: "April 2026", format: "Coed", location: "TBD" },
];

const Leagues = () => {
  const { data: activeSeasons = [] } = useQuery({
    queryKey: ["active_league_seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_seasons")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <PageHeader title="Leagues & Tournaments" subtitle="Competitive volleyball for all levels" />
      <div className="container mx-auto px-4 py-12">
        {/* Active League Standings CTA */}
        {activeSeasons.map((season) => (
          <Card key={season.id} className="mb-6 overflow-hidden opacity-0 animate-fade-in">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl font-bold uppercase">{season.name} Standings</h2>
                <p className="mt-1 text-sm text-muted-foreground">View live league standings, weekly results, and team rankings</p>
              </div>
              <Button asChild>
                <Link to={`/leagues/standings/${season.id}`}>View Standings <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {/* Summer League CTA */}
        <Card className="mb-12 overflow-hidden opacity-0 animate-fade-in">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg overflow-hidden">
              <img src={placeholderBeach} alt="Beach volleyball" className="h-16 w-16 object-cover rounded-lg" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-xl font-bold uppercase">Summer League Registration</h2>
              <p className="mt-1 text-sm text-muted-foreground">Register your team for beach volleyball — Mon-Thu at Horseshoe Bay & Elbow Beach</p>
            </div>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/summer-league">Register Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Leagues */}
        <section className="mb-16">
          <h2 className="mb-8 font-heading text-3xl font-bold uppercase opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>Leagues</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {leagues.map((league, i) => (
              <Card key={league.title} className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up" style={{ animationDelay: `${200 + i * 120}ms` }}>
                <div className="h-2 bg-accent" />
                <div className="h-36 overflow-hidden">
                  <img src={league.image} alt={league.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase">{league.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{league.description}</p>
                  <ul className="mt-4 space-y-1">
                    {league.details.map((d) => (
                      <li key={d} className="text-sm">• {d}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Tournaments */}
        <section>
          <h2 className="mb-8 font-heading text-3xl font-bold uppercase opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>Tournaments</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {tournaments.map((t, i) => (
              <Card key={t.title} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 opacity-0 animate-slide-up" style={{ animationDelay: `${600 + i * 100}ms` }}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-heading text-lg font-bold text-accent">
                    🏆
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{t.title}</h3>
                    <p className="text-sm text-muted-foreground">{t.date} • {t.format} • {t.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Leagues;
