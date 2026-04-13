/**
 * cloudflare-live-stream
 *
 * Actions (pass as { action } in the body):
 *   "create"  – Create a Cloudflare Live Input and insert a row in live_streams.
 *               Body: { action, title }
 *               Returns: { id, title, cloudflare_live_input_id, cloudflare_playback_url,
 *                          rtmps_url, rtmps_stream_key, srt_url, srt_stream_id }
 *
 *   "end"     – Mark is_live=false, delete the Cloudflare live input,
 *               and save any recorded video into coach_videos.
 *               Body: { action, id }  (id = live_streams.id UUID)
 *               Returns: { ok }
 *
 *   "status"  – Return current live_streams rows where is_live=true (for homepage).
 *               Body: { action }  (no auth required)
 *               Returns: { streams: [...] }
 *
 * Secrets required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_STREAM_TOKEN
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok  = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const err = (msg: string, status = 200) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CF_BASE = "https://api.cloudflare.com/client/v4/accounts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!;
  const CF_TOKEN   = Deno.env.get("CLOUDFLARE_STREAM_TOKEN")!;
  const cfHeaders  = { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { action } = body;

    // ── status: public, no auth needed ────────────────────────────────────────
    if (action === "status") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data } = await supabase
        .from("live_streams")
        .select("id, title, cloudflare_playback_url, created_at")
        .eq("is_live", true)
        .order("created_at", { ascending: false });
      return ok({ streams: data ?? [] });
    }

    // ── All other actions require auth ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return err("Unauthorized");

    // ── create ─────────────────────────────────────────────────────────────────
    if (action === "create") {
      const { title } = body;
      if (!title?.trim()) return err("title is required");

      // Create Cloudflare Live Input
      const cfRes = await fetch(`${CF_BASE}/${ACCOUNT_ID}/stream/live_inputs`, {
        method: "POST",
        headers: cfHeaders,
        body: JSON.stringify({
          meta: { name: title.trim() },
          recording: { mode: "automatic" },
        }),
      });
      const cfJson = await cfRes.json();
      if (!cfRes.ok || !cfJson.result) {
        const msg = cfJson.errors?.[0]?.message ?? "Cloudflare live input creation failed";
        return err(msg);
      }

      const result = cfJson.result;
      const liveInputId   = result.uid;

      // Derive the real customer subdomain from the HLS playback URL
      // e.g. "https://customer-abc123.cloudflarestream.com/{uid}/manifest/video.m3u8"
      //      → "customer-abc123.cloudflarestream.com"
      // Fall back to using result.preview (replace /watch with /iframe) if available.
      let playbackUrl: string;
      const hlsUrl: string | undefined = result.playback?.hls;
      const previewUrl: string | undefined = result.preview;
      if (previewUrl) {
        // preview is the watch page — swap to iframe embed
        playbackUrl = previewUrl.replace(/\/watch$/, "/iframe");
        if (playbackUrl === previewUrl) playbackUrl = previewUrl + "/iframe";
      } else if (hlsUrl) {
        const m = hlsUrl.match(/https:\/\/(customer-[^/]+cloudflarestream\.com)/);
        const host = m ? m[1] : "customer.cloudflarestream.com";
        playbackUrl = `https://${host}/${liveInputId}/iframe`;
      } else {
        playbackUrl = `https://iframe.cloudflarestream.com/${liveInputId}`;
      }
      const rtmpsUrl      = result.rtmps?.url ?? null;
      const rtmpsKey      = result.rtmps?.streamKey ?? null;
      const srtUrl        = result.srt?.url ?? null;
      const srtStreamId   = result.srt?.streamId ?? null;
      // WHIP endpoint — use from API or derive from correct customer domain
      const webrtcUrl     = result.webRTC?.url
        ?? playbackUrl.replace(/\/iframe.*$/, "/webRTC/publish");

      // Insert into live_streams
      const { data: row, error: dbErr } = await (supabase as any)
        .from("live_streams")
        .insert({
          coach_id:                user.id,
          title:                   title.trim(),
          cloudflare_live_input_id: liveInputId,
          cloudflare_playback_url:  playbackUrl,
          rtmps_url:               rtmpsUrl,
          rtmps_stream_key:        rtmpsKey,
          srt_url:                 srtUrl,
          srt_stream_id:           srtStreamId,
          webrtc_url:              webrtcUrl,
          is_live:                 true,
        })
        .select()
        .single();

      if (dbErr) return err(dbErr.message);
      return ok(row);
    }

    // ── end ────────────────────────────────────────────────────────────────────
    if (action === "end") {
      const { id } = body;
      if (!id) return err("id is required");

      // Load the stream row (verify ownership)
      const { data: stream, error: loadErr } = await (supabase as any)
        .from("live_streams")
        .select("*")
        .eq("id", id)
        .single();

      if (loadErr || !stream) return err("Stream not found");
      if (stream.coach_id !== user.id) {
        // Allow admins
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile?.role !== "admin") return err("Forbidden");
      }

      const liveInputId = stream.cloudflare_live_input_id;

      // Try to fetch any recorded video uid from Cloudflare
      let recordedUid: string | null = null;
      try {
        const videosRes = await fetch(
          `${CF_BASE}/${ACCOUNT_ID}/stream/live_inputs/${liveInputId}/videos`,
          { headers: cfHeaders }
        );
        const videosJson = await videosRes.json();
        const videos = videosJson.result ?? [];
        if (videos.length > 0) {
          // Pick the most recent
          recordedUid = videos[videos.length - 1].uid ?? null;
        }
      } catch (_) { /* best-effort */ }

      // Mark is_live = false in DB
      await (supabase as any).from("live_streams").update({
        is_live:           false,
        ended_at:          new Date().toISOString(),
        recorded_video_uid: recordedUid,
      }).eq("id", id);

      // Save recorded video into coach_videos if we got a uid
      if (recordedUid) {
        await (supabase as any).from("coach_videos").insert({
          coach_id:    user.id,
          title:       `[Live] ${stream.title}`,
          description: `Recorded live stream from ${new Date(stream.created_at).toLocaleDateString()}`,
          video_uid:   recordedUid,
          team_ids:    [],
          categories:  ["Match Footage"],
          visibility:  "all_coaches",
        });
      }

      // Delete the Cloudflare live input (best-effort)
      try {
        await fetch(`${CF_BASE}/${ACCOUNT_ID}/stream/live_inputs/${liveInputId}`, {
          method: "DELETE",
          headers: cfHeaders,
        });
      } catch (_) { /* best-effort */ }

      return ok({ ok: true, recordedVideoSaved: !!recordedUid });
    }

    return err("Unknown action");
  } catch (e: any) {
    return err(e.message ?? "Internal error");
  }
});
