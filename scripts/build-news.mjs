import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const FEEDS = [
  {
    category: "Socorrismo",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(
        'socorrismo OR "salvamento acuático" OR "rescate acuático" OR lifeguard OR "seguridad acuática"',
      ) +
      "&hl=es&gl=ES&ceid=ES:es",
  },
  {
    category: "Deporte",
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent('deporte OR natación OR triatlón OR "aguas abiertas"') +
      "&hl=es&gl=ES&ceid=ES:es",
  },
];

const OUT_FILE = "./assets/news.json";
const MAX_ITEMS = 12;
const HOURS = 168; // 7 días (para que casi nunca quede vacío)

function stripCdata(s) {
  return (s || "").replace("<![CDATA[", "").replace("]]>", "").trim();
}

function pick(tag, xml) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? stripCdata(m[1]) : "";
}

function pickAllItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) items.push(m[1]);
  return items;
}

function toTs(pubDate) {
  const t = Date.parse(pubDate);
  return Number.isFinite(t) ? t : 0;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ElitePRO-News-Bot/1.0",
      Accept: "application/rss+xml, application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}\n${text.slice(0, 200)}`);
  return text;
}

async function fetchRssWithFallback(rssUrl) {
  // 1) Directo
  const direct = await fetchText(rssUrl);
  if (pickAllItems(direct).length > 0) return { xml: direct, via: "direct" };

  // 2) Fallback: Jina mirror (evita consent/HTML)
  const mirrored = rssUrl.startsWith("https://")
    ? `https://r.jina.ai/http://${rssUrl.replace("https://", "")}`
    : `https://r.jina.ai/http://${rssUrl.replace("http://", "")}`;

  const viaJina = await fetchText(mirrored);
  return { xml: viaJina, via: "jina" };
}

async function main() {
  const now = Date.now();
  const maxAge = HOURS * 3600 * 1000;

  const all = [];

  for (const feed of FEEDS) {
    const { xml, via } = await fetchRssWithFallback(feed.url);
    const items = pickAllItems(xml);

    console.log(`Feed "${feed.category}" via ${via} -> items encontrados: ${items.length}`);

    for (const it of items) {
      const title = pick("title", it);
      const link = pick("link", it);
      const pubDate = pick("pubDate", it);
      const source = pick("source", it) || "Google News";

      const ts = toTs(pubDate);
      if (!title || !link || !ts) continue;
      if (now - ts > maxAge) continue;

      all.push({
        category: feed.category,
        title,
        link,
        source,
        pubDate,
        ts,
      });
    }
  }

  // Orden + dedupe
  all.sort((a, b) => b.ts - a.ts);

  const seen = new Set();
  const uniq = [];
  for (const n of all) {
    if (seen.has(n.link)) continue;
    seen.add(n.link);
    uniq.push(n);
    if (uniq.length >= MAX_ITEMS) break;
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    hoursWindow: HOURS,
    items: uniq.map(({ ts, ...rest }) => rest),
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");

  console.log(`OK -> ${OUT_FILE} (${payload.items.length} items)`);

  // Si no hay items, hacemos fallar el workflow para que lo veas en Actions
  if (payload.items.length === 0) {
    throw new Error("news.json generado SIN noticias (items = 0). Revisa feeds/keyword.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
