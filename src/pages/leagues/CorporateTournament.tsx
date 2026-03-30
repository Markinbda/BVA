import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Flag, Users } from "lucide-react";

const options = [
  {
    icon: Users,
    title: "Sponsor a Team",
    desc: "Recruit 6+ employees and spouses. Minimal experience required. Focus on socialising, team building, and wellness support.",
  },
  {
    icon: Flag,
    title: "Sponsor a Net",
    desc: "Includes net signage with company logos. Advertising on scoresheets, schedules, and event announcements.",
  },
  {
    icon: Building2,
    title: "Sponsor Both",
    desc: "Combines team and net sponsorship for maximum marketing exposure at the event.",
  },
];

const CorporateTournament = () => {
  return (
    <Layout>
      <PageHeader title="Corporate Tournament" subtitle="Annual spring co-ed fundraising tournament for businesses" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="p-6 text-muted-foreground leading-relaxed">
            An annual spring recreational co-ed fundraising tournament that welcomes companies of all sizes.
            A family-friendly event featuring music, volleyball, and outdoor activities. Non-BVA members are
            welcome — a great way to introduce new players to volleyball and build team spirit.
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Participation Options</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {options.map((opt, i) => (
              <Card
                key={opt.title}
                className="opacity-0 animate-fade-in transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div className="h-1 bg-accent" />
                <CardContent className="p-5 space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <opt.icon className="h-5 w-5 text-accent" />
                  </div>
                  <p className="font-heading font-bold uppercase text-sm">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "500ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader><CardTitle className="font-heading text-xl uppercase">Registration & Requirements</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Registration is available online. Payment is due at registration; invoices are sent via email.</p>
            <p>Waivers must be completed at tournament check-in.</p>
            <p>Teams are encouraged to bring banners, flags, and tents for promotion on the day.</p>
            <p>Companies interested in donating items for participant gift bags should contact{" "}
              <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <a href="mailto:bdavb@hotmail.com">Register Your Company</a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CorporateTournament;
