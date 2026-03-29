const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function firecrawlScrape(url: string, apiKey: string): Promise<{ markdown: string; html: string; links: string[] }> {
  console.log("Firecrawl scraping:", url);
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "links"],
      onlyMainContent: true,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(`Firecrawl error for ${url}: ${JSON.stringify(data.error || data)}`);
  }

  return {
    markdown: data.data?.markdown || data.markdown || "",
    html: data.data?.html || data.html || "",
    links: data.data?.links || data.links || [],
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8211;/g, "–").replace(/&#8230;/g, "…").trim();
}

async function downloadAndUploadImage(imageUrl: string, supabase: any, bucket: string, firecrawlKey: string): Promise<string | null> {
  try {
    // Try direct fetch first, fall back to firecrawl screenshot if SSL fails
    let blob: Blob;
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      blob = await response.blob();
    } catch {
      console.log("Direct fetch failed for image, skipping:", imageUrl);
      return null;
    }

    const urlPath = new URL(imageUrl).pathname;
    const filename = urlPath.split("/").pop() || `img_${Date.now()}.jpg`;
    const storagePath = `wp-import/${filename}`;

    const { error } = await supabase.storage.from(bucket).upload(storagePath, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });

    if (error) {
      console.error("Upload error for", imageUrl, error.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return publicData?.publicUrl || null;
  } catch (e) {
    console.error("Failed to download/upload image:", imageUrl, e);
    return null;
  }
}

interface NewsArticle {
  title: string;
  date: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  category: string;
  published: boolean;
}

interface EventItem {
  title: string;
  date: string;
  end_date: string | null;
  location: string | null;
  cost: string | null;
  description: string | null;
  image_url: string | null;
  published: boolean;
}

