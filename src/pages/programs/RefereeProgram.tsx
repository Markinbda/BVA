import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink } from "lucide-react";

const benefits = [
  "Level I or II National Certified Referee status upon completion",
  "Eligible for paid officiating positions in BVA leagues and tournaments",
  "Full knowledge of volleyball rules and regulations",
  "Certification is free for current BVA members",
];

const structure = [
  { step: "1", title: "Theory Component", desc: "Study official volleyball rules and regulations from FIVB rule books." },
  { step: "2", title: "Practical Evaluation", desc: "Demonstrate your officiating skills in a supervised match setting." },
  { step: "3", title: "Candidacy Exam", desc: "Written exam covering rules and officiating procedures." },
];

const resources = [
  "Official Volleyball Rules 2017–2020",
  "FIVB Casebook 2020",
  "FIVB Refereeing Guidelines and Instructions 2020 Edition",
];

const RefereeProgram = () => {
  return (
    <Layout>
      <PageHeader title="Referee Program" subtitle="Become a certified volleyball official" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">Program Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Course Structure</h2>
          <div className="space-y-4">
            {structure.map((s, i) => (
              <Card key={s.step} className="opacity-0 animate-slide-up" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <CardContent className="flex gap-4 p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 font-heading font-bold text-accent">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "500ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">Registration Details</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2">
            <p><strong>Cost:</strong> Free</p>
            <p><strong>Requirement:</strong> Must be a current BVA member</p>
            <p><strong>Registration:</strong> Online or verify membership at{" "}
              <a href="mailto:bvamemberships@gmail.com" className="text-accent hover:underline">bvamemberships@gmail.com</a>
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "600ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">Reference Materials (FIVB)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-4 rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "700ms" }}>
          <p className="font-heading text-lg font-semibold">Register for the Next Course</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <a href="mailto:bdavb@hotmail.com">
              Contact BVA <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default RefereeProgram;
