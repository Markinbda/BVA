/**
 * youtube-video-upload
 *
 * Creates a YouTube resumable upload session URL for an authenticated coach.
 * The browser uploads the video file DIRECTLY to that URL — no video bytes
 * pass through this function.
 *
 * Actions:
 *   (default) – Create a YouTube resumable upload session
 *               Body: { title, description, fileSize, mimeType }
 *               Returns: { videoId, uploadUrl }
 *
 *   "delete"  – Delete a YouTube video
 *               Body: { action: "delete", videoId }
 *               Returns: { ok }
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

const ok  = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const err = (msg: string)   => new Response(JSON.stringify({ error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to get access token: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error("No access_token in response");
  return json.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return err("Unauthorized");

    const body = await req.json();
    const { action } = body;

    const accessToken = await getAccessToken();

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (action === "delete") {
      const { videoId } = body;
      if (!videoId) return err("videoId is required");

      const delRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      // 204 = deleted, 404 = already gone — both are fine
      const deleteOk = delRes.status === 204 || delRes.status === 404;
      return ok({ ok: deleteOk });
    }

    // ── CREATE upload session ─────────────────────────────────────────────────
    const { title, description = "", fileSize, mimeType = "video/*" } = body;
    if (!title?.trim())  return err("title is required");
    if (!fileSize || fileSize <= 0) return err("fileSize is required");

    // Step 1: insert video metadata, get a video resource ID + upload URL
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization:   `Bearer ${accessToken}`,
          "Content-Type":  "application/json",
          "X-Upload-Content-Type":   mimeType,
          "X-Upload-Content-Length": String(fileSize),
        },
        body: JSON.stringify({
          snippet: {
            title:       title.trim(),
            description: description?.trim() ?? "",
            categoryId:  "17", // Sports
          },
          status: {
            privacyStatus: "unlisted", // not public, not private — sharable via link
          },
        }),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => "");
      console.error("YouTube init error:", initRes.status, errText);
      return err(`YouTube error ${initRes.status}: ${errText || "No response body"}`);
    }

    // YouTube returns the resumable upload URI in the Location header
    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) return err("YouTube did not return an upload URL");

    // Extract the video ID from the upload URL (it's in the query param `upload_id` is not the video ID)
    // The video ID is returned in the response body
    const initJson = await initRes.json().catch(() => null);
    const videoId  = initJson?.id ?? null;

    return ok({ videoId, uploadUrl });

  } catch (e: any) {
    console.error("Unexpected error:", e);
    return err(e?.message ?? "Internal server error");
  }
});
