import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { stream_id, passkey } = await req.json();

    if (!stream_id || !passkey) {
      return new Response(
        JSON.stringify({ valid: false, error: "stream_id and passkey are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use service role to read passkey (never exposed to public)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: stream, error } = await supabase
      .from("live_streams")
      .select("id, passkey, is_live, cloudflare_playback_url, stream_provider, youtube_broadcast_id")
      .eq("id", stream_id)
      .eq("is_live", true)
      .single();

    if (error || !stream) {
      return new Response(
        JSON.stringify({ valid: false, error: "Stream not found or no longer live" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Case-insensitive comparison
    if (stream.passkey.toUpperCase() !== passkey.trim().toUpperCase()) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Passkey correct — return playback details
    return new Response(
      JSON.stringify({
        valid: true,
        stream_provider: stream.stream_provider,
        cloudflare_playback_url: stream.cloudflare_playback_url,
        youtube_broadcast_id: stream.youtube_broadcast_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
