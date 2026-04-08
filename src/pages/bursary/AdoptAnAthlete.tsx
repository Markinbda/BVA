import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, DollarSign } from "lucide-react";
import adopt1 from "@/assets/Adopt1.jpg";
import adopt2 from "@/assets/Adopt2.jpg";
import adopt3 from "@/assets/Adopt3.jpg";
import adopt4 from "@/assets/Adopt4.jpg";

const FALLBACK_BG = [adopt1, adopt2, adopt3, adopt4];
const BG_CATEGORY = "Adopt an Athlete Backgrounds";

const tiers = [
  { amount: "$50", desc: "Helps cover a training session" },
  { amount: "$100", desc: "Supports weekly training costs" },
  { amount: "$250", desc: "Contributes to tournament travel" },
  { amount: "$500", desc: "Funds a full competition trip" },
];

const AdoptAnAthlete = () => {
  const [bgPhotos, setBgPhotos] = useState<string[]>(FALLBACK_BG);

  useEffect(() => {
    supabase
      .from("gallery_photos")
      .select("image_url, sort_order")
      .eq("category", BG_CATEGORY)
      .order("sort_order", { ascending: true })
      .limit(4)
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Pad with fallbacks if fewer than 4 exist in DB
          const urls = data.map((r: any) => r.image_url);
          const padded = [...urls, ...FALLBACK_BG].slice(0, 4);
          setBgPhotos(padded);
        }
      });
  }, []);

  return (
    <Layout>
      <div className="relative">
        {/* 2×2 background photo grid — 20% opacity */}
        <div
          className="absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {bgPhotos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              data-adopt-bg={i}
              className="w-full h-full object-cover opacity-20 pointer-events-auto"
            />
          ))}
        </div>

        {/* Page content above the background */}
        <div className="relative z-10">
        <PageHeader title="Adopt-an-Athlete" subtitle="Help our national team athletes pursue excellence" />
        <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">

        <Card className="opacity-0 animate-fade-in">
          <CardContent className="flex gap-4 p-6">
            <Heart className="h-8 w-8 shrink-0 text-accent mt-1" />
            <p className="text-muted-foreground leading-relaxed">
              BVA national team athletes give their time and energy while contributing significantly to the BVA.
              They often balance school or work with training and competition. The Adopt-an-Athlete program enables
              athletes to pursue excellence in sport and leadership that might otherwise be financially unattainable.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">What Your Donation Supports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              {[
                "Training expenses and gym fees",
                "Travel for competitions",
                "Skill development clinics",
                "International competition opportunities",
                "Pathways to athletic scholarships",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <section className="opacity-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">Donation Tiers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tiers.map((tier, i) => (
              <Card
                key={tier.amount}
                className="opacity-0 animate-fade-in transition-shadow hover:shadow-lg hover:-translate-y-1 duration-300"
                style={{ animationDelay: `${300 + i * 80}ms` }}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <DollarSign className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold">{tier.amount}</p>
                    <p className="text-sm text-muted-foreground">{tier.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="opacity-0 animate-slide-up" style={{ animationDelay: "600ms" }}>
          <div className="h-1 bg-accent" />
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">How to Donate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <ol className="space-y-2 list-decimal list-inside">
              <li>Choose your donation level above</li>
              <li>Contact BVA to complete your donation by credit card</li>
              <li>Receive email confirmation and invoice</li>
              <li>Optionally specify a preferred athlete or program in the comments</li>
            </ol>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-gradient-to-br from-primary to-primary/90 p-8 text-center text-primary-foreground opacity-0 animate-fade-in" style={{ animationDelay: "700ms" }}>
          <h3 className="font-heading text-xl font-bold uppercase">Ready to Support an Athlete?</h3>
          <p className="mt-2 text-primary-foreground/70 text-sm">Get in touch and we'll get you set up.</p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <a href="mailto:bdavb@hotmail.com">Contact Us to Donate</a>
          </Button>
        </div>
      </div>
        </div>{/* /relative z-10 */}
      </div>{/* /relative outer */}
    </Layout>
  );
};

export default AdoptAnAthlete;
