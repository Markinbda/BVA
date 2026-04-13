/**
 * notify-video
 *
 * Sends email notifications to players/teams about a new coach video.
 *
 * Body parameters:
 *   video_id    – UUID from coach_videos table
 *   team_ids    – string[]  (optional) notify all players in these teams
 *   player_ids  – string[]  (optional) notify specific players
 *
 * At least one of team_ids or player_ids must be provided.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok  = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const err = (msg: string)   => new Response(JSON.stringify({ error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    // ── Parse body ────────────────────────────────────────────────────────────
    const { video_id, team_ids = [], player_ids = [] } = await req.json();

    if (!video_id) return err("video_id is required.");
    if (!team_ids.length && !player_ids.length) return err("Provide at least one team_id or player_id.");

    // ── Load video ────────────────────────────────────────────────────────────
    const { data: video, error: videoErr } = await supabase
      .from("coach_videos")
      .select("id, title, description, video_uid, coach_id")
      .eq("id", video_id)
      .single();

    if (videoErr || !video) return err("Video not found.");
    if (video.coach_id !== user.id) {
      // Allow admins
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") return err("Forbidden.");
    }

    // ── Collect player emails ─────────────────────────────────────────────────
    const playerSet = new Set<string>();

    if (team_ids.length) {
      // Look up team names so we can also match against the legacy text `team` field
      const { data: teamRows } = await supabase
        .from("coach_teams")
        .select("id, name")
        .in("id", team_ids);
      const teamNames: string[] = (teamRows ?? []).map((t: any) => t.name);

      // Query by team_id UUID (new records) and by team text field (legacy records)
      const [byId, byName] = await Promise.all([
        supabase.from("coach_players").select("id, first_name, last_name, email")
          .in("team_id", team_ids).not("email", "is", null),
        teamNames.length
          ? supabase.from("coach_players").select("id, first_name, last_name, email")
              .in("team", teamNames).not("email", "is", null)
          : Promise.resolve({ data: [] }),
      ]);
      const seen = new Set<string>();
      for (const p of [...(byId.data ?? []), ...(byName.data ?? [])]) {
        if (p.email && !seen.has(p.id)) {
          seen.add(p.id);
          playerSet.add(JSON.stringify({ id: p.id, name: `${p.first_name} ${p.last_name}`, email: p.email }));
        }
      }
    }

    if (player_ids.length) {
      const { data: specificPlayers } = await supabase
        .from("coach_players")
        .select("id, first_name, last_name, email")
        .in("id", player_ids)
        .not("email", "is", null);
      (specificPlayers ?? []).forEach((p: any) => p.email && playerSet.add(JSON.stringify({ id: p.id, name: `${p.first_name} ${p.last_name}`, email: p.email })));
    }

    const players: { id: string; name: string; email: string }[] = [...playerSet].map(s => JSON.parse(s));

    if (!players.length) return err("No players with email addresses found.");

    const watchUrl = `https://watch.cloudflarestream.com/${video.video_uid}`;
    const recipients = players.map(p => p.email);

    // ── Send via send-coach-email function ────────────────────────────────────
    const subject = `New Video: ${video.title}`;
    const body = `
<p>Hi,</p>
<p>Your coach has shared a new video with you: <strong>${video.title}</strong></p>
${video.description ? `<p>${video.description}</p>` : ""}
<p><a href="${watchUrl}" style="background:#1a56db;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Watch Video</a></p>
<p>Or copy this link: <a href="${watchUrl}">${watchUrl}</a></p>
<br>
<p style="color:#666;font-size:12px;">Bermuda Volleyball Association &mdash; Coach Portal</p>
    `.trim();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-coach-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ subject, body, recipients }),
    });

    const emailJson = await emailRes.json().catch(() => ({}));

    if (!emailRes.ok) {
      console.error("Email send failed:", emailJson);
      return err(`Email delivery failed: ${emailJson?.error ?? emailRes.status}`);
    }

    // ── Log to email history ──────────────────────────────────────────────────
    await supabase.from("coach_email_history").insert({
      coach_id:   user.id,
      subject,
      body,
      recipients,
      team_names: [],
      status:     "sent",
    });

    return ok({ sent: recipients.length, recipients });

  } catch (e: any) {
    console.error("notify-video error:", e);
    return err("Internal server error");
  }
});
