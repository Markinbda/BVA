import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const programs = [
  {
    title: "2026 Beach Coaching Clinic",
    desc: "Intensive coaching clinic for players looking to develop elite beach volleyball skills.",
    level: "All levels",
  },
  {
    title: "Play & Train — GOLD",
    desc: "Top-tier beach training program for advanced and elite players.",
    level: "Advanced",
  },
  {
    title: "Play & Train — BLUE",
    desc: "Intermediate beach volleyball development program.",
    level: "Intermediate",
  },
  {
    title: "Play & Train — SILVER",
    desc: "Entry-level beach volleyball program for beginners and recreational players.",
    level: "Beginner/Recreational",
  },
  {
    title: "Play & Train — BLACK",
    desc: "High-performance training program for competitive beach players.",
    level: "Competitive",
  },
];

const levelColors: Record<string, string> = {
  "All levels": "bg-purple-100 text-purple-700",
  "Advanced": "bg-amber-100 text-amber-700",
  "Intermediate": "bg-blue-100 text-blue-700",
  "Beginner/Recreational": "bg-green-100 text-green-700",
  "Competitive": "bg-gray-100 text-gray-700",
};

const BeachRegistration = () => {
  return (
    <Layout>
      <PageHeader title="Beach Registration" subtitle="2026 Beach Programs" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in">
          Below are the Beach programs we have aligned for this year. Click on each to register.
          All participants must maintain an active BVA membership.
        </p>

        <div className="space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          {programs.map((prog, i) => (
            <Card
              key={prog.title}
              className="opacity-0 animate-slide-up transition-shadow hover:shadow-md"
              style={{ animationDelay: `${200 + i * 80}ms` }}
            >
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-heading font-semibold">{prog.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelColors[prog.level]}`}>
                      {prog.level}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{prog.desc}</p>
                </div>
                <Button asChild className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href="https://tms.ezfacility.com" target="_blank" rel="noopener noreferrer">
                    Register <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "700ms" }}>
          Questions? Email{" "}
          <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
        </p>
      </div>
    </Layout>
  );
};

export default BeachRegistration;
