import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, CalendarDays, DollarSign } from "lucide-react";

const coachingStaff = [
  { name: "Gary LeBlanc", role: "Head Coach" },
  { name: "Brandon Sousa", role: "Assistant Coach" },
  { name: "Team Manager", role: "Team Manager" },
];

const rosterPlaceholders = Array.from({ length: 12 }, (_, i) => ({
  name: `Player ${i + 1}`,
  position: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite", "Libero", "Outside Hitter"][i % 6],
}));

const WomensNationalTeam = () => {
  return (
    <Layout>
      <PageHeader title="Women's National Team" subtitle="Representing Bermuda in international volleyball" />
      <div className="container mx-auto px-4 py-12">
        <Link to="/programs/senior" className="mb-8 inline-flex items-center gap-2 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Senior Programs
        </Link>

        <div className="mb-12 flex h-64 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-primary/20">
          <div className="text-center">
            <span className="text-5xl">🏐</span>
            <p className="mt-2 text-muted-foreground">Women's National Team — Action Photo</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">About the Team</h2>
              <p className="text-muted-foreground leading-relaxed">
                Bermuda's Women's National Volleyball Team competes in ECVA and NORCECA championships, 
                representing the island at the highest level of competition. Recent achievements include 
                a silver medal at the Nike International Volleyball Festival and participation in the 
                US Open Volleyball Championships. The team is committed to excellence, teamwork, and 
                growing women's volleyball in Bermuda.
              </p>
            </section>

            {/* Coaching Staff */}
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Coaching Staff</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {coachingStaff.map((coach) => (
                  <Card key={coach.role}>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                      <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-primary/20">
                        <span className="text-xs text-muted-foreground">Headshot</span>
                      </div>
                      <p className="font-heading font-semibold uppercase">{coach.name}</p>
                      <p className="text-xs text-accent">{coach.role}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Roster */}
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Roster</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {rosterPlaceholders.map((player, i) => (
                  <Card key={i}>
                    <CardContent className="flex flex-col items-center p-3 text-center">
                      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/10 to-primary/10">
                        <span className="text-[10px] text-muted-foreground">Photo</span>
                      </div>
                      <p className="text-sm font-semibold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.position}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Gallery */}
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Gallery</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {["Nike Festival", "Match Action", "Team Celebration", "Training Camp", "US Open", "Awards"].map((label) => (
                  <div key={label} className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-accent/10 to-primary/10">
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
                <CardTitle className="font-heading text-xl uppercase">Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Nike Festival Silver Medal",
                  "ECVA Championships",
                  "US Open Participation",
                  "NORCECA Events",
                  "Island Games",
                ].map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span>{a}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase">Training Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <p>Year-round, with peak during championship season</p>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <p>Players fundraise to support travel and equipment costs</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Active BVA membership</p>
                <p>• Participation in local league play</p>
                <p>• Consistent training attendance</p>
                <p>• Fundraising participation</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="font-heading font-semibold uppercase">Interested?</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Contact{" "}
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

export default WomensNationalTeam;
