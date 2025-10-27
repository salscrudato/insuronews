import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import Parser from "rss-parser";
import crypto from "crypto";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { fetch } from "undici";
import he from "he";
import pLimit from "p-limit";
import { z } from "zod";
import { FEEDS, PAGES_HTML } from "./sources";

// Init Admin
admin.initializeApp();
const db = admin.firestore();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// --- UTIL ---
const sha1 = (s: string) => crypto.createHash("sha1").update(s).digest("hex");
const stripUTM = (u: string) => u.replace(/([?&])(utm_[^&]+)&?/g, "$1").replace(/[?&]$/, "");
const canonicalFromHtml = (html: string, url: string) => {
  try {
    const dom = new JSDOM(html);
    const c = dom.window.document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    if (!c) return url;
    const normalized = new URL(c, url).toString();
    return stripUTM(normalized);
  } catch { return stripUTM(url); }
};
const extractArticle = (html: string) => {
  const dom = new JSDOM(html, { url: "https://example.com" });
  const reader = new Readability(dom.window.document);
  const art = reader.parse();
  return { text: he.decode(art?.textContent || ""), title: he.decode(art?.title || "") };
};

// Allowed taxonomy
const Categories = [
  "Regulatory","Catastrophe","Auto","Homeowners","Commercial","Reinsurance","Claims","InsurTech","M&A","Cyber","Pricing"
] as const;
const SummarySchema = z.object({
  title: z.string().min(5),
  bullets: z.array(z.string().min(5)).min(3).max(5),
  categories: z.array(z.enum(Categories)).min(1).max(4),
  relevance: z.number().min(0).max(1)
});
type Summary = z.infer<typeof SummarySchema>;

// --- AI summarizer (JSON object + validation) ---
async function summarize({ title, text, url, apiKey }: { title: string; text: string; url: string; apiKey: string }): Promise<Summary | null> {
  const prompt = [
    { role: "system", content:
      "You are an expert P&C insurance analyst. Extract only facts present in the article. Return 3-5 sharp bullets (<=22 words each) for busy professionals. Classify into the fixed P&C categories." },
    { role: "user", content:
      `URL: ${url}\nTITLE: ${title}\nARTICLE (trimmed):\n${text.slice(0, 8000)}\n\nReturn strict JSON with keys: title, bullets[], categories[], relevance (0..1 for P&C relevance).` }
  ];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: prompt
      })
    });
    if (!r.ok) { logger.warn("OpenAI non-200", await r.text()); return null; }
    const data = await r.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    try {
      const parsed = SummarySchema.safeParse(JSON.parse(content));
      if (!parsed.success) { logger.warn("Schema fail", parsed.error.format()); return null; }
      return parsed.data;
    } catch (e) { logger.warn("JSON parse fail", e); return null; }
  } catch (e) {
    logger.warn("Summarize error", e);
    return null;
  }
}


// --- Fetchers ---
const parser = new Parser();

async function fetchRssFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items?.map(it => ({
      title: it.title || "",
      link: it.link || "",
      pubDate: it.pubDate ? new Date(it.pubDate) : new Date(),
      source: new URL(feed.link || url).hostname
    })) || [];
  } catch (e) {
    logger.warn("RSS error", url, String(e));
    return [];
  }
}

// Basic HTML page scanner for anchors (polite, shallow)
async function fetchHtmlList(url: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const anchors = Array.from(dom.window.document.querySelectorAll("a[href]"))
      .map(a => new URL(((a as HTMLAnchorElement).getAttribute("href")||""), url).toString())
      .filter(href => /^https?:/.test(href))
      .slice(0, 100);
    return anchors;
  } catch {
    return [];
  }
}

async function fetchFull(url: string) {
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();
  const canonical = canonicalFromHtml(html, url);
  const { text, title } = extractArticle(html);
  const dom = new JSDOM(html);
  const img = dom.window.document.querySelector('meta[property="og:image"]')?.getAttribute("content") || undefined;
  return { canonical, text, title, imageUrl: img };
}

const HARD_KEYWORDS = [
  "insurer","insurance","reinsurance","underwriting","claims","premium","broker","policy","NAIC","regulator","catastrophe",
  "combined ratio","workers comp","auto insurance","homeowners","carrier","MGA","property","casualty"
];

const looksRelevant = (title: string, text: string) => {
  const hay = (title + " " + text).toLowerCase();
  return HARD_KEYWORDS.some(k => hay.includes(k));
};

// --- Main hourly job ---
export const pollFeeds = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Etc/UTC", secrets: [OPENAI_API_KEY] },
  async () => {
    const apiKey = OPENAI_API_KEY.value();
    const limit = pLimit(3);
    const rssLists = await Promise.all(FEEDS.map(fetchRssFeed));
    const htmlAnchors = await Promise.all(PAGES_HTML.map(fetchHtmlList));
    const urls = [
      ...rssLists.flat().map(i => i.link).filter(Boolean),
      ...htmlAnchors.flat()
    ];
    const unique = Array.from(new Set(urls.map(stripUTM)));

    logger.log(`Found ${unique.length} candidate URLs`);
    const tasks = unique.slice(0, 150).map(u => limit(async () => {
      try {
        const full = await fetchFull(u);
        const { canonical, text, title, imageUrl } = full;
        if (!text || (!looksRelevant(title, text))) return;

        const id = sha1(canonical);
        const ref = db.collection("news").doc(id);
        const exists = await ref.get();
        if (exists.exists) return;

        const sum = await summarize({ title: title || "", text, url: canonical, apiKey });
        if (!sum || sum.relevance < 0.5) return;

        await ref.set({
          title: sum.title || title,
          url: canonical,
          source: new URL(canonical).origin,
          imageUrl,
          summaryBullets: sum.bullets,
          categories: sum.categories,
          relevance: sum.relevance,
          publishedAt: admin.firestore.Timestamp.fromDate(new Date()),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expireAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1000*60*60*24*45))
        }, { merge: true });
      } catch (e) {
        logger.warn("Process err", u, String(e));
      }
    }));

    await Promise.all(tasks);
    logger.log("Hourly poll completed");
  }
);

// --- Manual trigger for testing ---
export const runOnce = onRequest({ secrets:[OPENAI_API_KEY] }, async (_req, res) => {
  try {
    await (pollFeeds as any).run();
    res.status(200).send("Triggered.");
  } catch (e) {
    logger.error("Manual trigger error", e);
    res.status(500).send("Error: " + String(e));
  }
});

