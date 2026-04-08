import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import placeholderNews from "@/assets/placeholder-news.jpg";

const fallbackArticles = [
  { id: "1", title: "2025 Raffle Winners Announced!", date: "2025-03-01", category: "News", excerpt: "Congratulations to all the winners of the BVA 2025 raffle fundraiser.", image_url: null },
  { id: "2", title: "Bermuda Volleyball Team Wins Silver Medal at Nike Festival", date: "2025-02-01", category: "National Team", excerpt: "Bermuda's women's volleyball team captured a silver medal at the Nike International Volleyball Festival.", image_url: null },
  { id: "3", title: "National Volleyball Teams to Compete in US Open", date: "2024-05-01", category: "National Team", excerpt: "Bermuda's men's and women's national volleyball teams will travel to compete in the US Open.", image_url: null },
  { id: "4", title: "Happy 50th BVA!!", date: "2024-05-01", category: "Association", excerpt: "The Bermuda Volleyball Association celebrates its 50th anniversary!", image_url: null },
  { id: "5", title: "Spring Volleyball League Promotes Inclusiveness", date: "2024-04-01", category: "Leagues", excerpt: "BVA's spring volleyball league continues to promote inclusiveness.", image_url: null },
  { id: "6", title: "Bermuda Volleyball Teams to Compete in Nicaragua", date: "2024-02-01", category: "National Team", excerpt: "Bermuda's national volleyball teams are preparing to travel to Nicaragua.", image_url: null },
];

const News = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["news-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("*")
        .eq("published", true)
        .order("date", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const displayArticles = articles?.length ? articles : fallbackArticles;

  return (
    <Layout>
      <PageHeader title="News" subtitle="Stay up to date with the latest from BVA" />
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayArticles.map((article: any, i: number) => (
              <Link to={`/news/${article.id}`} key={article.id} className="group">
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="h-2 bg-accent" />
                  <img src={article.image_url || placeholderNews} alt={article.title} data-db-image="1" className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <CardHeader className="pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent">{article.category}</span>
                    <CardTitle className="font-heading text-lg leading-tight group-hover:text-accent transition-colors">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{article.excerpt}</p>
                    <p className="mt-3 text-xs text-muted-foreground/70">{article.date}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default News;
