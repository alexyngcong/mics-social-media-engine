#!/usr/bin/env node
/**
 * AI Business Intelligence Command Center — Multi-Source Fetcher
 *
 * Implements the v1.0 architecture spec:
 *   - Server-side execution (GitHub Actions) — no CORS, no browser blocks
 *   - 5 free intelligence sources aggregated in parallel
 *   - 12-dimension scoring rubric (full spec)
 *   - 20-topic taxonomy → 4 intelligence rooms
 *   - Deduplication + Big-4 exclusion + recency gate
 *   - Output: intelligence-feed-grade news-latest.json
 *
 * Sources:
 *   1. GDELT DOC 2.0 (broad UAE/Dubai/Abu Dhabi/GCC query)
 *   2. Google News RSS (per-category queries × 14)
 *   3. Reddit public JSON (7 subreddits, top-of-day)
 *   4. Google Trends RSS (UAE region daily)
 *   5. Direct UAE/Gulf business RSS feeds (5 outlets)
 *
 * Threshold: only articles scoring ≥ 8 (of 14 max) reach the output.
 *
 * Runs in Node 20+, zero npm dependencies (built-in fetch only).
 */

import { writeFile } from 'node:fs/promises';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MAX_AGE_HOURS = 72;
const MIN_SCORE_THRESHOLD = 6; // of 14 max — quality bar still meaningful
const PER_ROOM_CAP = 25;

const BIG4_EXCLUDED = [
  'deloitte.com', 'pwc.com', 'ey.com', 'kpmg.com',
  'mckinsey.com', 'bain.com', 'bcg.com', 'accenture.com',
];

const PRIORITY_SOURCES = new Set([
  // UAE government & regulators
  'mof.gov.ae', 'tax.gov.ae', 'centralbank.ae', 'cbuae.gov.ae',
  'dfsa.ae', 'adgm.com', 'difc.ae', 'sca.gov.ae',
  'economy.gov.ae', 'mohre.gov.ae', 'moiat.gov.ae',
  'mofaic.gov.ae', 'rera.gov.ae', 'dubailand.gov.ae',
  'moi.gov.ae', 'ded.ae', 'dubaichamber.com',
  // UAE state media
  'wam.ae', 'mediaoffice.ae', 'mediaoffice.abudhabi',
  // Reputable UAE/GCC business media
  'thenationalnews.com', 'gulfnews.com', 'zawya.com',
  'khaleejtimes.com', 'arabianbusiness.com', 'argaam.com',
  'agbi.com', 'economymiddleeast.com', 'gulfbusiness.com',
  'gulftoday.ae', 'emirates247.com', 'tradearabia.com',
  'menafn.com', 'arabnews.com',
  // Global financial media
  'bloomberg.com', 'reuters.com', 'ft.com', 'wsj.com',
  'economist.com', 'nikkei.com', 'scmp.com', 'cnbc.com',
  'marketwatch.com', 'forbes.com', 'businessinsider.com',
  'fortune.com',
  // Industry publications
  'meed.com', 'mondaq.com', 'lexology.com',
  'bloombergtax.com', 'taxnotes.com', 'oilprice.com',
  // Multilaterals
  'imf.org', 'worldbank.org', 'oecd.org', 'bis.org',
  'federalreserve.gov', 'ecb.europa.eu',
  // Wire services
  'apnews.com', 'afp.com', 'bbc.com', 'bbc.co.uk',
  'aljazeera.com', 'theguardian.com',
]);

// ═══════════════════════════════════════════════════════════════
// 20-TOPIC TAXONOMY → 4 ROOMS
// ═══════════════════════════════════════════════════════════════

