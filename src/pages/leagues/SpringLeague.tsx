import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar } from "lucide-react";

const divisions = [
  {
    name: "Recreational 6s",
    format: "Coed 6v6",
    level: "Minimal skill required",
    note: "No A-rated players permitted. Standard coed rules.",
  },
  {
    name: "Recreational 4s",
    format: "Coed 4v4",
    level: "Medium skill level",
    note: "Standard coed rules.",
  },
  {
    name: "Competitive 4s",
    format: "Coed 4v4",
    level: "Advanced skill level",
    note: "Standard coed rules. Most competitive division.",
  },
];

const SpringLeague = () => {
  return (
    <Layout>
      <PageHeader title="Spring Grass League" subtitle="Outdoor Monday night volleyball — mid March through mid May" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="p-6 text-muted-foreground leading-relaxed">
            An outdoor league held on grass on Monday nights from mid March through mid May. Teams play all
            others within their division in a round-robin format. Winners are determined by overall win/loss ratio.
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" /> Registration Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium">Registration Opens</span>
                <span className="text-sm text-muted-foreground">February 23rd at midnight</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium">Registration Closes</span>
                <span className="text-sm text-muted-foreground">March 1st</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium">Season</span>
                <span className="text-sm text-muted-foreground">Mid March – Mid May (Monday nights)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Divisions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {divisions.map((d, i) => (
              <Card
                key={d.name}
                className="opacity-0 animate-fade-in transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300"
                style={{ animationDelay: `${300 + i * 80}ms` }}
              >
                <div className="h-1 bg-accent" />
                <CardContent className="p-5 space-y-1">
                  <p className="font-heading font-bold uppercase text-sm">{d.name}</p>
                  <p className="text-xs font-medium text-accent">{d.format}</p>
                  <p className="text-xs text-muted-foreground">{d.level}</p>
                  <p className="text-xs text-muted-foreground">{d.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
          {["Team Registration", "Individual Registration"].map((label) => (
            <Button key={label} asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href="https://tms.ezfacility.com" target="_blank" rel="noopener noreferrer">
                {label} <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "700ms" }}>
          Questions? Email{" "}
          <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
        </p>
      </div>
    </Layout>
  );
};

export default SpringLeague;
