import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import placeholderJunior from "@/assets/placeholder-junior.jpg";
import placeholderNational from "@/assets/BVA-Early.jpg";
import placeholderBeach from "@/assets/placeholder-beach.jpg";
import placeholderCamp from "@/assets/placeholder-camp.jpg";

const programs = [
  {
    title: "Junior Program",
    subtitle: "Paradise Hitters & Big Wave Riders",
    description: "Competitive volleyball programs for boys and girls ages 12-18. Year-round training in indoor and beach volleyball with opportunities to represent Bermuda.",
    path: "/programs/junior",
    image: placeholderJunior,
  },
  {
    title: "Senior National Teams",
    subtitle: "Men's & Women's Teams",
    description: "Bermuda's Men's and Women's National Volleyball Teams competing in ECVA, NORCECA, Island Games, and US Open Championships.",
    path: "/programs/senior",
    image: placeholderNational,
  },
  {
    title: "Beach Volleyball",
    subtitle: "National Beach Program",
    description: "BVA's national beach volleyball program develops athletes for international beach volleyball competition on Bermuda's beautiful beaches.",
    path: "/programs",
    image: placeholderBeach,
  },
  {
    title: "Youth Camps",
    subtitle: "March Break & Summer Camps",
    description: "Week-long volleyball camps for young athletes during school breaks. Fun, skills development, and team building at CedarBridge Academy.",
    path: "/programs/youth-camps",
    image: placeholderCamp,
  },
];

const Programs = () => {
  return (
    <Layout>
      <PageHeader title="Programs" subtitle="Youth development, national teams, and beach volleyball" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {programs.map((prog, i) => (
            <Card key={prog.title} className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="h-2 bg-accent" />
              <div className="h-48 overflow-hidden">
                <img src={prog.image} alt={prog.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <CardHeader>
                <CardTitle className="font-heading text-2xl uppercase">{prog.title}</CardTitle>
                <p className="text-sm font-medium text-accent">{prog.subtitle}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{prog.description}</p>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to={prog.path}>
                    Learn More <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-12 opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <CardContent className="p-8 text-center">
            <h2 className="font-heading text-2xl font-bold uppercase">Interested in a Program?</h2>
            <p className="mt-2 text-muted-foreground">
              Contact us at{" "}
              <a href="mailto:bermudavolleyball@gmail.com" className="text-accent hover:underline">
                bermudavolleyball@gmail.com
              </a>{" "}
              for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Programs;