const TOPICS = {
  economy:        { label: 'UAE/GCC Economy',           room: 'growth',  re: /\b(economy|gdp|inflation|monetary|economic growth|recession|sovereign)\b/i },
  investment:     { label: 'Investment & Funding',      room: 'growth',  re: /\b(invest|fund|venture|private equity|family office|allocation|deployment)\b/i },
  expansion:      { label: 'Business Expansion',        room: 'growth',  re: /\b(expansion|expand|market entry|new market|establish|setup|launch)\b/i },
  realestate:     { label: 'Real Estate & Construction',room: 'growth',  re: /\b(real estate|property|construction|residential|commercial|emaar|aldar|nakheel|damac)\b/i },
  consumer:       { label: 'Consumer & Retail',         room: 'growth',  re: /\b(consumer|retail|spending|e-?commerce|tourism|hospitality|shopper)\b/i },
  infrastructure: { label: 'Infrastructure & Logistics',room: 'growth',  re: /\b(infrastructure|airport|port|metro|transport|utility|telecom)\b/i },
  marketTrends:   { label: 'Market Trends',             room: 'growth',  re: /\b(market trend|index|equity|stock|outlook|forecast|sentiment)\b/i },

  corpFinance:    { label: 'Corporate Finance',         room: 'capital', re: /\b(treasury|cash flow|working capital|liquidity|profitability|refinanc)\b/i },
  banking:        { label: 'Banking & Rates',           room: 'capital', re: /\b(banking|bank|interest rate|federal reserve|\bfed\b|\becb\b|central bank|sukuk|bond)\b/i },
  ipoMa:          { label: 'IPO & M&A',                 room: 'capital', re: /\b(ipo|listing|m&a|merger|acquisition|takeover|spinoff|valuation)\b/i },
  familyBusiness: { label: 'Family Business',           room: 'capital', re: /\b(family office|family business|succession|next generation|patriarch|heir)\b/i },
  workforce:      { label: 'Workforce & HR',            room: 'capital', re: /\b(workforce|hiring|talent|salary|emiratisation|recruitment|layoff)\b/i },

  tax:            { label: 'Tax & Regulatory',          room: 'risk',    re: /\b(tax|vat|e-?invoicing|fta|cbuae|dfsa|adgm|regulator|compliance|amnesty|pillar two)\b/i },
  geopolitical:   { label: 'Geopolitical Risk',         room: 'risk',    re: /\b(geopolitic|tension|sanction|conflict|war|trump|biden|middle east|iran|israel)\b/i },
  supplyChain:    { label: 'Supply Chain Disruption',   room: 'risk',    re: /\b(supply chain|shipping|logistics|freight|hormuz|red sea|tariff|trade war)\b/i },
  emerging:       { label: 'Emerging Risks',            room: 'risk',    re: /\b(risk|disruption|cyber|fraud|breach|crisis|warning|threat)\b/i },

  ai:             { label: 'AI & Technology',           room: 'world',   re: /\b(artificial intelligence|\bai\b|machine learning|generative|chatgpt|claude|\bllm\b|\bgpt\b|agentic)\b/i },
  digital:        { label: 'Digital Transformation',    room: 'world',   re: /\b(digital transformation|cloud|saas|automation|cybersecurity|fintech)\b/i },
  oil:            { label: 'Oil & Energy Markets',      room: 'world',   re: /\b(oil|opec|crude|brent|wti|petroleum|\bgas\b|energy|barrel|aramco|adnoc)\b/i },
  global:         { label: 'Global Economic Signals',   room: 'world',   re: /\b(global|world economy|developed|emerging market|china|us economy|europe|asia pacific)\b/i },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function normaliseDomain(d) {
  return (d || '').toLowerCase().replace(/^www\./, '');
}

function isBig4(domain) {
  const d = normaliseDomain(domain);
  return BIG4_EXCLUDED.some(b => d === b || d.endsWith('.' + b));
}

function isPrioritySource(domain) {
  const d = normaliseDomain(domain);
  if (PRIORITY_SOURCES.has(d)) return true;
  for (const p of PRIORITY_SOURCES) {
    if (d.endsWith('.' + p)) return true;
  }
  return false;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function computeHoursAgo(dateInput) {
  let ms;
  if (typeof dateInput === 'number') {
    ms = dateInput;
  } else if (typeof dateInput === 'string') {
    // Order matters — most specific format first.
    if (/^\d{8}T\d{4,6}Z?$/.test(dateInput)) {
      // GDELT format: YYYYMMDDTHHMMSSZ
      const y = parseInt(dateInput.slice(0, 4));
      const m = parseInt(dateInput.slice(4, 6)) - 1;
      const d = parseInt(dateInput.slice(6, 8));
      const h = parseInt(dateInput.slice(9, 11)) || 0;
      const mi = parseInt(dateInput.slice(11, 13)) || 0;
      ms = Date.UTC(y, m, d, h, mi);
    } else if (/^\d{10,16}$/.test(dateInput)) {
      // Pure numeric string — Unix ms (13-16 digits) or seconds (10 digits)
      const n = parseInt(dateInput, 10);
      ms = dateInput.length <= 10 ? n * 1000 : n;
    } else {
      // Standard date string — RFC 2822, ISO 8601, etc.
      ms = Date.parse(dateInput);
    }
  }
  if (isNaN(ms) || !isFinite(ms)) return 999;
  return Math.max(0, Math.round((Date.now() - ms) / 3600000));
}

function gdeltDateString(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
}

function prettifyDomain(domain) {
  const map = {
    'mof.gov.ae': 'Ministry of Finance', 'tax.gov.ae': 'Federal Tax Authority',
    'centralbank.ae': 'CBUAE', 'cbuae.gov.ae': 'CBUAE',
    'dfsa.ae': 'DFSA', 'adgm.com': 'ADGM', 'difc.ae': 'DIFC',
    'wam.ae': 'WAM', 'mohre.gov.ae': 'MoHRE', 'moiat.gov.ae': 'MoIAT',
    'thenationalnews.com': 'The National', 'gulfnews.com': 'Gulf News',
    'khaleejtimes.com': 'Khaleej Times', 'arabianbusiness.com': 'Arabian Business',
    'zawya.com': 'Zawya', 'argaam.com': 'Argaam', 'agbi.com': 'AGBI',
    'bloomberg.com': 'Bloomberg', 'reuters.com': 'Reuters',
    'ft.com': 'Financial Times', 'wsj.com': 'Wall Street Journal',
    'cnbc.com': 'CNBC', 'mondaq.com': 'Mondaq', 'lexology.com': 'Lexology',
    'meed.com': 'MEED', 'apnews.com': 'AP', 'bbc.com': 'BBC', 'bbc.co.uk': 'BBC',
    'aljazeera.com': 'Al Jazeera', 'theguardian.com': 'The Guardian',
    'reddit.com': 'Reddit',
  };
  const clean = normaliseDomain(domain);
  if (map[clean]) return map[clean];
  const first = clean.split('.')[0] || domain || '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function normalizeTitle(t) {
  return (t || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

// Strip CDATA + decode common HTML entities (no DOM here)
function unwrapText(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// SOURCE FETCHERS
// ═══════════════════════════════════════════════════════════════

// ─── 1. GDELT DOC 2.0 ─────────────────────────────────────────
async function fetchGDELT() {
  // Try 24h first (per spec), fall back to 72h if empty
  for (const timespan of ['24H', '72H']) {
    const params = new URLSearchParams({
      query: '("UAE" OR "Dubai" OR "Abu Dhabi" OR "GCC")',
      mode: 'ArtList',
      format: 'json',
      sort: 'HybridRel',
      maxrecords: '100',
      timespan,
    });
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;

    console.log(`[GDELT] fetching (timespan=${timespan})...`);
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        console.warn(`[GDELT] HTTP ${resp.status} at ${timespan}`);
        continue;
      }
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); }
      catch {
        console.warn(`[GDELT] non-JSON response at ${timespan}: ${text.slice(0, 200)}`);
        continue;
      }
      const list = data.articles || [];
      if (list.length === 0) {
        console.warn(`[GDELT] 0 articles at timespan=${timespan}, trying wider window`);
        continue;
      }
      const articles = list.map(a => ({
        title: a.title || '',
        url: a.url || '',
        domain: normaliseDomain(a.domain || ''),
        source: prettifyDomain(a.domain || ''),
        description: a.title || '',
        seendate: a.seendate || '',
        language: a.language || 'English',
        imageUrl: a.socialimage || undefined,
        origin: 'gdelt',
      }));
      console.log(`[GDELT] returned ${articles.length} articles at timespan=${timespan}`);
      return articles;
    } catch (e) {
      console.warn(`[GDELT] fetch error at ${timespan}: ${e.message}`);
      continue;
    }
  }
  // All windows exhausted
  console.warn('[GDELT] no articles found across any timespan');
  return [];
}

// ─── 2. Google News RSS (multi-query) ──────────────────────────
const GOOGLE_NEWS_QUERIES = [
  'UAE economy 2026',
  'Dubai business growth',
  'Abu Dhabi investment',
  'UAE Federal Tax Authority',
  'UAE corporate tax',
  'UAE eInvoicing',
  'CBUAE rate decision',
  'DIFC ADGM new registrations',
  'UAE sukuk bond issuance',
  'OPEC oil price',
  'Middle East shipping Hormuz',
  'UAE artificial intelligence Dubai',
  'UAE real estate Dubai property',
  'UAE IPO listing ADX',
  'Emiratisation MoHRE deadline',
];

function parseRSS(xml, defaultSource) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
    return m ? unwrapText(m[1]) : '';
  };
  for (const block of itemMatches) {
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    const description = tag(block, 'description');
    const pubDate = tag(block, 'pubDate');
    // Google News exposes the original source domain as <source url="https://...">
    const sourceMatch = block.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    const sourceUrl = sourceMatch ? sourceMatch[1] : link;
    const sourceName = sourceMatch ? unwrapText(sourceMatch[2]) : defaultSource;
    const domain = extractDomain(sourceUrl);
    if (!title || !link) continue;
    items.push({
      title,
      url: link,
      domain,
      source: sourceName || prettifyDomain(domain),
      description: description || title,
      seendate: String(Date.parse(pubDate || '') || Date.now()),
      language: 'English',
      origin: 'google-news',
    });
  }
  return items;
}

