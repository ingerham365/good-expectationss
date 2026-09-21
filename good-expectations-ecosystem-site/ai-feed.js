/* ============================================================
   GOOD EXPECTATIONS — live AI news feed
   Pulls real, current headlines from public AI-focused RSS feeds
   and returns them as JSON for the homepage Signals section.
   No fabricated data: if a source fails, it is simply skipped;
   if all sources fail, an empty list + error flag is returned
   rather than any invented content.
   ============================================================ */

const SOURCES = [
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed"
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/"
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/tag/artificial-intelligence/feed/"
  },
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/"
  }
];

const MAX_ITEMS = 8;
const CACHE_SECONDS = 900; // 15 minutes

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

async function fetchSource(source) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "GoodExpectationsSignalsBot/1.0 (+https://goodexpectation.com)" },
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, source.name);
  } catch (err) {
    return [];
  }
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(context.request.url, context.request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const results = await Promise.all(SOURCES.map(fetchSource));
  let items = [].concat(...results);

  items.sort(function (a, b) {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });

  items = items.slice(0, MAX_ITEMS);

  const payload = {
    ok: items.length > 0,
    fetchedAt: new Date().toISOString(),
    items: items
  };

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=" + CACHE_SECONDS,
      "Access-Control-Allow-Origin": "*"
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
