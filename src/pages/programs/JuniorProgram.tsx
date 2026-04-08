import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Mail } from "lucide-react";
import placeholderJunior from "@/assets/placeholder-junior.jpg";

const JuniorProgram = () => {
  return (
    <Layout>
      <PageHeader title="Junior Program" subtitle="Developing Bermuda's next generation of volleyball players" />
      <div className="container mx-auto px-4 py-12">
        {/* Hero Image */}
        <div className="mb-12 h-64 overflow-hidden rounded-lg">
          <img src={placeholderJunior} alt="Junior volleyball program" className="h-full w-full object-cover" />
        </div>

        {/* Intro */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-lg text-muted-foreground leading-relaxed">
            The Junior Volleyball Program was created by the BVA to help provide opportunities for young players, 
            with a passion for volleyball, to develop their volleyball skills and help them play volleyball at 
            higher levels once they graduate from high school.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Indoor volleyball training programs generally run from September through April/May of each year, and 
            beach volleyball training programs generally run from March through October (weather dependent). 
            During these times, participants train multiple times a week and typically participate in one or 
            more overseas tournaments along with participation in local leagues and tournaments.
          </p>
        </div>

        {/* Program Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Paradise Hitters */}
          <Card className="group overflow-hidden transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300">
            <div className="h-2 bg-accent" />
            <div className="h-48 overflow-hidden">
              <img src={placeholderJunior} alt="Paradise Hitters" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <CardHeader>
              <CardTitle className="font-heading text-2xl uppercase">Paradise Hitters</CardTitle>
              <p className="text-sm font-medium text-accent">Girls' Volleyball Club</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Paradise Hitters is BVA's competitive girls' volleyball program for ages 12-18. 
                The program focuses on skill development, teamwork, sportsmanship, and competitive play 
                in both indoor and beach volleyball.
              </p>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Ages:</span> 12-18</p>
                <p><span className="font-semibold">Fee:</span> $1,000/season (3 installments available)</p>
                <p><span className="font-semibold">Season:</span> Year-round training with seasonal competitions</p>
              </div>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/programs/junior/girls">
                  Learn More & Register <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Big Wave Riders */}
          <Card className="group overflow-hidden transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300">
            <div className="h-2 bg-accent" />
            <div className="h-48 overflow-hidden">
              <img src={placeholderJunior} alt="Big Wave Riders" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <CardHeader>
              <CardTitle className="font-heading text-2xl uppercase">Big Wave Riders</CardTitle>
              <p className="text-sm font-medium text-accent">Boys' Volleyball Club</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Big Wave Riders program develops young male volleyball players ages 12-18 through 
                structured training and competitive play. Players learn fundamental skills and advanced 
                techniques in both indoor and beach volleyball.
              </p>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Ages:</span> 12-18</p>
                <p><span className="font-semibold">Fee:</span> $1,000/season (3 installments available)</p>
                <p><span className="font-semibold">Season:</span> Year-round training with seasonal competitions</p>
              </div>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/programs/junior/boys">
                  Learn More & Register <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Financial Aid Note */}
        <Card className="mt-12">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Users className="h-10 w-10 text-accent" />
            <h2 className="font-heading text-2xl font-bold uppercase">Need Financial Assistance?</h2>
            <p className="max-w-xl text-muted-foreground">
              BVA offers bursaries and financial aid to ensure all athletes can participate regardless of 
              financial circumstances. Partial scholarships of $500 are available.
            </p>
            <Button asChild variant="outline">
              <Link to="/bursary">Apply for Financial Aid <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mt-8">
          <CardContent className="flex items-center justify-center gap-3 p-6">
            <Mail className="h-5 w-5 text-accent" />
            <p className="text-sm text-muted-foreground">
              Questions? Contact us at{" "}
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

export default JuniorProgram;
