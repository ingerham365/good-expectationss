/**
 * Cloudflare Pages Function — handles the contact form on /contact.html.
 * Validates input; sends via Resend if RESEND_API_KEY is configured,
 * otherwise logs and returns success so the form works end-to-end
 * even before an email provider is wired up.
 */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid request body." }, 400);
  }

  const { name, email, topic, message, company_website } = body;

  // Honeypot — silently succeed for bots.
  if (company_website) {
    return json({ ok: true });
  }

  if (!name || !email || !topic || !message) {
    return json({ error: "Please fill in all required fields." }, 400);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const apiKey = env.RESEND_API_KEY;
  const toEmail = env.CONTACT_TO_EMAIL;
  const fromEmail = env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    console.log("Contact form submission (no email provider configured):", { name, email, topic, message });
    return json({ ok: true });
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        reply_to: email,
        subject: `[Good Expectations] ${topic} — ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`
      })
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", errText);
      return json({ error: "Message could not be sent right now." }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("Contact function error:", err);
    return json({ error: "Something went wrong sending this." }, 500);
  }
}
