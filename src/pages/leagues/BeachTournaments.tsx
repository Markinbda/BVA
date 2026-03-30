import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const divisions = [
  { name: "Women's 2s — Recreational", format: "2v2", level: "Recreational" },
  { name: "Women's 2s — Competitive", format: "2v2", level: "Competitive" },
  { name: "Women's 4s", format: "4v4", level: "Open" },
  { name: "Men's 2s — Recreational", format: "2v2", level: "Recreational" },
  { name: "Men's 2s — Competitive", format: "2v2", level: "Competitive" },
  { name: "Men's 4s", format: "4v4", level: "Open" },
];

const BeachTournaments = () => {
  return (
    <Layout>
      <PageHeader title="Beach Tournaments" subtitle="BVA summer beach tournament series" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="p-6 text-muted-foreground leading-relaxed">
            Throughout the summer the BVA hosts various beach tournaments. Events are held at Bermuda's
            beautiful beach venues and are open to players of all skill levels — recreational and competitive
            divisions available.
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Divisions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {divisions.map((d, i) => (
              <Card
                key={d.name}
                className="opacity-0 animate-fade-in transition-shadow hover:shadow-md"
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.format} · {d.level}</p>
                  </div>
                  <Button size="sm" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <a href="https://tms.ezfacility.com" target="_blank" rel="noopener noreferrer">
                      Register <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "600ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Requirements</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>All participants must be current BVA members.</p>
            <p>Dates and venues are announced on the BVA website and social media.</p>
            <p>Some events may be postponed — check registration pages for the most up-to-date information.</p>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-muted p-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: "700ms" }}>
          <p className="text-sm text-muted-foreground">
            Questions? Email{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default BeachTournaments;