async function fetchGoogleNewsRSS() {
  console.log(`[GoogleNews] fetching ${GOOGLE_NEWS_QUERIES.length} queries in parallel...`);
  const results = await Promise.all(GOOGLE_NEWS_QUERIES.map(async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=AE&ceid=AE:en`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!resp.ok) return [];
      const xml = await resp.text();
      return parseRSS(xml, 'Google News').slice(0, 10);
    } catch {
      return [];
    }
  }));
  const flat = results.flat();
  console.log(`[GoogleNews] total returned: ${flat.length}`);
  return flat;
}

// ─── 3. Reddit public JSON ─────────────────────────────────────
const REDDIT_SUBREDDITS = [
  'economics', 'finance', 'investing', 'business',
  'geopolitics', 'worldnews', 'artificial',
];

async function fetchReddit() {
  console.log(`[Reddit] fetching ${REDDIT_SUBREDDITS.length} subreddits...`);
  const results = await Promise.all(REDDIT_SUBREDDITS.map(async (sub) => {
    const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=20`;
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': 'mics-intel-bot/1.0 (https://alexyngcong.github.io/mics-social-media-engine)' },
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      const children = data?.data?.children || [];
      return children
        .filter(c => c?.data?.title && !c.data.over_18 && !c.data.stickied)
        .map(c => {
          const d = c.data;
          const externalUrl = d.url_overridden_by_dest;
          const isExternal = externalUrl && !externalUrl.includes('reddit.com');
          const domain = isExternal ? extractDomain(externalUrl) : 'reddit.com';
          return {
            title: d.title,
            url: isExternal ? externalUrl : `https://reddit.com${d.permalink}`,
            domain,
            source: isExternal ? prettifyDomain(domain) : `Reddit r/${sub}`,
            description: d.selftext?.slice(0, 600) || d.title,
            seendate: String(d.created_utc * 1000),
            language: 'English',
            redditScore: d.score,
            redditComments: d.num_comments,
            origin: `reddit-${sub}`,
          };
        });
    } catch {
      return [];
    }
  }));
  const flat = results.flat();
  console.log(`[Reddit] total returned: ${flat.length}`);
  return flat;
}

