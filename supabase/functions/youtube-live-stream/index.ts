/**
 * youtube-live-stream
 *
 * Manages YouTube Live broadcasts for coaches.
 *
 * Actions:
 *   "create"  – Create a YouTube Live broadcast + stream, insert into live_streams.
 *               Body: { action, title }
 *               Returns: live_streams row with rtmps_url, rtmps_stream_key, youtube_broadcast_id
 *
 *   "end"     – End a YouTube broadcast, mark is_live=false, save recording to coach_videos.
 *               Body: { action, id }  (id = live_streams.id UUID)
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
    const ytHeaders   = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === "create") {
      const { title } = body;
      if (!title?.trim()) return err("title is required");

      const scheduledStart = new Date(Date.now() + 60_000).toISOString(); // 1 min from now

      // 1. Create a liveBroadcast
      const broadcastRes = await fetch(
        "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet,contentDetails,status",
        {
          method: "POST",
          headers: ytHeaders,
          body: JSON.stringify({
            snippet: {
              title:              title.trim(),
              scheduledStartTime: scheduledStart,
            },
            status: {
              privacyStatus:           "unlisted",
              selfDeclaredMadeForKids: false,
            },
            contentDetails: {
              enableAutoStart: true,
              enableAutoStop:  true,
              recordFromStart: true,
              enableDvr:       false,
            },
          }),
        }
      );
      if (!broadcastRes.ok) {
        const errText = await broadcastRes.text().catch(() => "");
        console.error("YouTube broadcast error:", broadcastRes.status, errText);
        return err(`YouTube broadcast error ${broadcastRes.status}: ${errText}`);
      }
      const broadcastJson = await broadcastRes.json();
      const broadcastId   = broadcastJson.id;
      if (!broadcastId) return err("YouTube did not return a broadcast ID");

      // 2. Create a liveStream (RTMP ingest)
      const streamRes = await fetch(
        "https://www.googleapis.com/youtube/v3/liveStreams?part=id,snippet,cdn,status",
        {
          method: "POST",
          headers: ytHeaders,
          body: JSON.stringify({
            snippet: { title: title.trim() },
            cdn: {
              frameRate:    "variable",
              ingestionType: "rtmp",
              resolution:   "variable",
            },
          }),
        }
      );
      if (!streamRes.ok) {
        const errText = await streamRes.text().catch(() => "");
        return err(`YouTube stream error ${streamRes.status}: ${errText}`);
      }
      const streamJson  = await streamRes.json();
      const ytStreamId  = streamJson.id;
      const rtmpAddress = streamJson.cdn?.ingestionInfo?.ingestionAddress ?? null;
      const streamName  = streamJson.cdn?.ingestionInfo?.streamName ?? null;

      // 3. Bind the broadcast to the stream
      await fetch(
        `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&part=id,contentDetails&streamId=${ytStreamId}`,
        { method: "POST", headers: ytHeaders }
      );

      // 4. Transition broadcast to "live" (so it accepts RTMP immediately)
      await fetch(
        `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=live&id=${broadcastId}&part=status`,
        { method: "POST", headers: ytHeaders }
      ).catch(() => { /* best-effort — stream may not be ready yet */ });

      const playbackUrl = `https://www.youtube.com/embed/${broadcastId}`;

      // 5. Insert into live_streams
      const { data: row, error: dbErr } = await (supabase as any)
        .from("live_streams")
        .insert({
          coach_id:               user.id,
          title:                  title.trim(),
          cloudflare_live_input_id: null,
          cloudflare_playback_url:  null,
          rtmps_url:              rtmpAddress,
          rtmps_stream_key:       streamName,
          is_live:                true,
          stream_provider:        "youtube",
          youtube_broadcast_id:   broadcastId,
          youtube_stream_id:      ytStreamId,
        })
        .select()
        .single();

      if (dbErr) return err(dbErr.message);
      return ok({ ...row, cloudflare_playback_url: playbackUrl });
    }

    // ── END ───────────────────────────────────────────────────────────────────
    if (action === "end") {
      const { id } = body;
      if (!id) return err("id is required");

      const { data: stream, error: loadErr } = await (supabase as any)
        .from("live_streams")
        .select("*")
        .eq("id", id)
        .single();

      if (loadErr || !stream) return err("Stream not found");
      if (stream.coach_id !== user.id) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile?.role !== "admin") return err("Forbidden");
      }

      const broadcastId = stream.youtube_broadcast_id;
      let recordedVideoId: string | null = null;

      if (broadcastId) {
        // Transition to complete
        await fetch(
          `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id=${broadcastId}&part=status`,
          { method: "POST", headers: ytHeaders }
        ).catch(() => {});

        // The broadcast video ID is the same as the broadcastId for YouTube
        recordedVideoId = broadcastId;
      }

      // Mark is_live = false
      await (supabase as any).from("live_streams").update({
        is_live:            false,
        ended_at:           new Date().toISOString(),
        recorded_video_uid: recordedVideoId,
      }).eq("id", id);

      // Save to coach_videos as a YouTube video
      if (recordedVideoId) {
        await (supabase as any).from("coach_videos").insert({
          coach_id:       user.id,
          title:          `[Live] ${stream.title}`,
          description:    `Recorded live stream from ${new Date(stream.created_at).toLocaleDateString()}`,
          video_uid:      recordedVideoId,
          video_provider: "youtube",
          team_ids:       [],
          categories:     ["Match Footage"],
          visibility:     "all_coaches",
        });
      }

      return ok({ ok: true, recordedVideoSaved: !!recordedVideoId });
    }

    return err(`Unknown action: ${action}`);

  } catch (e: any) {
    console.error("Unexpected error:", e);
    return err(e?.message ?? "Internal server error");
  }
});
