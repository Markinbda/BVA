import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

const level1 = [
  "Sarah Robinson", "Rebeka Sousa", "Megan Troake", "Allison Settle",
  "Mike Gazzard", "Denise Somerville", "Ruth Cavanagh", "Joshua Hart",
  "Cynthia Tucker", "Rohan Davis", "Bruce Sinclair", "Jon Noseworthy", "Ian Bucci",
];

const level2 = [
  "Bill Bucci", "Mark Hamilton", "Elisabeth Rae",
  "Juanita Blee", "Gary LeBlanc", "Lisa LeBlanc", "Donna Smith",
];

const cap = [
  { cert: "CAP 1", names: "Juanita Blee, Donna Smith, Brian Amaro" },
  { cert: "CAP 2", names: "Mark Hamilton" },
  { cert: "CAP 3", names: "Bill Bucci" },
];

const CoachingProgram = () => {
  return (
    <Layout>
      <PageHeader title="Coaching Program" subtitle="Developing qualified coaches across Bermuda" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="flex gap-4 p-6">
            <GraduationCap className="h-8 w-8 shrink-0 text-accent mt-1" />
            <div className="space-y-2 text-muted-foreground">
              <p>The BVA offers local Bermuda coaching certifications for regional coaches and supports
              coaches in obtaining US certifications. Annual courses are offered each fall, making them
              particularly convenient for teachers seeking professional development.</p>
              <p>To find out about the next Level 1 coaching certification course, email{" "}
                <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="h-1 bg-accent" />
            <CardHeader>
              <CardTitle className="font-heading text-lg uppercase">Bermuda Level 1 Certified Coaches</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {level1.map((name) => (
                  <li key={name} className="text-sm text-muted-foreground py-1 border-b last:border-0">{name}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="h-1 bg-accent" />
              <CardHeader>
                <CardTitle className="font-heading text-lg uppercase">Bermuda Level 2 Certified Coaches</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {level2.map((name) => (
                    <li key={name} className="text-sm text-muted-foreground py-1 border-b last:border-0">{name}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "300ms" }}>
              <div className="h-1 bg-accent" />
              <CardHeader>
                <CardTitle className="font-heading text-lg uppercase">US CAP Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cap.map((c) => (
                    <div key={c.cert}>
                      <p className="text-sm font-semibold">{c.cert}</p>
                      <p className="text-sm text-muted-foreground">{c.names}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="font-heading text-lg font-semibold">Interested in becoming a certified coach?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact us at{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default CoachingProgram;
