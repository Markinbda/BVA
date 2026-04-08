import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, DollarSign, CalendarDays, MapPin } from "lucide-react";
import placeholderCamp from "@/assets/placeholder-camp.jpg";

const dailySchedule = [
  { time: "8:30 AM", activity: "Drop-off" },
  { time: "9:00 AM", activity: "Warm-up Games / Skills" },
  { time: "10:15 AM", activity: "30 Minute Break / Snacks" },
  { time: "10:45 AM", activity: "Demo / Practice Various Skills & Drills" },
  { time: "12:00 PM", activity: "Lunch" },
  { time: "1:00 PM", activity: "Demo / Practice Various Skills & Drills" },
  { time: "2:15 PM", activity: "15 Minute Break / Snacks" },
  { time: "2:30 PM", activity: "Small sided games" },
  { time: "3:30 PM", activity: "Pick-up" },
];

const YouthCamps = () => {
  return (
    <Layout>
      <PageHeader title="Indoor Youth Camps" subtitle="Fun, skills, and volleyball for young athletes" />
      <div className="container mx-auto px-4 py-12">
        {/* Hero Image */}
        <div className="mb-12 h-64 overflow-hidden rounded-lg opacity-0 animate-fade-in">
          <img src={placeholderCamp} alt="Youth volleyball camp" className="h-full w-full object-cover" />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">2025 March Break Volleyball Camp</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Bermuda Volleyball Association wants you and your friends to participate in our March Break 
                Volleyball Camps. It'll be super easy for you to have fun, learn new skills and then show them 
                off in the awesome game of volleyball.
              </p>
              <p className="mt-3 text-muted-foreground">
                Additional questions may be directed to the BVA at{" "}
                <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
              </p>
              <p className="mt-2 text-sm font-medium text-accent">
                Additional camp information will be sent a week or so before the start.
              </p>
            </section>

            {/* Registration Weeks */}
            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Registration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="overflow-hidden">
                  <div className="h-2 bg-accent" />
                  <CardContent className="p-6 space-y-3">
                    <h3 className="font-heading text-lg font-bold uppercase">Week 1</h3>
                    <p className="text-sm text-muted-foreground">March 24th to March 28th</p>
                    <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      <a href="https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3840374" target="_blank" rel="noopener noreferrer">
                        Register Week 1 <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <div className="h-2 bg-accent" />
                  <CardContent className="p-6 space-y-3">
                    <h3 className="font-heading text-lg font-bold uppercase">Week 2</h3>
                    <p className="text-sm text-muted-foreground">March 31st to April 4th</p>
                    <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      <a href="https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3840376" target="_blank" rel="noopener noreferrer">
                        Register Week 2 <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <Card className="mt-4 overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-heading text-lg font-bold uppercase">Both Weeks (Discounted Rate)</h3>
                  <p className="text-sm text-muted-foreground">March 24th to April 4th</p>
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <a href="https://tms.ezfacility.com/OnlineRegistrations/Register.aspx?CompanyID=6491&GroupID=3840379" target="_blank" rel="noopener noreferrer">
                      Register Both Weeks <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Daily Schedule</h2>
              <div className="space-y-2">
                {dailySchedule.map((item) => (
                  <div key={item.time} className="flex items-center gap-4 rounded-lg border p-3">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Clock className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">{item.time}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.activity}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="overflow-hidden">
              <div className="h-2 bg-accent" />
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase">Camp Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-semibold">March Break Weeks</p>
                    <p className="text-sm text-muted-foreground">Week 1: Mar 24–28 | Week 2: Mar 31–Apr 4</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-1 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-semibold">Cost: $300 per week</p>
                    <p className="text-sm text-muted-foreground">Registration closes Monday, February 3rd</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-semibold">Location</p>
                    <p className="text-sm text-muted-foreground">Warwick Academy Gymnasium</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-semibold">Ages: 8–14</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="font-heading font-semibold uppercase">What to Bring</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>• Athletic clothing & court shoes</li>
                  <li>• Water bottle</li>
                  <li>• Sunscreen (for outdoor activities)</li>
                  <li>• Positive attitude!</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="font-heading font-semibold uppercase">Contact</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Email:{" "}
                  <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">
                    bdavb@hotmail.com
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

export default YouthCamps;
