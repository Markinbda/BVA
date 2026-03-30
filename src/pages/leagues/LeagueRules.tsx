import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Download } from "lucide-react";

const LeagueRules = () => {
  return (
    <Layout>
      <PageHeader title="League Rules" subtitle="Official rules governing BVA leagues and competitions" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in">
          Volleyball is a fast, exciting sport featuring explosive action with several crucial overlapping
          elements. All BVA competitions are governed by local league rules consistent with FIVB regulations.
        </p>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" /> BVA League Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium">BVA League Rules — Amended 19 Oct 2021</p>
              <p className="text-sm text-muted-foreground">Official rules document (PDF)</p>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:bdavb@hotmail.com">
                <Download className="mr-2 h-4 w-4" /> Request PDF
              </a>
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="font-heading text-2xl font-bold uppercase">FIVB Official Rule Books</h2>
          <p className="text-sm text-muted-foreground">
            BVA follows FIVB rules for all competitions. The latest rule books are available on the FIVB website:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-medium text-sm">Indoor Volleyball Rules</p>
                  <p className="text-xs text-muted-foreground">2017–2020 Edition</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <a href="https://www.fivb.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-medium text-sm">Beach Volleyball Rules</p>
                  <p className="text-xs text-muted-foreground">2017–2020 Edition</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <a href="https://www.fivb.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="text-muted-foreground text-sm">
            Questions about league rules? Email{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default LeagueRules;
