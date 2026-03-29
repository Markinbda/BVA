import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check } from "lucide-react";

const tiers = [
  {
    name: "Youth",
    price: "Free",
    period: "Until age 18",
    description: "Youth membership is for anyone age 18 and under. Membership will continue through September 30 of the year you turn 18.",
    features: ["Under 18", "Access to youth programs", "League eligibility"],
    highlight: false,
    link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=2345292",
  },
  {
    name: "2-Year",
    price: "$50",
    period: "October 2025 – September 2027",
    description: "Two-year membership giving you access to all BVA programs.",
    features: ["Full membership", "League eligibility", "Voting rights", "Tournament access"],
    highlight: false,
    link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3035631",
  },
  {
    name: "5-Year",
    price: "$100",
    period: "October 2025 – September 2030",
    description: "Five-year membership — best value for committed players.",
    features: ["Full membership", "League eligibility", "Voting rights", "Tournament access", "Best value"],
    highlight: true,
    link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3035638",
  },
  {
    name: "Lifetime",
    price: "$150",
    period: "Pay once and be done! 🙂",
    description: "Lifetime membership — never worry about renewals again.",
    features: ["Full membership", "League eligibility", "Voting rights", "Tournament access", "Never renew again"],
    highlight: false,
    link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=2339892",
  },
];

const Membership = () => {
  return (
    <Layout>
      <PageHeader title="Membership Registration" subtitle="Join the BVA family — membership year runs Oct 1 to Sep 30" />
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl text-center mb-12 opacity-0 animate-fade-in">
          <p className="text-lg text-muted-foreground leading-relaxed">
            All BVA Leagues and Clinics (and most other BVA events throughout the year), require a current paid BVA membership.
            Not a member? Not a problem — you can register online in minutes and the membership fee can be easily paid by credit card.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => (
            <Card key={tier.name} className={`overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up ${tier.highlight ? "ring-2 ring-accent" : ""}`} style={{ animationDelay: `${i * 120}ms` }}>
              <div className={`h-2 ${tier.highlight ? "bg-accent" : "bg-primary"}`} />
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-xl uppercase">{tier.name}</CardTitle>
                <p className="font-heading text-4xl font-bold text-accent">{tier.price}</p>
                <p className="text-xs text-muted-foreground">{tier.period}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={tier.link} target="_blank" rel="noopener noreferrer">
                    Join Now <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          BVA membership year runs <strong>October 1st – September 30th</strong>. For any questions on your membership status, please email{" "}
          <a href="mailto:bvamemberships@gmail.com" className="text-accent hover:underline">bvamemberships@gmail.com</a>
        </p>
      </div>
    </Layout>
  );
};

export default Membership;
