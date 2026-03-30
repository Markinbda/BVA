import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";

const objectives = [
  { letter: "a", text: "To represent, promote and develop the sport of volleyball in Bermuda." },
  { letter: "b", text: "To seek support from and work cooperatively with organizations, agencies, groups and individuals sharing consistent objectives." },
  { letter: "c", text: "To conduct local, regional and national competitions and events in the sport of volleyball." },
  { letter: "d", text: "To develop athletes, teams, coaches and officials to represent Bermuda at international competitions." },
  { letter: "e", text: "To affiliate with and represent Bermuda to the international body governing the sport of volleyball while upholding its rules." },
  { letter: "f", text: "To act as the sole authority governing the sport volleyball in Bermuda by making, maintaining and enforcing rules." },
  { letter: "g", text: "To raise, use, invest and reinvest funds to support these objectives." },
];

const Mission = () => {
  return (
    <Layout>
      <PageHeader title="Mission" subtitle="Our purpose and guiding principles" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-10">
        <div className="flex items-center gap-3 opacity-0 animate-fade-in">
          <Target className="h-8 w-8 text-accent" />
          <h2 className="font-heading text-3xl font-bold uppercase">BVA Mission Statement</h2>
        </div>

        <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
          The Bermuda Volleyball Association is a volunteer-based charity (#646) and the sole authority governing
          the sport of volleyball in Bermuda. Our mission is guided by the following core objectives:
        </p>

        <div className="space-y-4">
          {objectives.map((obj, i) => (
            <Card
              key={obj.letter}
              className="opacity-0 animate-slide-up transition-shadow hover:shadow-md"
              style={{ animationDelay: `${150 + i * 80}ms` }}
            >
              <CardContent className="flex gap-4 p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 font-heading text-sm font-bold uppercase text-accent">
                  {obj.letter}
                </span>
                <p className="text-muted-foreground leading-relaxed">{obj.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "800ms" }}>
          <p className="text-muted-foreground">
            For more information contact us at{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Rosebank Building, 11 Bermudiana Road, Pembroke HM08</p>
        </div>
      </div>
    </Layout>
  );
};

export default Mission;
