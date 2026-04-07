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
    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client using caller's JWT to verify admin role
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser } } = await callerClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roleRow } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { action, ...payload } = await req.json();

    // ── CREATE USER ───────────────────────────────────────────────────────────
    if (action === "create_user") {
      const { email, password, display_name, phone } = payload as {
        email: string;
        password: string;
        display_name: string;
        phone?: string;
      };

      if (!email || !password || !display_name) {
        return new Response(
          JSON.stringify({ error: "email, password and display_name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name },
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update phone in profile if provided
      if (phone && created.user) {
        await adminClient
          .from("profiles")
          .update({ phone })
          .eq("user_id", created.user.id);
      }

      return new Response(JSON.stringify({ user_id: created.user?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST USER EMAILS ──────────────────────────────────────────────────────
    if (action === "list_emails") {
      const { user_ids } = payload as { user_ids: string[] };
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ emails: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: users, error: listErr } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emails: Record<string, string> = {};
      const idSet = new Set(user_ids);
      for (const u of users.users) {
        if (idSet.has(u.id) && u.email) {
          emails[u.id] = u.email;
        }
      }

      return new Response(JSON.stringify({ emails }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE USER EMAIL ─────────────────────────────────────────────────────
    if (action === "update_email") {
      const { user_id, email } = payload as { user_id: string; email: string };
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(user_id, {
        email,
        email_confirm: true,
      });

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEND PASSWORD RESET EMAIL ─────────────────────────────────────────────
    if (action === "reset_password_email") {
      const { email } = payload as { email: string };
      const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${Deno.env.get("SITE_URL") ?? "https://bermudavolleyball.netlify.app"}/admin/reset-password`,
      });

      if (resetErr) {
        return new Response(JSON.stringify({ error: resetErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SET NEW PASSWORD DIRECTLY ─────────────────────────────────────────────
    if (action === "set_password") {
      const { user_id, password } = payload as { user_id: string; password: string };
      if (!password || password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: pwErr } = await adminClient.auth.admin.updateUserById(user_id, {
        password,
      });

      if (pwErr) {
        return new Response(JSON.stringify({ error: pwErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
