import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, CalendarDays, Users, DollarSign } from "lucide-react";
import placeholderBeach from "@/assets/placeholder-beach.jpg";

const leagues = [
  { day: "Monday", name: "Recreational 4s", location: "Horseshoe Bay", format: "4v4 Coed", cost: "$450/team", maxTeams: "25 teams", status: "FULL", link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3684816" },
  { day: "Monday", name: "Coed 2s", location: "Elbow Beach", format: "2v2 Coed", cost: "$225/team", maxTeams: "10 teams", status: "", link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3694914" },
  { day: "Tuesday", name: "Men's 2s", location: "Horseshoe Bay", format: "2v2 Men", cost: "$225/team", maxTeams: "15 teams", status: "FULL", link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3684815" },
  { day: "Tuesday", name: "Women's 2s", location: "Horseshoe Bay", format: "2v2 Women", cost: "$225/team", maxTeams: "15 teams", status: "", link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3684814" },
  { day: "Wednesday", name: "Competitive 4s", location: "Horseshoe Bay", format: "4v4 Coed", cost: "$450/team", maxTeams: "25 teams", status: "", link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3684804" },
  { day: "Thursday", name: "Recreational 4s", location: "Horseshoe Bay", format: "4v4 Coed", cost: "$450/team", maxTeams: "25 teams", status: "FULL", link: "https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3684796" },
];

const SummerLeague = () => {
  return (
    <Layout>
      <PageHeader title="Summer League Registration" subtitle="Beach volleyball leagues — May through September" />
      <div className="container mx-auto px-4 py-12">
        {/* Hero Image */}
        <div className="mb-12 overflow-hidden rounded-lg opacity-0 animate-fade-in">
          <img src={placeholderBeach} alt="Summer beach volleyball" className="h-48 w-full object-cover" />
        </div>

        {/* Instructions */}
        <Card className="mb-8 opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <h2 className="mb-3 font-heading text-xl font-bold uppercase">Registration Information for Team Captains & All Participants</h2>
            <p className="mb-4 text-sm text-muted-foreground font-medium">
              Registration is on a first-come, first-served basis. Registration will open at midnight on May 26th and close on May 31st, or once the league is full.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="font-heading text-sm font-semibold uppercase mb-2">Team Captains must:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Register from May 26–31 (or until full)</li>
                  <li>• Pay by credit card at time of registration</li>
                  <li>• Complete team rosters by June 1</li>
                </ul>
              </div>
              <div>
                <p className="font-heading text-sm font-semibold uppercase mb-2">All Participants must:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Ensure BVA membership is up to date</li>
                  <li>• Email <a href="mailto:bvamemberships@gmail.com" className="text-accent hover:underline">bvamemberships@gmail.com</a> to check status</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* League Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league, i) => (
            <Card key={i} className={`overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up ${league.status === "FULL" ? "opacity-75" : ""}`} style={{ animationDelay: `${200 + i * 100}ms` }}>
              <div className="h-2 bg-accent" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">{league.day}</span>
                  {league.status === "FULL" && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">FULL</span>
                  )}
                </div>
                <CardTitle className="font-heading text-xl uppercase">{league.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /><span>{league.location}</span></div>
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><span>{league.format} • {league.maxTeams}</span></div>
                  <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-accent" /><span>{league.cost}</span></div>
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" /><span>May – September</span></div>
                </div>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={league.status === "FULL"}>
                  <a href={league.link} target="_blank" rel="noopener noreferrer">
                    {league.status === "FULL" ? "Full" : "Register"} <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <Card className="mt-12 opacity-0 animate-fade-in" style={{ animationDelay: "800ms" }}>
          <CardContent className="p-8 text-center">
            <h2 className="font-heading text-2xl font-bold uppercase">Questions?</h2>
            <p className="mt-2 text-muted-foreground">
              Contact us at{" "}
              <a href="mailto:bermudavolleyball@gmail.com" className="text-accent hover:underline">
                bermudavolleyball@gmail.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SummerLeague;
