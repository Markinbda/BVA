import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, Users } from "lucide-react";

const divisions = [
  { name: "Women's Division", desc: "Competitive and recreational women's 6v6 indoor league" },
  { name: "Men's Division", desc: "Competitive and recreational men's 6v6 indoor league" },
  { name: "Coed Division", desc: "Mixed teams with standard coed rules, all skill levels" },
];

const timeline = [
  { label: "Registration Opens", value: "October 14 at 12:00 AM (first-come, first-served)" },
  { label: "Roster Completion Deadline", value: "October 20" },
  { label: "Registration Closes", value: "October 24" },
  { label: "Season Runs", value: "November – February" },
];

const WinterLeague = () => {
  return (
    <Layout>
      <PageHeader title="Winter League" subtitle="2025–26 Indoor 6v6 — Women's, Men's & Coed" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="p-6 text-muted-foreground leading-relaxed">
            6-a-side indoor volleyball leagues with Women's, Men's, and Coed divisions. Teams register together
            and are placed using a ladder system — teams move up or down weekly based on win/loss records.
            Individual registration is also available, though placement is not guaranteed.
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Divisions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {divisions.map((d, i) => (
              <Card key={d.name} className="opacity-0 animate-fade-in transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <div className="h-1 bg-accent" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-accent" />
                    <p className="font-heading font-semibold uppercase text-sm">{d.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{d.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" /> Registration Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {timeline.map((t) => (
                <div key={t.label} className="flex justify-between py-3">
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-sm text-muted-foreground text-right max-w-[55%]">{t.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "500ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Requirements</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>All participants must maintain an active BVA membership.</p>
            <p>Teams must wear matching uniforms with front and back numbers by Week 3. Point deductions apply after this deadline.</p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
          {["Women's Team", "Men's Team", "Coed Team"].map((label) => (
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
          {" "}or{" "}
          <a href="mailto:bvamemberships@gmail.com" className="text-accent hover:underline">bvamemberships@gmail.com</a>
        </p>
      </div>
    </Layout>
  );
};

export default WinterLeague;
