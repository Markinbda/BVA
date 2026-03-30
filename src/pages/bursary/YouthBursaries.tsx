import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle, ExternalLink } from "lucide-react";

const eligibility = [
  "Must be a current Junior National Team (JNT) member",
  "Must be in financial good standing with cash call payments",
  "Must demonstrate outstanding ability and potential to compete at national and international level",
];

const criteria = [
  "Succession planning and positional needs of the team",
  "Depth in specialised roles (setters, liberos)",
  "Team impact and future potential",
  "Leadership abilities",
  "Previous applications and awards received",
];

const conditions = [
  "Sign a bursary contract",
  "Maintain JNT participation throughout the award year",
  "Submit post-experience written reports with photos",
  "Comply with the player Code of Conduct",
  "Demonstrate appropriate sportsmanship",
];

const YouthBursaries = () => {
  return (
    <Layout>
      <PageHeader title="Youth Bursaries" subtitle="BVA Junior Development Award Bursary" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="flex gap-4 p-6">
            <Award className="h-8 w-8 shrink-0 text-accent mt-1" />
            <p className="text-muted-foreground leading-relaxed">
              The BVA Junior Development Award Bursary provides annual funding to Junior National Team athletes.
              Four volleyball bursaries are awarded annually — two to female candidates and two to male candidates.
              The program supports talented players' skill development and provides access to elite coaching and
              training standards.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Eligibility", items: eligibility, delay: 100 },
            { title: "Selection Criteria", items: criteria, delay: 200 },
            { title: "Award Conditions", items: conditions, delay: 300 },
          ].map((section) => (
            <Card key={section.title} className="opacity-0 animate-slide-up" style={{ animationDelay: `${section.delay}ms` }}>
              <div className="h-1 bg-accent" />
              <CardHeader>
                <CardTitle className="font-heading text-base uppercase">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">Eligible Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Coverage includes airfare, camp registration fees, and accommodations up to the total value of the bursary.
              Reimbursement is made following submission of proof of payment.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-4 rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <p className="font-heading text-lg font-semibold">Apply for a Youth Bursary</p>
          <p className="text-sm text-muted-foreground">Contact the BVA to receive an application form.</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <a href="mailto:bvabursary@hotmail.com">
              Email bvabursary@hotmail.com <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default YouthBursaries;
