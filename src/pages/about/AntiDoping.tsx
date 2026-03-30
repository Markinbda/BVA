import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertCircle } from "lucide-react";

const AntiDoping = () => {
  return (
    <Layout>
      <PageHeader title="Anti-Doping & Drug Testing" subtitle="Committed to clean, fair sport" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="flex gap-4 p-6">
            <ShieldCheck className="h-8 w-8 shrink-0 text-accent mt-1" />
            <p className="text-muted-foreground leading-relaxed">
              The Bermuda Volleyball Association supports, without reservation, drug-free sport. The BVA follows
              all drug testing and anti-doping rules set by the{" "}
              <strong>Bermuda Sport Anti Doping Authority (BSADA)</strong>, which represents the{" "}
              <strong>World Anti-Doping Agency (WADA)</strong> locally.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">Domestic Illicit Drug Program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              BSADA oversees the Domestic Illicit Drug Program, which tests for illegal narcotics.
              All BVA members must consent to random drug testing through their membership applications.
            </p>
            <ul className="space-y-2">
              {[
                "Refusal or failure to comply results in an automatic one-year suspension from all BVA activities.",
                "The BVA maintains member listings with names and contact details in EZ Facility, supplied to BSADA annually.",
                "Up to 10% of membership may be randomly tested in a given year.",
                "Loss of government funding may occur if BSADA requirements are not met.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">Pre-Event & WADA Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Government-mandated pre-event screening applies to athletes and personnel on Bermuda teams competing
              internationally.
            </p>
            <p>
              WADA performance-enhancing drug testing targets elite athletes, coaches, trainers, and team managers
              who are submitted for WADA-sanctioned events (e.g. NatWest Island Games) within 12 months of competition.
            </p>
            <p>
              All members are bound to the WADA Code provisions and BSADA procedural guidelines as a condition
              of BVA membership.
            </p>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="text-muted-foreground">
            Questions about the anti-doping program? Email{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AntiDoping;
