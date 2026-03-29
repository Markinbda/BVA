import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";

const registrationTypes = [
  {
    title: "Summer Beach Leagues",
    description: "Register your team for the BVA Summer Beach Volleyball League. Multiple nights and formats available at Horseshoe Bay and Elbow Beach.",
    period: "Registration opens April each year",
    fee: "$100-200/team",
    linkType: "internal" as const,
    link: "/summer-league",
  },
  {
    title: "Indoor Leagues",
    description: "Register for the BVA Indoor Volleyball League at CedarBridge Academy. Competitive and recreational divisions.",
    period: "Registration opens September",
    fee: "$150/team or $25/individual",
    linkType: "external" as const,
    link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=7228",
  },
  {
    title: "Paradise Hitters (Girls' Junior)",
    description: "Competitive girls' volleyball program for ages 12-18. Year-round training in indoor and beach volleyball.",
    period: "Year-round with seasonal tryouts",
    fee: "$1,000/season (3 installments)",
    linkType: "internal" as const,
    link: "/programs/junior/girls",
  },
  {
    title: "Big Wave Riders (Boys' Junior)",
    description: "Competitive boys' volleyball program for ages 12-18. Structured training and competitive play.",
    period: "Year-round with seasonal tryouts",
    fee: "$1,000/season (3 installments)",
    linkType: "internal" as const,
    link: "/programs/junior/boys",
  },
  {
    title: "Youth Camps",
    description: "March Break volleyball camps for young athletes. A week of fun, skills, and volleyball at CedarBridge Academy.",
    period: "March school break",
    fee: "$300/camp",
    linkType: "internal" as const,
    link: "/programs/youth-camps",
  },
  {
    title: "National Team Tryouts",
    description: "Men's and Women's National Team tryouts for ECVA, NORCECA, Island Games, and US Open competitions.",
    period: "Announced annually",
    fee: "Active BVA membership required",
    linkType: "external" as const,
    link: "mailto:bermudavolleyball@gmail.com",
  },
];

const Registration = () => {
  return (
    <Layout>
      <PageHeader title="Registration" subtitle="Sign up for BVA leagues, tournaments, and programs" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {registrationTypes.map((reg, i) => (
            <Card key={reg.title} className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="h-2 bg-accent" />
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase">{reg.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{reg.description}</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Period:</span> {reg.period}</p>
                  <p><span className="font-semibold">Fee:</span> {reg.fee}</p>
                </div>
                {reg.linkType === "internal" ? (
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link to={reg.link}>
                      Learn More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <a href={reg.link} target="_blank" rel="noopener noreferrer">
                      Register <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Registration;
