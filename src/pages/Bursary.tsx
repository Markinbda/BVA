import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart } from "lucide-react";

const Bursary = () => {
  return (
    <Layout>
      <PageHeader title="Financial Aid" subtitle="Providing opportunities for all athletes" />
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card className="overflow-hidden opacity-0 animate-slide-up">
          <div className="h-2 bg-accent" />
          <CardContent className="space-y-6 p-8">
            <div className="flex items-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <Heart className="h-8 w-8 text-accent" />
              <h2 className="font-heading text-2xl font-bold uppercase">Our Mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
              Provide an opportunity for any athlete that participates in the Bermuda Volleyball Association's 
              programs, to compete at a high level and promote his/her potential, regardless of financial circumstances.
            </p>
            <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "350ms" }}>
              The Bermuda Volleyball Association makes every attempt to provide those in need with some financial 
              support. The BVA's Financial Aid Committee distributes aid to as many families as possible. In so 
              doing, the BVA finds it necessary to generally provide only partial award amounts toward the total 
              program fees. Only in rare circumstances is the BVA able to offer full support.
            </p>
            <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
              Partial scholarships are available to all players. Generally speaking, under a partial scholarship 
              the athlete will be awarded all or part of the 1st term program fee of <strong>$500</strong>. 
              The athlete will then be responsible for paying subsequent training fees and travel fees if applicable. 
              There are limited partial scholarships.
            </p>

            <div className="opacity-0 animate-fade-in" style={{ animationDelay: "450ms" }}>
              <h3 className="font-heading text-xl font-semibold uppercase">Application / Request Process</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Financial Aid requests are reviewed and awards are made by a committee independent of those 
                involved with decision making on player evaluations and fielding teams.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Click on the link below to complete the online Financial Aid Request Form.
              </p>
              <p className="mt-2 text-sm font-medium text-accent">
                All applications for the 2025-26 Season are due by December 12th, 2025.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-lg bg-muted p-6 text-center opacity-0 animate-scale-in" style={{ animationDelay: "500ms" }}>
              <p className="font-heading text-lg font-semibold">2025-26 Financial Aid Request Form</p>
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <a href="https://forms.gle/WmHzNhWXKZ6z53cRA" target="_blank" rel="noopener noreferrer">
                  Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="space-y-2 text-center text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
              <p>
                For more information on Financial Aid or BVA Bursaries, please email{" "}
                <a href="mailto:bvabursary@hotmail.com" className="text-accent hover:underline">
                  bvabursary@hotmail.com
                </a>
                {" "}or{" "}
                <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">
                  bdavb@hotmail.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Bursary;
