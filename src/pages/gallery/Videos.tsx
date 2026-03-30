import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";

const skills = [
  { title: "Passing (Bumping)", desc: "Learn the fundamentals of forearm passing" },
  { title: "Setting (Volleying)", desc: "Master the overhead set technique" },
  { title: "Underhand Serve", desc: "The basics of the underhand serve" },
  { title: "Spiking", desc: "Attacking the ball with power and precision" },
  { title: "Jump Serve", desc: "Advanced serving for experienced players" },
  { title: "Blocking", desc: "Defensive techniques at the net" },
  { title: "Digging", desc: "Defensive passing of hard-driven attacks" },
];

const Videos = () => {
  return (
    <Layout>
      <PageHeader title="Videos" subtitle="Instructional volleyball skill tutorials" />
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-10">

        <section className="opacity-0 animate-fade-in">
          <h2 className="mb-2 font-heading text-2xl font-bold uppercase">Basic Beach Volleyball Skills</h2>
          <p className="mb-6 text-muted-foreground text-sm">
            Educational video tutorials covering fundamental volleyball skills. Videos sourced from Capt'n Bills.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {skills.map((skill, i) => (
              <Card
                key={skill.title}
                className="group opacity-0 animate-slide-up transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                style={{ animationDelay: `${100 + i * 70}ms` }}
              >
                <div className="relative flex h-32 items-center justify-center bg-muted rounded-t-lg overflow-hidden">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 transition-colors group-hover:bg-accent/40">
                    <Play className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="font-heading font-semibold text-sm uppercase">{skill.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{skill.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "600ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">BVA on YouTube</h2>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <p className="text-muted-foreground text-sm">Watch match highlights and event coverage on the official BVA YouTube channel.</p>
              <a
                href="https://www.youtube.com/@bdavolleyball"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Visit Channel
              </a>
            </CardContent>
          </Card>
        </section>

        <div className="rounded-lg bg-muted p-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: "700ms" }}>
          <p className="text-sm text-muted-foreground">
            Have great match footage to share? Email{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Videos;
