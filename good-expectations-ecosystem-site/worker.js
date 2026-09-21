/* ============================================================
   GOOD EXPECTATIONS — Worker entry point
   This project deploys as a Cloudflare Worker with static assets
   (not Cloudflare Pages), so the functions/api/*.js convention is
   NOT auto-routed. This single entry script explicitly routes the
   two API endpoints and falls back to serving static files for
   everything else.
   ============================================================ */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

/* ---------- /api/contact ---------- */
async function handleContact(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

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

/* ---------- /api/ai-feed ---------- */
const AI_FEED_SOURCES = [
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
  { name: "TechCrunch AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/" },
  { name: "AI News", url: "https://www.artificialintelligence-news.com/feed/" }
];
const AI_FEED_MAX_ITEMS = 8;
const AI_FEED_CACHE_SECONDS = 900; // 15 minutes

function stripCdata(value) {
  if (!value) return "";
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
function stripTags(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").trim();
}
function extractTag(block, tag) {
  const re = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i");
  const match = block.match(re);
  return match ? match[1] : "";
}
function parseFeed(xml, sourceName) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of itemBlocks) {
    const rawTitle = extractTag(block, "title");
    const rawLink = extractTag(block, "link");
    const rawDate = extractTag(block, "pubDate");

    const title = decodeEntities(stripTags(stripCdata(rawTitle)));
    const link = decodeEntities(stripTags(stripCdata(rawLink))).trim();
    const pubDate = stripCdata(rawDate).trim();

    if (!title || !link) continue;

    const timestamp = pubDate ? Date.parse(pubDate) : NaN;
    items.push({
      title: title,
      url: link,
      source: sourceName,
      pubDate: isNaN(timestamp) ? null : new Date(timestamp).toISOString()
    });
  }
  return items;
}
async function fetchAiFeedSource(source) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "GoodExpectationsSignalsBot/1.0 (+https://goodexpectation.com)" },
      cf: { cacheTtl: AI_FEED_CACHE_SECONDS, cacheEverything: true }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, source.name);
  } catch (err) {
    return [];
  }
}
async function handleAiFeed(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const results = await Promise.all(AI_FEED_SOURCES.map(fetchAiFeedSource));
  let items = [].concat(...results);

  items.sort(function (a, b) {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });
  items = items.slice(0, AI_FEED_MAX_ITEMS);

  const payload = {
    ok: items.length > 0,
    fetchedAt: new Date().toISOString(),
    items: items
  };

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=" + AI_FEED_CACHE_SECONDS,
      "Access-Control-Allow-Origin": "*"
    }
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/* ---------- Router ---------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }
    if (url.pathname === "/api/ai-feed") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      return handleAiFeed(request, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};
