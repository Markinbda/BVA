/**
 * get-video-share
 *
 * Public (no-auth) edge function that resolves a share token and returns
 * the video details + coach notes for that player.
 *
 * GET /get-video-share?token=<uuid>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url   = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "token is required" }, 400);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Resolve token ─────────────────────────────────────────────────────────
    const { data: share, error: shareErr } = await serviceClient
      .from("video_share_tokens")
      .select("id, token, video_id, coach_player_id, player_name, expires_at")
      .eq("token", token)
      .single();

    if (shareErr || !share) return json({ error: "Invalid or expired link." }, 404);
    if (new Date(share.expires_at) < new Date()) return json({ error: "This link has expired." }, 410);

    // ── Load video ────────────────────────────────────────────────────────────
    const { data: video, error: videoErr } = await serviceClient
      .from("coach_videos")
      .select("id, title, description, video_uid, video_provider")
      .eq("id", share.video_id)
      .single();

    if (videoErr || !video) return json({ error: "Video not found." }, 404);

    // ── Load notes for this player (personal + all-players) ───────────────────
    const { data: notes } = await serviceClient
      .from("video_notes")
      .select("id, timestamp_seconds, note_type, note_text, voice_url, is_all_players, created_at")
      .eq("video_id", share.video_id)
      .or(`is_all_players.eq.true,player_id.eq.${share.coach_player_id ?? "00000000-0000-0000-0000-000000000000"}`)
      .order("timestamp_seconds", { ascending: true });

    // ── Generate signed URLs for voice notes ──────────────────────────────────
    const notesWithUrls = await Promise.all(
      (notes ?? []).map(async (note: any) => {
        if (note.note_type !== "voice" || !note.voice_url) return note;
        const { data: signed } = await serviceClient.storage
          .from("video-voice-notes")
          .createSignedUrl(note.voice_url, 3600);
        return { ...note, signed_url: signed?.signedUrl ?? null };
      })
    );

    return json({
      player_name: share.player_name,
      video,
      notes: notesWithUrls,
    });

  } catch (e: any) {
    console.error("get-video-share error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
