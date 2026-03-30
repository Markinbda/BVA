import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Trophy } from "lucide-react";

const schedule = [
  { day: "Thursday", time: "6:00 PM onwards" },
  { day: "Friday", time: "6:00 PM onwards" },
  { day: "Saturday", time: "9:00 AM – 6:00 PM" },
];

const results2019 = [
  { division: "Women's Gold", result: "Mt. Allison University defeated Island Spice" },
  { division: "Men's Competition", result: "Featured Ace Boyz and Big Wave Riders" },
];

const BermudaOpen = () => {
  return (
    <Layout>
      <PageHeader title="Bermuda Open" subtitle="International volleyball tournament hosted in Bermuda" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="p-6 text-muted-foreground leading-relaxed">
            The Bermuda Open is a signature international tournament hosting senior and junior volleyball teams
            from across North America. Open to women's and men's senior and junior teams from the US and Canada,
            it gives visiting teams a chance to compete — and explore the island.
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <MapPin className="h-4 w-4" />
                <span className="font-heading text-sm font-semibold uppercase">Venue</span>
              </div>
              <p className="text-muted-foreground text-sm">Warwick Academy Gym, Bermuda</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <Calendar className="h-4 w-4" />
                <span className="font-heading text-sm font-semibold uppercase">When</span>
              </div>
              <p className="text-muted-foreground text-sm">Scheduled weekends in May each year</p>
            </CardContent>
          </Card>
        </div>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Tournament Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {schedule.map((s) => (
                <div key={s.day} className="flex justify-between py-3">
                  <span className="font-medium text-sm">{s.day}</span>
                  <span className="text-sm text-muted-foreground">{s.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" /> 2019 Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {results2019.map((r) => (
                <div key={r.division} className="flex justify-between py-3">
                  <span className="font-medium text-sm">{r.division}</span>
                  <span className="text-sm text-muted-foreground text-right max-w-[55%]">{r.result}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Registration</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm space-y-2">
            <p>Accommodates 6 male and 6 female overseas teams on a first-come, first-served basis.</p>
            <p>Previous years featured competitive matches between Bermuda national teams and visiting college/club squads from Canada and the US.</p>
          </CardContent>
        </Card>

        <div className="flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <a href="mailto:bdavb@hotmail.com">Register by Email</a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default BermudaOpen;
