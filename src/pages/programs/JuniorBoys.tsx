import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft, DollarSign, CalendarDays, Users } from "lucide-react";

const coachingStaff = [
  { name: "Head Coach", role: "Head Coach", placeholder: "Coach Headshot" },
  { name: "Assistant Coach", role: "Assistant Coach", placeholder: "Coach Headshot" },
  { name: "Team Manager", role: "Team Manager", placeholder: "Manager Headshot" },
];

const JuniorBoys = () => {
  return (
    <Layout>
      <PageHeader title="Big Wave Riders" subtitle="Boys' Junior Volleyball Club" />
      <div className="container mx-auto px-4 py-12">
        <Link to="/programs/junior" className="mb-8 inline-flex items-center gap-2 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Junior Programs
        </Link>

        {/* Hero Image Placeholder */}
        <div className="mb-12 flex h-64 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
          <div className="text-center">
            <span className="text-5xl">🌊</span>
            <p className="mt-2 text-muted-foreground">Big Wave Riders — Team Action Photo</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">About the Program</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Big Wave Riders is BVA's competitive boys' volleyball program, developing young male 
                athletes ages 12-18 in both indoor and beach volleyball. Players learn fundamental skills, 
                advanced techniques, game strategy, and sportsmanship through structured training and 
                competitive play. The program provides pathways to represent Bermuda in regional and 
                international competitions.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Season Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="flex items-start gap-3 p-4">
                    <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="font-semibold">Training Schedule</p>
                      <p className="text-sm text-muted-foreground">Year-round training sessions with seasonal competitions. Practice 2-3 times per week.</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Users className="mt-1 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="font-semibold">Age Groups</p>
                      <p className="text-sm text-muted-foreground">Open to boys ages 12-18. Multiple age divisions for appropriate competition levels.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Coaching Staff</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {coachingStaff.map((coach) => (
                  <Card key={coach.role}>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                      <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
                        <span className="text-xs text-muted-foreground">{coach.placeholder}</span>
                      </div>
                      <p className="font-heading font-semibold uppercase">{coach.name}</p>
                      <p className="text-xs text-accent">{coach.role}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Gallery</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {["Practice Session", "Tournament Play", "Team Building", "Beach Training", "Awards Ceremony", "Group Photo"].map((label) => (
                  <div key={label} className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 text-center">
                    <p className="text-xs text-muted-foreground">📷 {label}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="overflow-hidden">
              <div className="h-2 bg-accent" />
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase">Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-1 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-semibold">Season Fee: $1,000</p>
                    <p className="text-sm text-muted-foreground">Payable in 3 installments</p>
                  </div>
                </div>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href="https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=7228&GroupID=2345292" target="_blank" rel="noopener noreferrer">
                    Register on EZFacility <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-heading font-semibold uppercase">Need Financial Help?</p>
                <p className="mt-2 text-sm text-muted-foreground">Partial scholarships of $500 available.</p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to="/bursary">Apply for Bursary</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="font-heading font-semibold uppercase">Contact</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Email:{" "}
                  <a href="mailto:bermudavolleyball@gmail.com" className="text-accent hover:underline">
                    bermudavolleyball@gmail.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default JuniorBoys;
