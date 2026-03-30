import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

const bodies = [
  {
    name: "FIVB",
    full: "Fédération Internationale de Volleyball",
    desc: "The international governing authority for all forms of volleyball worldwide. The BVA upholds and enforces FIVB rules in all competitions held in Bermuda.",
    url: "https://www.fivb.com",
  },
  {
    name: "NORCECA",
    full: "North, Central America and Caribbean Volleyball Confederation",
    desc: "The continental confederation overseeing volleyball in North and Central America and the Caribbean. Bermuda competes in NORCECA-sanctioned events.",
    url: "https://www.norceca.net",
  },
  {
    name: "ECVA",
    full: "Eastern Caribbean Volleyball Association",
    desc: "The regional governing body for volleyball in the Eastern Caribbean, of which the BVA is an active member.",
    url: "#",
  },
];

const GoverningBodies = () => {
  return (
    <Layout>
      <PageHeader title="Governing Bodies" subtitle="Our international affiliations" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-10">
        <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in">
          The Bermuda Volleyball Association functions as the sole authority governing the sport of volleyball
          in Bermuda by making, maintaining and enforcing rules consistent with the rules of the FIVB.
          The BVA is affiliated with the following international and regional bodies:
        </p>

        <div className="space-y-4">
          {bodies.map((body, i) => (
            <Card
              key={body.name}
              className="opacity-0 animate-slide-up transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300"
              style={{ animationDelay: `${100 + i * 100}ms` }}
            >
              <CardContent className="flex gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Globe className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-heading text-lg font-bold uppercase">{body.name}</p>
                  <p className="text-sm font-medium text-foreground">{body.full}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{body.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <p className="text-muted-foreground">
            Questions? Contact us at{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default GoverningBodies;
