import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Globe, Trophy, GraduationCap, Heart, Award } from "lucide-react";
import placeholderNational from "@/assets/placeholder-national.jpg";
import bvaLogo from "@/assets/bva-logo.jpg";

const offerings = [
  { icon: Trophy, label: "Leagues & Tournaments" },
  { icon: Users, label: "National Teams" },
  { icon: GraduationCap, label: "Coaching Courses" },
  { icon: Heart, label: "Youth Development" },
  { icon: Globe, label: "International Competition" },
  { icon: Award, label: "Referee Certification" },
];

const About = () => {
  return (
    <Layout>
      <PageHeader title="About Us" subtitle="Promoting volleyball in Bermuda for over 50 years" />
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-12">
        {/* Logo Placeholders */}
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-0 animate-fade-in">
          <img src={bvaLogo} alt="Bermuda Volleyball Association Logo" className="h-32 w-32 rounded-full object-contain" />
        </div>

        {/* History */}
        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Our History</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Bermuda Volleyball Association has been established for more than 40 years. We are the official 
            Sports Governing Body for Volleyball in Bermuda. We are part of the ECVA, NORCECA and FIVB. We offer 
            recreational indoor & beach leagues and tournaments, referee and coaching courses, youth development 
            programs and manage the national team program for juniors and seniors. We are a volunteer based 
            charity (#646) whose mission is to grow the sport of Volleyball in Bermuda.
          </p>
        </section>

        {/* Image */}
        <div className="overflow-hidden rounded-lg opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <img src={placeholderNational} alt="BVA National Teams" className="h-48 w-full object-cover" />
        </div>

        {/* Affiliations */}
        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <h2 className="mb-4 font-heading text-3xl font-bold uppercase">Affiliations</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "ECVA", full: "Eastern Caribbean Volleyball Association", desc: "Regional governing body for volleyball in the Eastern Caribbean" },
              { name: "NORCECA", full: "North, Central America and Caribbean Volleyball Confederation", desc: "Continental confederation overseeing volleyball in North and Central America and the Caribbean" },
              { name: "FIVB", full: "Fédération Internationale de Volleyball", desc: "International governing body for all forms of volleyball worldwide" },
            ].map((aff, i) => (
              <Card key={aff.name} className="opacity-0 animate-slide-up transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300" style={{ animationDelay: `${400 + i * 100}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="h-5 w-5 shrink-0 text-accent" />
                    <span className="font-heading font-semibold uppercase">{aff.name}</span>
                  </div>
                  <p className="text-sm font-medium">{aff.full}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{aff.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* What we offer */}
        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "500ms" }}>
          <h2 className="mb-6 font-heading text-3xl font-bold uppercase">What We Offer</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {offerings.map((item, i) => (
              <div key={item.label} className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all duration-300 hover:border-accent hover:-translate-y-1 hover:shadow-md opacity-0 animate-fade-in" style={{ animationDelay: `${600 + i * 80}ms` }}>
                <item.icon className="h-8 w-8 text-accent" />
                <span className="font-heading text-xs font-semibold uppercase">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "800ms" }}>
          <h2 className="font-heading text-2xl font-bold uppercase">Get in Touch</h2>
          <p className="mt-2 text-muted-foreground">
            Email us at{" "}
            <a href="mailto:bermudavolleyball@gmail.com" className="text-accent hover:underline">
              bermudavolleyball@gmail.com
            </a>
          </p>
        </section>
      </div>
    </Layout>
  );
};

export default About;
