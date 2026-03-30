import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import bvaLogo from "@/assets/bva-logo.jpg";

const milestones = [
  { year: "1973", event: "Bermuda Volleyball Association founded" },
  { year: "2003", event: "First NatWest Island Games appearance (Guernsey)" },
  { year: "2005", event: "Men's team wins Silver at NatWest Island Games in Shetland" },
  { year: "2007", event: "Women's team finishes 4th at Island Games in Rhodes" },
  { year: "2009", event: "Women's team finishes 4th at Island Games in Aland" },
  { year: "2013", event: "Bermuda hosts NatWest Island Games — indoor & beach volleyball" },
  { year: "2019", event: "Women's team earns Silver at Nike International Volleyball Festival" },
  { year: "2023+", event: "50 years of volleyball in Bermuda celebrated" },
];

const History = () => {
  return (
    <Layout>
      <PageHeader title="History" subtitle="Fifty years of volleyball in Bermuda" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-10">

        <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-in">
          <img src={bvaLogo} alt="BVA Logo" className="h-28 w-28 rounded-full object-contain" />
          <p className="text-center text-muted-foreground max-w-xl leading-relaxed">
            The Bermuda Volleyball Association has been established for more than 50 years. As the official
            Sports Governing Body for Volleyball in Bermuda, the BVA is affiliated with the ECVA, NORCECA,
            and FIVB. It is a volunteer-based charity (#646) whose mission is to grow the sport of volleyball
            in Bermuda.
          </p>
        </div>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-6 font-heading text-2xl font-bold uppercase">Key Milestones</h2>
          <div className="relative border-l-2 border-accent/30 pl-6 space-y-6">
            {milestones.map((m, i) => (
              <div key={m.year} className="relative opacity-0 animate-fade-in" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <span className="absolute -left-[1.65rem] flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 border-2 border-accent text-[10px] font-bold text-accent ring-2 ring-background" />
                <p className="font-heading text-sm font-bold text-accent">{m.year}</p>
                <p className="text-muted-foreground">{m.event}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "900ms" }}>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>
              Do you have historical photos or stories to share? Email{" "}
              <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default History;