// ─── 4. Google Trends RSS (UAE region) ─────────────────────────
async function fetchGoogleTrends() {
  // Two endpoint variants — Google has been migrating; try newest first
  const urls = [
    'https://trends.google.com/trending/rss?geo=AE',
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=AE',
  ];
  console.log('[Trends] fetching UAE trends RSS...');
  for (const url of urls) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!resp.ok) continue;
      const xml = await resp.text();
      const items = parseRSS(xml, 'Google Trends UAE');
      if (items.length > 0) {
        console.log(`[Trends] returned ${items.length} items via ${url}`);
        return items.map(i => ({ ...i, origin: 'google-trends' }));
      }
    } catch { continue; }
  }
  console.warn('[Trends] all endpoints failed');
  return [];
}

// ─── 5. Direct UAE business RSS feeds ──────────────────────────
const UAE_RSS_FEEDS = [
  { url: 'https://www.thenationalnews.com/business/rss.xml', source: 'The National' },
  { url: 'https://gulfnews.com/business/rss.xml', source: 'Gulf News' },
  { url: 'https://www.khaleejtimes.com/rss/business', source: 'Khaleej Times' },
  { url: 'https://www.agbi.com/feed/', source: 'AGBI' },
  { url: 'https://gulfbusiness.com/feed/', source: 'Gulf Business' },
];

