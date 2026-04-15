/**
 * youtube-sync
 *
 * Polls the BVA YouTube channel and:
 *   1. Imports any uploaded videos not yet in coach_videos (video_provider='youtube')
 *   2. Fetches all created playlists and upserts them into youtube_playlists table
 *   3. Tags imported videos with the playlist titles they belong to (as categories)
 *
 * The caller's user ID is used as coach_id for newly imported videos.
 *
 * Returns: { imported, skipped, total, playlists }
 *
 * Required Supabase secrets:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const okResp  = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const errResp = (msg: string)   => new Response(JSON.stringify({ error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ── OAuth ──────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("YOUTUBE_REFRESH_TOKEN")!,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

// ── YouTube API helpers ────────────────────────────────────────────────────

async function ytGet(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

/** Fetches all pages of a paginated YouTube list endpoint (max `cap` items). */
async function fetchAllPages(baseUrl: string, token: string, cap = 300): Promise<any[]> {
  const items: any[] = [];
  let pageToken: string | undefined;
  while (items.length < cap) {
    const url  = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
    const data = await ytGet(url, token);
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errResp("Unauthorized");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return errResp("Unauthorized");

    // Service-role client for DB writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = await getAccessToken();

    // ── 1. Get channel uploads playlist ID ──────────────────────────────────
    // Support explicit channel ID (needed for Brand Accounts where mine=true
    // returns the personal account channel, not the Brand Account channel)
    const channelId = Deno.env.get("YOUTUBE_CHANNEL_ID");
    const channelUrl = channelId
      ? `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`
      : "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true";
    let channelData = await ytGet(channelUrl, token);

    // Fallback: if mine=true returned nothing, try managedByMe=true (Brand Accounts)
    if (!channelData.items?.length && !channelId) {
      channelData = await ytGet(
        "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&managedByMe=true",
        token,
      );
    }

    if (!channelData.items?.length) {
      return errResp("No YouTube channel found for these credentials.");
    }
    const uploadsPlaylistId: string =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // ── 2. Fetch all uploaded videos ─────────────────────────────────────────
    const uploadItems = await fetchAllPages(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50`,
      token,
      300,
    );

    // ── 3. Fetch all user-created playlists (not the auto-uploads one) ───────
    const allPlaylists = await fetchAllPages(
      "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
      token,
      100,
    );
    const createdPlaylists = allPlaylists.filter(p => p.id !== uploadsPlaylistId);

    // ── 4. Build a map: videoId → [playlistTitle, ...] ───────────────────────
    const videoPlaylistTitles: Record<string, string[]> = {};
    for (const playlist of createdPlaylists) {
      const title = playlist.snippet?.title as string;
      if (!title) continue;
      const items = await fetchAllPages(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlist.id}&maxResults=50`,
        token,
        300,
      );
      for (const item of items) {
        const vid = item.snippet?.resourceId?.videoId as string | undefined;
        if (!vid) continue;
        if (!videoPlaylistTitles[vid]) videoPlaylistTitles[vid] = [];
        if (!videoPlaylistTitles[vid].includes(title)) videoPlaylistTitles[vid].push(title);
      }
    }

    // ── 5. Find which YouTube video IDs are already imported ─────────────────
    const allVideoIds = uploadItems
      .map((i: any) => i.snippet?.resourceId?.videoId as string | undefined)
      .filter(Boolean) as string[];

    const { data: existing } = await supabase
      .from("coach_videos")
      .select("video_uid")
      .eq("video_provider", "youtube")
      .in("video_uid", allVideoIds);

    const existingSet = new Set((existing ?? []).map((v: any) => v.video_uid as string));

    // ── 6. Import missing videos ─────────────────────────────────────────────
    const toImport = uploadItems.filter((item: any) => {
      const vid = item.snippet?.resourceId?.videoId;
      return vid && !existingSet.has(vid);
    });

    let imported = 0;
    for (const item of toImport) {
      const videoId   = item.snippet?.resourceId?.videoId as string;
      const title     = (item.snippet?.title as string) ?? "Untitled";
      const desc      = (item.snippet?.description as string) || null;
      const published = (item.snippet?.publishedAt as string) ?? new Date().toISOString();
      const categories: string[] = videoPlaylistTitles[videoId] ?? [];

      const { error } = await supabase.from("coach_videos").insert({
        coach_id:       user.id,
        title,
        description:    desc,
        video_uid:      videoId,
        video_provider: "youtube",
        team_ids:       [],
        categories,
        visibility:     "all_coaches",
        created_at:     published,
      });
      if (!error) imported++;
    }

    // ── 7. Upsert playlists into youtube_playlists table ─────────────────────
    if (createdPlaylists.length > 0) {
      await supabase
        .from("youtube_playlists")
        .upsert(
          createdPlaylists.map((p: any) => ({
            youtube_playlist_id: p.id as string,
            title:               (p.snippet?.title as string) ?? "Untitled",
            video_count:         (p.contentDetails?.itemCount as number) ?? 0,
            synced_at:           new Date().toISOString(),
          })),
          { onConflict: "youtube_playlist_id" },
        );
    }

    return okResp({
      imported,
      skipped: allVideoIds.length - toImport.length,
      total:   allVideoIds.length,
      playlists: createdPlaylists.map((p: any) => ({
        id:         p.id,
        title:      p.snippet?.title,
        videoCount: p.contentDetails?.itemCount ?? 0,
      })),
    });

  } catch (e: any) {
    return errResp(e.message ?? "Unknown error");
  }
});
