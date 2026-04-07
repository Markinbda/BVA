const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Attachment {
  filename: string;
  content: string; // base64
  type: string;
}

interface EmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  attachments?: Attachment[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "noreply@bermudavolleyball.bm";
    const FROM_NAME = Deno.env.get("SENDGRID_FROM_NAME") ?? "Bermuda Volleyball Association";

    if (!SENDGRID_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SENDGRID_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: EmailPayload = await req.json();
    const { subject, body, recipients, attachments = [] } = payload;

    if (!subject || !body || !recipients?.length) {
      return new Response(
        JSON.stringify({ error: "subject, body, and recipients are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendgridPayload: Record<string, unknown> = {
      personalizations: [{ to: recipients.map((email) => ({ email })) }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: "text/html", value: body.replace(/\n/g, "<br>") }],
    };

    if (attachments.length > 0) {
      sendgridPayload.attachments = attachments.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type,
        disposition: "attachment",
      }));
    }

    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendgridPayload),
    });

    if (!sgResponse.ok) {
      const errorText = await sgResponse.text();
      return new Response(
        JSON.stringify({ error: `SendGrid error: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
