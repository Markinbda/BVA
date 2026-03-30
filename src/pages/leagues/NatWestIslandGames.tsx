import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Trophy } from "lucide-react";

const history = [
  { year: "2003", location: "Guernsey", note: "First appearance" },
  { year: "2005", location: "Shetland", note: "Men's best finish — Silver Medal" },
  { year: "2007", location: "Rhodes", note: "Women's fourth place (lost bronze medal match)" },
  { year: "2009", location: "Aland", note: "Women's fourth place (lost bronze medal match)" },
  { year: "2011", location: "Isle of Wight", note: "" },
  { year: "2013", location: "Bermuda (host)", note: "Hosted indoor & beach volleyball" },
];

const NatWestIslandGames = () => {
  return (
    <Layout>
      <PageHeader title="NatWest Island Games" subtitle="Bermuda competing on the international island stage since 2003" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="flex gap-4 p-6">
            <Globe className="h-8 w-8 shrink-0 text-accent mt-1" />
            <p className="text-muted-foreground leading-relaxed">
              The NatWest Island Games is a biennial international sporting competition managed by the
              International Island Games Association. Bermuda has been competing since 2003 across sports
              including volleyball, basketball, athletics, badminton, gymnastics, golf, sailing, tennis,
              swimming, squash, and triathlon.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" /> Participation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {history.map((h) => (
                <div key={h.year} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium">{h.year} — {h.location}</span>
                    {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                  </div>
                  {h.year === "2005" && (
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Silver</span>
                  )}
                  {h.year === "2013" && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Host</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Bermuda 2013 — Host Nation</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm space-y-2">
            <p><strong>Dates:</strong> July 13–19, 2013</p>
            <p><strong>Indoor venues:</strong> Berkeley Institute, Cedarbridge Academy</p>
            <p><strong>Beach venue:</strong> National Sports Center North Field</p>
            <p>Bermuda hosted both indoor and beach volleyball as part of the games.</p>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Volunteer Opportunities</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Positions available include linesman, scorekeeper, and court manager.</p>
            <p>To express interest in volunteering for future Island Games events, contact{" "}
              <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <a href="https://www.biga.bm" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium hover:border-accent hover:text-accent transition-colors">
            <Globe className="h-4 w-4" /> Bermuda Island Games Association
          </a>
          <a href="https://www.islandgames.net" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium hover:border-accent hover:text-accent transition-colors">
            <Globe className="h-4 w-4" /> International Island Games Association
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default NatWestIslandGames;
