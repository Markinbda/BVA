import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const accounts = [
  {
    platform: "Facebook",
    handle: "BDAVolleyball",
    url: "https://www.facebook.com/bermudavolleyball",
    color: "bg-blue-600",
    desc: "News, events, and match updates",
  },
  {
    platform: "Instagram",
    handle: "@bdavolleyball",
    url: "https://www.instagram.com/bermudavolleyball",
    color: "bg-pink-600",
    desc: "Photos, reels, and stories from BVA events",
  },
  {
    platform: "TikTok",
    handle: "@bdavolleyball",
    url: "https://www.tiktok.com/@bdavolleyball",
    color: "bg-black",
    desc: "Short-form video highlights",
  },
  {
    platform: "YouTube",
    handle: "BVA Official",
    url: "https://www.youtube.com/@bdavolleyball",
    color: "bg-red-600",
    desc: "Match highlights and instructional videos",
  },
];

const SocialMedia = () => {
  return (
    <Layout>
      <PageHeader title="Social Media" subtitle="Follow BVA across all platforms" />
      <div className="container mx-auto max-w-2xl px-4 py-12 space-y-8">

        <p className="text-center text-muted-foreground opacity-0 animate-fade-in">
          Stay up to date with the latest news, photos, and events from the Bermuda Volleyball Association.
        </p>

        <div className="grid gap-4 opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          {accounts.map((a, i) => (
            <a
              key={a.platform}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block opacity-0 animate-fade-in"
              style={{ animationDelay: `${200 + i * 80}ms` }}
            >
              <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${a.color} text-white font-heading font-bold text-sm uppercase`}>
                    {a.platform.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-semibold uppercase">{a.platform}</p>
                    <p className="text-sm text-accent">{a.handle}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <div className="rounded-lg bg-muted p-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
          <p className="text-sm text-muted-foreground">
            Tag us in your volleyball photos! Contact{" "}
            <a href="mailto:bdavb@hotmail.com" className="text-accent hover:underline">bdavb@hotmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SocialMedia;