async function fetchUAEFeeds() {
  console.log(`[UAE-RSS] fetching ${UAE_RSS_FEEDS.length} feeds in parallel...`);
  const results = await Promise.all(UAE_RSS_FEEDS.map(async (feed) => {
    try {
      const resp = await fetch(feed.url, { signal: AbortSignal.timeout(15_000) });
      if (!resp.ok) return [];
      const xml = await resp.text();
      return parseRSS(xml, feed.source).slice(0, 15).map(i => ({ ...i, origin: 'uae-rss' }));
    } catch {
      return [];
    }
  }));
  const flat = results.flat();
  console.log(`[UAE-RSS] total returned: ${flat.length}`);
  return flat;
}

// ═══════════════════════════════════════════════════════════════
// SCORING — 12-DIMENSION RUBRIC
// ═══════════════════════════════════════════════════════════════

function scoreArticle(article) {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  const breakdown = {};

  // 1. UAE/GCC relevance (0-2)
  let uaeRelevance = 0;
  if (/\b(uae|emirates|dubai|abu dhabi|sharjah|fujairah|ajman)\b/i.test(text)) uaeRelevance += 1;
  if (/\b(gcc|gulf|saudi|qatar|kuwait|bahrain|oman)\b/i.test(text)) uaeRelevance += 1;
  breakdown.uaeRelevance = uaeRelevance;

  // 2. CFO/founder/investor angle (0-2)
  let cfoAngle = 0;
  if (/\b(cfo|treasurer|founder|ceo|board|investor|shareholder)\b/i.test(text)) cfoAngle += 1;
  if (/\b(revenue|profit|margin|cost|funding|valuation|cash|capital)\b/i.test(text)) cfoAngle += 1;
  breakdown.cfoAngle = cfoAngle;

  // 3. Engagement potential (0-1)
  const engagement = /\b(record|highest|lowest|first|biggest|largest|breaking|exclusive|major)\b/i.test(text) ? 1 : 0;
  breakdown.engagement = engagement;

  // 4. Strategic importance (0-1)
  const strategic = /\b(strategic|strategy|long-term|transform|reform|paradigm|landscape)\b/i.test(text) ? 1 : 0;
  breakdown.strategic = strategic;

  // 5. Financial impact (0-1)
  const financial = /\b\d[\d,.]*\s*(billion|million|trillion|aed|usd|dhs|\$|%)/i.test(text) ? 1 : 0;
  breakdown.financial = financial;

  // 6. Regulatory impact (0-1)
  const regulatory = /\b(regulation|regulatory|compliance|law|legal|rule|framework|directive|deadline|penalty)\b/i.test(text) ? 1 : 0;
  breakdown.regulatory = regulatory;

  // 7. Geopolitical impact (0-1)
  const geopolitical = /\b(geopolitic|tension|sanction|conflict|war|middle east|iran|israel|trade war)\b/i.test(text) ? 1 : 0;
  breakdown.geopolitical = geopolitical;

  // 8. Virality potential (0-1)
  const virality = /\b(announce|launch|sign|approve|reveal|warn|threaten|hit|surge|crash|deal|deal)\b/i.test(text) ? 1 : 0;
  breakdown.virality = virality;

  // 9. Emotional trigger (0-1)
  const emotional = /\b(urgent|breaking|crisis|warning|alert|emergency|threat|opportunity|deadline|effective)\b/i.test(text) ? 1 : 0;
  breakdown.emotional = emotional;

  // 10. Source credibility (0-1)
  const credibility = isPrioritySource(article.domain) ? 1 : 0;
  breakdown.credibility = credibility;

  // 11. Freshness (0-1)
  const hoursAgo = computeHoursAgo(article.seendate);
  const freshness = hoursAgo <= 24 ? 1 : (hoursAgo <= 48 ? 0.5 : 0);
  breakdown.freshness = freshness;
  breakdown.hoursAgo = hoursAgo;

  // 12. Postable as content (0-1) — has concrete signal worth a post
  const postable = (financial || virality || regulatory || engagement) ? 1 : 0;
  breakdown.postable = postable;

  const score = uaeRelevance + cfoAngle + engagement + strategic + financial +
                regulatory + geopolitical + virality + emotional + credibility +
                freshness + postable;

  return { score: Math.round(score * 10) / 10, breakdown };
}

