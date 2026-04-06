import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Globe } from "lucide-react";
import placeholderNational from "@/assets/BVA-Early.jpg";

const SeniorProgram = () => {
  return (
    <Layout>
      <PageHeader title="Senior National Teams" subtitle="Representing Bermuda on the international stage" />
      <div className="container mx-auto px-4 py-12">
        {/* History */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-lg text-muted-foreground leading-relaxed">
            The National Team program began in 2002 with the objective of building a tradition of instructional 
            and highly competitive volleyball in Bermuda through excellence in coaching, well-run and 
            well-administered programs, a philosophy of inclusiveness and dedication to each team member.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-12 overflow-hidden rounded-lg">
          <img src={placeholderNational} alt="Bermuda National Teams" className="h-64 w-full object-cover" />
        </div>

        {/* History Detail */}
        <Card className="mb-12">
          <CardContent className="p-8 space-y-4">
            <h2 className="font-heading text-2xl font-bold uppercase">Program History</h2>
            <p className="text-muted-foreground leading-relaxed">
              Since 2002, the growth and success of the indoor NT program has led to Bermuda competing in 
              the NatWest Island Games, international tournaments such as the Boston Bean Pot and the U.S. Open, 
              and the FIVB World Championship Qualification. Bermuda has also hosted its own international 
              tournament, The Bermuda Open, which features competition from Canada and the United States.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The Senior National Teams were created in 2002 in preparation for Bermuda's first participation 
              in the NatWest Island Games in Guernsey (2003). Since then, Bermuda's Senior Teams have participated 
              in the Island Games in Shetland (2005), Rhodes (2007), Åland (2009), Isle of Wight (2011), 
              Bermuda (2013), Jersey (2015) and Gotland (2017).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The Senior Teams also regularly participate in the Bermuda Open, tournaments on the east coast 
              of the US & Canada, and the US Open Nationals. They have also participated in the Caribbean 
              rounds of the World Championship Qualifiers.
            </p>
          </CardContent>
        </Card>

        {/* Teams */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="group overflow-hidden transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300">
            <div className="h-2 bg-accent" />
            <img src={placeholderNational} alt="Men's National Team" className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <CardHeader>
              <CardTitle className="font-heading text-2xl uppercase">Men's National Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bermuda's Men's National Volleyball Team competes in ECVA and NORCECA championships. 
                The team trains year-round with peak season during championship events. Players must 
                maintain BVA membership and participate in local league play.
              </p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span>ECVA Championships</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent" />
                  <span>Island Games</span>
                </div>
              </div>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/programs/senior/mens">
                  Team Details <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300">
            <div className="h-2 bg-accent" />
            <img src={placeholderNational} alt="Women's National Team" className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <CardHeader>
              <CardTitle className="font-heading text-2xl uppercase">Women's National Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bermuda's Women's National Volleyball Team competes in ECVA and NORCECA championships, 
                representing the island at the highest level. The team has achieved notable results including 
                a silver medal at the Nike International Festival.
              </p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span>Nike Festival Silver</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent" />
                  <span>US Open</span>
                </div>
              </div>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/programs/senior/womens">
                  Team Details <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Island Games */}
        <Card className="mt-12">
          <CardContent className="p-8">
            <h2 className="mb-4 font-heading text-2xl font-bold uppercase text-center">NatWest Island Games History</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {[
                { year: "2003", location: "Guernsey" },
                { year: "2005", location: "Shetland" },
                { year: "2007", location: "Rhodes" },
                { year: "2009", location: "Åland" },
                { year: "2011", location: "Isle of Wight" },
                { year: "2013", location: "Bermuda 🏠" },
                { year: "2015", location: "Jersey" },
                { year: "2017", location: "Gotland" },
              ].map((game) => (
                <div key={game.year} className="rounded-lg border p-3 text-center transition-colors hover:border-accent">
                  <p className="font-heading text-lg font-bold text-accent">{game.year}</p>
                  <p className="text-sm text-muted-foreground">{game.location}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expectations */}
        <Card className="mt-8">
          <CardContent className="p-8">
            <h2 className="mb-4 font-heading text-2xl font-bold uppercase text-center">Player Expectations</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="font-heading font-semibold uppercase">Commitment</p>
                <p className="mt-2 text-sm text-muted-foreground">Year-round training attendance, with peak during championship season</p>
              </div>
              <div className="text-center">
                <p className="font-heading font-semibold uppercase">League Play</p>
                <p className="mt-2 text-sm text-muted-foreground">Must participate in BVA local league play during indoor and/or beach seasons</p>
              </div>
              <div className="text-center">
                <p className="font-heading font-semibold uppercase">Fundraising</p>
                <p className="mt-2 text-sm text-muted-foreground">Players participate in fundraising efforts to support team travel and equipment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SeniorProgram;
