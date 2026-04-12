/**
 * cloudflare-stream-upload-url
 *
 * Creates a Cloudflare Stream direct-upload URL for an authenticated coach.
 * The browser uploads the video file DIRECTLY to that URL — no video bytes
 * ever pass through this function.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   CLOUDFLARE_ACCOUNT_ID    – Cloudflare dashboard → Workers & Pages (right sidebar)
 *   CLOUDFLARE_STREAM_TOKEN  – API token with "Stream:Edit" permission
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Verify caller is an authenticated Supabase user ──────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse request body ────────────────────────────────────────────────────
    const body = await req.json();
    const { action, title, description, maxDurationSeconds = 21600, videoUid, fileSize } = body;

    const accountId   = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const streamToken = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");

    // ── DELETE action ─────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!videoUid) return new Response(JSON.stringify({ error: "videoUid is required." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!accountId || !streamToken) return new Response(JSON.stringify({ error: "Cloudflare not configured." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const delRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${streamToken}` } }
      );
      const ok = delRes.ok || delRes.status === 404; // 404 means already gone
      return new Response(JSON.stringify({ ok }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!accountId || !streamToken) {
      return new Response(
        JSON.stringify({ error: "Cloudflare Stream is not configured. Contact an admin." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create a direct upload URL for TUS (browser-safe) ─────────────────────
    // Use ?direct_user=true which returns a Location header with the TUS URL.
    // This URL supports PATCH directly from the browser.
    if (!fileSize || fileSize <= 0) {
      return new Response(
        JSON.stringify({ error: "fileSize is required for upload." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${streamToken}`,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(fileSize),
          "Upload-Metadata": `maxDurationSeconds ${btoa(String(maxDurationSeconds))},name ${btoa(unescape(encodeURIComponent(title ?? "BVA Coach Video")))}`,
        },
      }
    );

    if (!cfRes.ok) {
      const errText = await cfRes.text().catch(() => "");
      console.error("Cloudflare stream error:", cfRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Cloudflare error ${cfRes.status}: ${errText || "No response body"}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadUrl = cfRes.headers.get("Location");
    const uid       = cfRes.headers.get("stream-media-id");

    if (!uploadUrl || !uid) {
      return new Response(
        JSON.stringify({ error: `Cloudflare did not return upload URL. Location: ${uploadUrl}, uid: ${uid}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ uid, uploadUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
