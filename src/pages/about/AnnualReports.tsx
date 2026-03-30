import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const recentReports = [
  { year: "2020–21", label: "2020-21 BVA Annual Report" },
  { year: "2019–20", label: "2019-20 BVA Annual Report" },
  { year: "2018–19", label: "2018-19 BVA Annual Report" },
  { year: "2017–18", label: "2017-18 BVA Annual Report" },
];

const earlierReports = [
  "2016–2017", "2015–2016", "2014–2015", "2013–2014",
  "2012–2013", "2010–2011", "2008–2009", "2007–2008", "2006–2007",
];

const AnnualReports = () => {
  return (
    <Layout>
      <PageHeader title="Annual Reports" subtitle="Transparency and accountability in our operations" />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-10">
        <section className="opacity-0 animate-fade-in">
          <h2 className="mb-6 font-heading text-2xl font-bold uppercase">Recent Reports</h2>
          <div className="space-y-3">
            {recentReports.map((r, i) => (
              <Card
                key={r.year}
                className="opacity-0 animate-slide-up transition-shadow hover:shadow-md"
                style={{ animationDelay: `${100 + i * 80}ms` }}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-accent" />
                    <span className="font-medium">{r.label}</span>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Earlier Reports</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {earlierReports.map((year) => (
              <div
                key={year}
                className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground hover:border-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <FileText className="h-4 w-4 shrink-0 text-accent" />
                {year}
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-lg bg-muted p-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
          <p className="text-muted-foreground">
            For annual report inquiries contact{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AnnualReports;