function parseNewsFromMarkdown(markdown: string): { title: string; link: string; excerpt: string; date: string; category: string }[] {
  const articles: { title: string; link: string; excerpt: string; date: string; category: string }[] = [];

  // Split by ## headings - each article starts with ## [Title](url)
  const sections = markdown.split(/\n(?=## \[)/);

  for (const section of sections) {
    // Match ## [Title](url)
    const titleMatch = section.match(/^## \[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const link = titleMatch[2];

    // Skip navigation items like "News" heading
    if (title === "News" || title.length < 5) continue;

    // Extract ISO date from the By line: |2026-02-03T06:11:22-04:00February 3rd, 2026|
    const isoDateMatch = section.match(/\|(\d{4}-\d{2}-\d{2})T/);
    const readableDateMatch = section.match(/(\w+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/);
    let date = new Date().toISOString().split("T")[0];
    if (isoDateMatch) {
      date = isoDateMatch[1];
    } else if (readableDateMatch) {
      try {
        const d = new Date(readableDateMatch[1].replace(/(?:st|nd|rd|th)/, ""));
        if (!isNaN(d.getTime())) date = d.toISOString().split("T")[0];
      } catch { /* use default */ }
    }

    // Extract category from [Category Name](url) pattern after the date
    const catMatch = section.match(/\|\s*\[([^\]]+)\]\(https?:\/\/[^)]*events\/category/);
    const category = catMatch ? catMatch[1].trim() : "General";

    // Extract excerpt - lines between the metadata and "Read More", excluding Comments Off
    const lines = section.split("\n")
      .filter(l => l.trim() 
        && !l.startsWith("##") 
        && !l.startsWith("By ") 
        && !l.includes("Read More") 
        && !l.includes("Comments Off")
        && !l.match(/^\|/)
      );
    const excerpt = lines.join(" ").trim().substring(0, 300);

    articles.push({ title, link, excerpt, date, category });
  }

  return articles;
}

function parseEventsFromMarkdown(markdown: string): EventItem[] {
  const events: EventItem[] = [];

  // Try parsing ## [Title](url) format (same as news)
  const newsStyle = parseNewsFromMarkdown(markdown);
  for (const a of newsStyle) {
    events.push({
      title: a.title,
      date: a.date,
      end_date: null,
      location: null,
      cost: null,
      description: a.excerpt || null,
      image_url: null,
      published: true,
    });
  }

  // Also parse calendar-style events: [Event Title](url) within table cells
  const calendarEventRegex = /\[([^\]]{5,})\]\((https?:\/\/www\.bva\.bm\/event\/[^)]+)\)/g;
  const seenCalTitles = new Set(events.map(e => e.title));
  let calMatch;
  while ((calMatch = calendarEventRegex.exec(markdown)) !== null) {
    const title = calMatch[1].trim();
    if (seenCalTitles.has(title)) continue;
    seenCalTitles.add(title);

    // Try to find a date near this match
    const context = markdown.substring(Math.max(0, calMatch.index - 200), calMatch.index + calMatch[0].length + 100);
    const dateMatch = context.match(/(\w+ \d{1,2})\s*@/) || context.match(/(\d{4}-\d{2}-\d{2})/);
    let date = new Date().toISOString().split("T")[0];
    if (dateMatch) {
      try {
        const dateStr = dateMatch[1] + (dateMatch[1].includes("202") ? "" : ", 2026");
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) date = d.toISOString().split("T")[0];
      } catch { /* use default */ }
    }

    // Extract cost
    const costMatch = context.match(/\$(\d+)/);

    events.push({
      title,
      date,
      end_date: null,
      location: null,
      cost: costMatch ? `$${costMatch[1]}` : null,
      description: null,
      image_url: null,
      published: true,
    });
  }

  return events;
}

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /(?:src|href)=["'](https?:\/\/bva\.bm\/wp-content\/uploads\/[^"']+)["']/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }
  return urls;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = { news: 0, events: 0, images: 0, errors: [] as string[] };
    const bucket = "bva-images";

    // ---- SCRAPE NEWS ----
    console.log("Starting news scrape via Firecrawl...");
    const allArticleSummaries: { title: string; link: string; excerpt: string; date: string; category: string }[] = [];

    for (const pageUrl of ["https://bva.bm/news/", "https://bva.bm/news/page/2/"]) {
      try {
        const { markdown, html, links } = await firecrawlScrape(pageUrl, firecrawlKey);
        console.log(`Got ${markdown.length} chars markdown from ${pageUrl}`);
        const parsed = parseNewsFromMarkdown(markdown);
        console.log(`Parsed ${parsed.length} articles from ${pageUrl}`);
        allArticleSummaries.push(...parsed);
      } catch (e) {
        console.error("Failed to scrape news page:", pageUrl, e);
        results.errors.push(`Failed to scrape ${pageUrl}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    console.log(`Found ${allArticleSummaries.length} article summaries total`);

    // Scrape individual articles for images (limit to avoid timeout)
    const newsArticles: NewsArticle[] = [];
    for (const summary of allArticleSummaries) {
      let imageUrl: string | null = null;
      try {
        const { html } = await firecrawlScrape(summary.link, firecrawlKey);
        const imgUrls = extractImageUrls(html);
        if (imgUrls.length > 0) {
          // Try to download and upload to storage
          const uploaded = await downloadAndUploadImage(imgUrls[0], supabase, bucket, firecrawlKey);
          imageUrl = uploaded || imgUrls[0]; // Fall back to WP URL if upload fails
          if (uploaded) results.images++;
        }
      } catch (e) {
        console.log(`Skipping image for "${summary.title}":`, e instanceof Error ? e.message : String(e));
      }

      newsArticles.push({
        title: summary.title,
        date: summary.date,
        excerpt: summary.excerpt,
        content: summary.excerpt,
        image_url: imageUrl,
        category: summary.category,
        published: true,
      });
    }

    // Clear existing news and insert
    if (newsArticles.length > 0) {
      await supabase.from("news_articles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      for (const article of newsArticles) {
        const { error } = await supabase.from("news_articles").insert(article);
        if (error) {
          console.error("Insert news error:", error.message);
          results.errors.push(`News: ${article.title} - ${error.message}`);
        } else {
          results.news++;
        }
      }
    }

    // ---- SCRAPE EVENTS ----
    console.log("Starting events scrape via Firecrawl...");
    let allEvents: EventItem[] = [];

    for (const eventUrl of ["https://bva.bm/events/", "https://bva.bm/events/list/"]) {
      try {
        const { markdown } = await firecrawlScrape(eventUrl, firecrawlKey);
        console.log(`Got ${markdown.length} chars markdown from ${eventUrl}`);
        const parsed = parseEventsFromMarkdown(markdown);
        console.log(`Parsed ${parsed.length} events from ${eventUrl}`);
        allEvents.push(...parsed);
      } catch (e) {
        console.error("Failed to scrape events:", eventUrl, e);
        results.errors.push(`Failed to scrape ${eventUrl}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Deduplicate events by title
    const seenTitles = new Set<string>();
    allEvents = allEvents.filter(e => {
      if (seenTitles.has(e.title)) return false;
      seenTitles.add(e.title);
      return true;
    });

    console.log(`Found ${allEvents.length} unique events`);

    // Clear existing events and insert
    if (allEvents.length > 0) {
      await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      for (const event of allEvents) {
        const { error } = await supabase.from("events").insert(event);
        if (error) {
          console.error("Insert event error:", error.message);
          results.errors.push(`Event: ${event.title} - ${error.message}`);
        } else {
          results.events++;
        }
      }
    }

    console.log("Import complete:", results);

    return new Response(JSON.stringify({
      success: true,
      results,
      message: `Imported ${results.news} news articles, ${results.events} events, and ${results.images} images.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