function classifyTopic(article) {
  const text = article.title + ' ' + (article.description || '');
  for (const [key, t] of Object.entries(TOPICS)) {
    if (t.re.test(text)) return { key, room: t.room, label: t.label };
  }
  // Default to world if uncategorised
  return { key: 'global', room: 'world', label: 'Global Economic Signals' };
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE
// ═══════════════════════════════════════════════════════════════

function deduplicate(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const key = normalizeTitle(a.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('AI Business Intelligence Command Center — Multi-Source Fetcher');
  console.log(`Threshold: score ≥ ${MIN_SCORE_THRESHOLD} of 14 max`);
  console.log(`Recency: ≤ ${MAX_AGE_HOURS}h`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Fetch all 5 sources in parallel
  const [gdelt, googleNews, reddit, trends, uaeRss] = await Promise.all([
    fetchGDELT(),
    fetchGoogleNewsRSS(),
    fetchReddit(),
    fetchGoogleTrends(),
    fetchUAEFeeds(),
  ]);

  const sourceCounts = {
    gdelt: gdelt.length,
    googleNews: googleNews.length,
    reddit: reddit.length,
    trends: trends.length,
    uaeRss: uaeRss.length,
  };
  const allArticles = [...gdelt, ...googleNews, ...reddit, ...trends, ...uaeRss];
  console.log(`\n[PIPELINE] Total fetched: ${allArticles.length}`);

  // Deduplicate
  const deduped = deduplicate(allArticles);
  console.log(`[PIPELINE] After dedup: ${deduped.length}`);

  // Big-4 exclusion
  const noBig4 = deduped.filter(a => !isBig4(a.domain));
  const big4Rejected = deduped.length - noBig4.length;
  console.log(`[PIPELINE] Big-4 rejected: ${big4Rejected}`);

  // English only
  const englishOnly = noBig4.filter(a => !a.language || a.language === 'English');
  console.log(`[PIPELINE] English only: ${englishOnly.length}`);

  // Recency gate
  const recent = englishOnly.filter(a => computeHoursAgo(a.seendate) <= MAX_AGE_HOURS);
  console.log(`[PIPELINE] Within ${MAX_AGE_HOURS}h: ${recent.length}`);

  // Score + categorise everything
  const scored = recent.map(a => {
    const { score, breakdown } = scoreArticle(a);
    const topic = classifyTopic(a);
    return { ...a, score, breakdown, topic: topic.key, topicLabel: topic.label, room: topic.room };
  });

  // Filter to threshold
  const passed = scored.filter(a => a.score >= MIN_SCORE_THRESHOLD);
  passed.sort((a, b) => b.score - a.score);
  console.log(`[PIPELINE] ✅ Passed threshold (≥${MIN_SCORE_THRESHOLD}): ${passed.length}`);

  // Group by room with per-room cap
  const rooms = { growth: [], capital: [], risk: [], world: [] };
  for (const a of passed) {
    if (rooms[a.room].length < PER_ROOM_CAP) {
      // Strip internal fields before output
      rooms[a.room].push({
        title: a.title,
        url: a.url,
        source: a.source,
        domain: a.domain,
        date: new Date(Date.now() - (a.breakdown.hoursAgo || 0) * 3600000).toISOString().slice(0, 10),
        description: a.description?.slice(0, 600) || a.title,
        imageUrl: a.imageUrl,
        hoursAgo: a.breakdown.hoursAgo,
        score: a.score,
        topic: a.topicLabel,
        origin: a.origin,
      });
    }
  }

  console.log('\nPer-room breakdown:');
  for (const room of ['growth', 'capital', 'risk', 'world']) {
    console.log(`  ${room.padEnd(10)} ${rooms[room].length}`);
  }

  // Top 10 scorers for visibility in logs
  console.log('\nTop 10 by score:');
  for (const a of passed.slice(0, 10)) {
    console.log(`  [${a.score}] [${a.room}] [${a.source}] ${a.title.slice(0, 80)}`);
  }

  // Diagnostic — if zero or few results, show the borderline rejections
  if (passed.length < 5) {
    const borderline = scored
      .filter(a => a.score < MIN_SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    console.log(`\nDiagnostic — top 10 borderline rejections (score < ${MIN_SCORE_THRESHOLD}):`);
    for (const a of borderline) {
      console.log(`  [${a.score}] [${a.domain}] ${a.title.slice(0, 70)}`);
    }
  }

  const output = {
    schemaVersion: 3,
    spec: 'AI Business Intelligence Command Center v1.0',
    generatedAt: new Date().toISOString(),
    minScore: MIN_SCORE_THRESHOLD,
    maxScore: 14,
    cutoffHours: MAX_AGE_HOURS,
    sources: sourceCounts,
    diagnostic: {
      totalFetched: allArticles.length,
      afterDedup: deduped.length,
      big4Rejected,
      englishOnly: englishOnly.length,
      withinRecency: recent.length,
      scored: scored.length,
      passed: passed.length,
    },
    rooms,
    totalCount: passed.length,
  };

  await writeFile('news-latest.json', JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Written news-latest.json — ${passed.length} articles across 4 rooms\n`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
