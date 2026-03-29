import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag, Share2, Clock } from "lucide-react";
import placeholderNews from "@/assets/placeholder-news.jpg";

const fallbackArticles = [
  { id: "1", title: "2025 Raffle Winners Announced!", date: "2025-03-01", category: "News", excerpt: "Congratulations to all the winners of the BVA 2025 raffle fundraiser.", content: "Congratulations to all the winners of the BVA 2025 raffle fundraiser. Thank you to everyone who participated and supported the Bermuda Volleyball Association.", image_url: null },
  { id: "2", title: "Bermuda Volleyball Team Wins Silver Medal at Nike Festival", date: "2025-02-01", category: "National Team", excerpt: "Bermuda's women's volleyball team captured a silver medal at the Nike International Volleyball Festival.", content: "Bermuda's women's volleyball team captured a silver medal at the Nike International Volleyball Festival in a thrilling competition.", image_url: null },
  { id: "3", title: "National Volleyball Teams to Compete in US Open", date: "2024-05-01", category: "National Team", excerpt: "Bermuda's men's and women's national volleyball teams will travel to compete in the US Open.", content: "Bermuda's men's and women's national volleyball teams will travel to compete in the US Open Volleyball Championships.", image_url: null },
  { id: "4", title: "Happy 50th BVA!!", date: "2024-05-01", category: "Association", excerpt: "The Bermuda Volleyball Association celebrates its 50th anniversary!", content: "The Bermuda Volleyball Association celebrates its 50th anniversary! A milestone for volleyball in Bermuda.", image_url: null },
  { id: "5", title: "Spring Volleyball League Promotes Inclusiveness", date: "2024-04-01", category: "Leagues", excerpt: "BVA's spring volleyball league continues to promote inclusiveness.", content: "BVA's spring volleyball league continues to promote inclusiveness in the sport across all ages and abilities.", image_url: null },
  { id: "6", title: "Bermuda Volleyball Teams to Compete in Nicaragua", date: "2024-02-01", category: "National Team", excerpt: "Bermuda's national volleyball teams are preparing to travel to Nicaragua.", content: "Bermuda's national volleyball teams are preparing to travel to Nicaragua for international competition.", image_url: null },
];

const NewsArticle = () => {
  const { id } = useParams<{ id: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("*")
        .eq("id", id!)
        .single();
      if (data) return data as any;
      // Try fallback
      return fallbackArticles.find((a) => a.id === id) || null;
    },
    enabled: !!id,
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ["related-news", article?.category, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("*")
        .eq("published", true)
        .neq("id", id!)
        .order("date", { ascending: false })
        .limit(3);
      return (data as any[]) ?? [];
    },
    enabled: !!id && !!article,
  });

  const displayRelated = relatedArticles?.length
    ? relatedArticles
    : fallbackArticles.filter((a) => a.id !== id).slice(0, 3);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const readTime = (content: string | null) => {
    if (!content) return "1 min read";
    const words = content.split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-heading text-4xl font-bold">Article Not Found</h1>
          <p className="mt-4 text-muted-foreground">The article you're looking for doesn't exist.</p>
          <Button asChild className="mt-6">
            <Link to="/news">Back to News</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero image */}
      <div className="relative h-[40vh] min-h-[300px] max-h-[500px] overflow-hidden">
        <img
          src={article.image_url || placeholderNews}
          alt={article.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto max-w-3xl">
            <Link
              to="/news"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/70 hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to News
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
                {article.category}
              </span>
            </div>
            <h1 className="font-heading text-3xl font-bold uppercase leading-tight text-primary-foreground md:text-5xl">
              {article.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Article body */}
      <article className="container mx-auto max-w-3xl px-4 py-12">
        {/* Meta bar */}
        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border pb-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-accent" />
            {formatDate(article.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-accent" />
            {readTime(article.content)}
          </span>
          <span className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-accent" />
            {article.category}
          </span>
        </div>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="mb-8 text-xl font-medium leading-relaxed text-foreground/80 border-l-4 border-accent pl-6">
            {article.excerpt}
          </p>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none text-foreground/80 leading-relaxed">
          {article.content ? (
            article.content.split("\n").map((para: string, i: number) =>
              para.trim() ? <p key={i}>{para}</p> : null
            )
          ) : (
            <p>{article.excerpt}</p>
          )}
        </div>

        {/* Share */}
        <div className="mt-12 flex items-center gap-4 border-t border-border pt-6">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Share2 className="h-4 w-4" /> Share this article
          </span>
        </div>
      </article>

      {/* Related Articles */}
      {displayRelated.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className="mb-8 font-heading text-2xl font-bold uppercase">More News</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {displayRelated.map((related: any) => (
                <Link
                  key={related.id}
                  to={`/news/${related.id}`}
                  className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <img
                    src={related.image_url || placeholderNews}
                    alt={related.title}
                    className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="p-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                      {related.category}
                    </span>
                    <h3 className="mt-1 font-heading text-base font-semibold leading-tight group-hover:text-accent transition-colors">
                      {related.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(related.date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default NewsArticle;
