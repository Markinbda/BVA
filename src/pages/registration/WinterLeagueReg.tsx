import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, AlertCircle } from "lucide-react";

const registrationOptions = [
  { label: "Women's Team", type: "team" },
  { label: "Men's Team", type: "team" },
  { label: "Coed Team", type: "team" },
  { label: "Women's Individual", type: "individual" },
  { label: "Men's Individual", type: "individual" },
  { label: "Coed Individual", type: "individual" },
];

const WinterLeagueReg = () => {
  return (
    <Layout>
      <PageHeader title="Winter League Registration" subtitle="2025–26 Season — Indoor 6v6" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="border-accent/40 opacity-0 animate-fade-in">
          <CardContent className="flex gap-3 p-5">
            <AlertCircle className="h-5 w-5 shrink-0 text-accent mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Registration is <strong>first-come, first-served</strong>. Individual registration is available
              but placement is not guaranteed. All participants must maintain an active BVA membership.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" /> Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {[
                { label: "Registration Opens", value: "October 14 at 12:00 AM" },
                { label: "Roster Completion Deadline", value: "October 20" },
                { label: "Registration Closes", value: "October 24" },
                { label: "Season", value: "November – February" },
                { label: "Uniforms Required By", value: "Week 3 (front & back numbers)" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Register Now</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {registrationOptions.map((opt, i) => (
              <Button
                key={opt.label}
                asChild
                variant={opt.type === "team" ? "default" : "outline"}
                className={opt.type === "team" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
              >
                <a href="https://tms.ezfacility.com" target="_blank" rel="noopener noreferrer">
                  {opt.label} <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ))}
          </div>
        </section>

        <p className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          Questions? Email{" "}
          <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          {" "}or{" "}
          <a href="mailto:bvamemberships@gmail.com" className="text-accent hover:underline">bvamemberships@gmail.com</a>
        </p>
      </div>
    </Layout>
  );
};

export default WinterLeagueReg;
