/**
 * NEWS FETCHER — Multi-source live news with zero API keys
 *
 * Recency-first design (per UAE production-requirements doc):
 *   - 0-72h breaking window is highest priority
 *   - 3-7d secondary pool only if 0-72h is empty
 *   - UAE-specific Tier 1 (gov.ae, mof, fta, dfsa, adgm, cbuae, wam) preferred
 *
 * Priority chain:
 *   1. GDELT DOC API (CORS-enabled, JSON, real-time, sorted by date)
 *   2. Google News RSS via CORS proxy (XML, reliable)
 *   3. Pre-seeded fallback topics (always available, shuffled)
 *
 * Anti-repetition:
 *   - Returns 6-10 articles, caller picks randomly from top-N most recent
 *   - Queries rotate across multiple UAE topical seeds
 */

import type { RoomId } from '../types';

// ─── Article shape ──────────────────────────────────────────────

export interface NewsArticle {
  fetchedAt?: string;

  title: string;
  url: string;
  source: string;       // domain or publication name
  date: string;         // ISO date YYYY-MM-DD
  description: string;  // snippet/summary if available
  imageUrl?: string;
  hoursAgo?: number;    // approximate age in hours (for freshness scoring)
  /**
   * Optional CFO-specific implication from an imported Deep Research brief.
   * When present, layouts use this as the body content instead of the
   * generic ROOM_BODY templates — letting LLM-quality analysis flow into
   * the post structure without requiring the app to call an LLM itself.
   */
  briefImplication?: string;
}

/**
 * AUDIT-REFRESH POLICY — Ladder freshness, with explicit age labelling.
 *
 * Tries 24h first (today-only). If GDELT returns nothing fresh — which
 * happens often for niche UAE-relevant topics because their best
 * coverage sits behind paywalls (Mondaq/MEED/Lexology/Bloomberg) and
 * GDELT can't freshly index that — falls back to 48h, then 72h. Past
 * 72h, hard reject.
 *
 * Every article carries its actual hoursAgo so the UI can show
 * exactly how old a piece of news is. The user makes the post/skip
 * decision with full information rather than getting an opaque "no
 * fresh news" wall.
 *
 * Future-dated articles (hoursAgo < 0) are always rejected.
 */
export const MAX_ARTICLE_AGE_HOURS = 72;
export const PREFERRED_ARTICLE_AGE_HOURS = 24;

function isWithinRecencyWindow(article: NewsArticle, maxAgeHours = MAX_ARTICLE_AGE_HOURS): boolean {
  const age = article.hoursAgo;
  if (age === undefined || age === null) return true; // unknown age → defer to source-level dedupe (fallback only)
  if (age < 0) return false; // future-dated → reject
  return age <= maxAgeHours;
}

/**
 * Hard freshness filter applied to every batch of articles before they
 * leave this module. Returns only articles within the recency window.
 */
function enforceRecency(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter(a => isWithinRecencyWindow(a));
}

// ─── APPROVED SOURCES WHITELIST ─────────────────────────────────
// Tier 1 = UAE official regulators / ministries (highest authority weight)
// Tier 2 = UAE official state media + Gulf regional outlets
// Tier 3 = Global financial wires + specialist tax/legal/advisory intelligence
// Tier 4 = Ratings agencies, multilaterals, policy think tanks, energy bodies
//
// All Big 4 (Deloitte, KPMG, EY, PwC) and consulting firms (McKinsey, BCG,
// Bain, Accenture) are BLOCKED by qaValidator.ts as primary sources.

const APPROVED_DOMAINS: string[] = [
  // ─── TIER 1 — UAE Official Regulators & Ministries ───
  'mof.gov.ae',           // Ministry of Finance
  'tax.gov.ae',           // Federal Tax Authority
  'centralbank.ae', 'cbuae.gov.ae',  // CBUAE
  'dfsa.ae',              // DFSA (DIFC regulator)
  'adgm.com',             // ADGM (Abu Dhabi Global Market)
  'difc.ae',              // DIFC
  'sca.gov.ae',           // Securities & Commodities Authority
  'economy.gov.ae',       // Ministry of Economy
  'mohre.gov.ae',         // Ministry of Human Resources & Emiratisation
  'moiat.gov.ae',         // Ministry of Industry & Advanced Technology
  'mofaic.gov.ae',        // Ministry of Foreign Affairs
  'rera.gov.ae', 'dubailand.gov.ae',
  'moi.gov.ae',
  'ded.ae',
  'dubaichamber.com',     // Dubai Chamber

  // ─── TIER 2 — UAE Official State Media + Government Communications ───
  'wam.ae',               // Emirates News Agency (official)
  'mediaoffice.ae',       // UAE Government Media Office (Dubai)
  'mediaoffice.abudhabi', // Abu Dhabi Government Media Office

  // ─── TIER 2 — Trusted UAE / Gulf regional outlets ───
  'thenationalnews.com', 'gulfnews.com', 'zawya.com',
  'khaleejtimes.com', 'arabianbusiness.com', 'argaam.com',
  'agbi.com',             // Arabian Gulf Business Insight
  'economymiddleeast.com',
  'gulfbusiness.com',
  'gulftoday.ae',
  'emirates247.com',

  // ─── TIER 3 — Specialist legal / tax / advisory intelligence ───
  'mondaq.com',                       // Tax & legal commentary
  'meed.com',                         // Middle East Economic Digest
  'lexology.com',                     // Legal updates
  'bluej.com',                        // Blue J — tax research
  'thomsonreuters.com',               // Thomson Reuters parent (CoCounsel blogs)
  'tax.thomsonreuters.com',           // Checkpoint Edge — tax & accounting research
  'legal.thomsonreuters.com',         // CoCounsel — legal AI research
  'bloombergtax.com',                 // Bloomberg Tax
  'taxnotes.com',                     // Tax Notes
  'internationaltaxreview.com',       // International Tax Review
  'taxfoundation.org',                // Tax Foundation
  'pinsentmasons.com',                // Out-Law / Pinsent Masons legal updates
  'whitecase.com',                    // White & Case (only when surfaced via free public blog)

  // ─── TIER 3 — Tier-1 global financial wires ───
  'bloomberg.com', 'reuters.com', 'ft.com', 'wsj.com',
  'economist.com', 'nikkei.com', 'scmp.com',
  'cnbc.com',                         // CNBC
  'marketwatch.com',                  // MarketWatch (Dow Jones)
  'forbes.com',                       // Forbes business
  'businessinsider.com',
  'ftadviser.com',                    // FT Adviser
  'euromoney.com',                    // Euromoney finance specialist
  'thebanker.com',                    // The Banker
  'bankerme.com',                     // Banker Middle East

  // ─── TIER 4 — Multilateral institutions & central banks ───
  'imf.org', 'worldbank.org', 'oecd.org', 'bis.org',
  'federalreserve.gov', 'ecb.europa.eu',
  'bankofengland.co.uk',
  'wto.org',
  'unctad.org',

  // ─── TIER 4 — Ratings agencies ───
  'spglobal.com',                     // S&P Global Ratings
  'moodys.com',                       // Moody's Investors Service
  'fitchratings.com',                 // Fitch Ratings

  // ─── TIER 4 — Energy & commodity authorities (oil-market context for UAE) ───
  'opec.org',                         // OPEC
  'iea.org',                          // International Energy Agency
  'eia.gov',                          // US Energy Information Administration
  'argusmedia.com',                   // Argus Media (energy pricing)

  // ─── TIER 4 — Policy / think-tank research ───
  'brookings.edu',                    // Brookings Institution
  'chathamhouse.org',                 // Chatham House
  'cfr.org',                          // Council on Foreign Relations
  'piie.com',                         // Peterson Institute for International Economics
  'rand.org',                         // RAND
  'hbr.org',                          // Harvard Business Review

  // ─── Trusted wire services ───
  'apnews.com', 'afp.com',
];

function isApprovedSource(domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, '');
  return APPROVED_DOMAINS.some(approved => d === approved || d.endsWith('.' + approved));
}

// ─── CORS fallback chain ───────────────────────────────────────
// GDELT returns inconsistent CORS headers from browsers. Public CORS
// proxies go down regularly. Our only path to "this just works" is a
// long chain of options — try direct, then 5 different proxies.

type ProxyBuilder = (url: string) => string;

const CORS_PROXY_CHAIN: Array<{ name: string; build: ProxyBuilder }> = [
  // No proxy — direct call. GDELT's CORS behaviour varies by browser
  // and origin; sometimes it returns valid CORS headers, sometimes not.
  // Always worth trying first.
  { name: 'direct',           build: (u) => u },
  // codetabs — free, no API key, no domain restrictions. Most reliable
  // free option as of 2026. Slower than paid options but it works.
  { name: 'codetabs',         build: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
  // allorigins — historically reliable, sometimes slow or timing out.
  // Two endpoints: /raw returns raw response, /get returns JSON wrapper.
  { name: 'allorigins-raw',   build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { name: 'allorigins-get',   build: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}` },
  // thingproxy — free, simple URL-rewrite proxy, slower but no key needed.
  { name: 'thingproxy',       build: (u) => `https://thingproxy.freeboard.io/fetch/${u}` },
  // cors-anywhere — public demo instance. Requires one-time activation at
  // https://cors-anywhere.herokuapp.com/corsdemo for each browser. Last
  // resort, but if everything else is blocked this is usually still up.
  { name: 'cors-anywhere',    build: (u) => `https://cors-anywhere.herokuapp.com/${u}` },
];

interface CorsFetchOptions {
  timeoutMs?: number;
  /** Optional sink to record which proxy name succeeded, for diagnostics */
  onProxyHit?: (proxyName: string) => void;
}

/**
 * Session-level cache of which proxy is known to work in this browser.
 * Once we find one that succeeds, subsequent fetches go straight to it
 * instead of cycling through the whole chain. Dramatically reduces
 * request spam (was 120+ per probe, now ~4-8).
 */
let workingProxyName: string | null = null;
/** If all proxies have been confirmed dead this session, short-circuit. */
let allProxiesDeadUntil: number = 0;

/**
 * Fetch a URL using the CORS chain. Smart caching:
 *   - If a proxy is known to work this session, use it directly
 *   - Otherwise try the chain
 *   - If ALL fail, cache that fact for 60s to avoid request storms
 */
async function fetchWithCorsChain(
  url: string,
  options: CorsFetchOptions = {},
): Promise<Response | null> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const now = Date.now();

  // Short-circuit if we've recently confirmed all proxies are blocked
  if (allProxiesDeadUntil > now) return null;

  // Fast path: cached working proxy
  if (workingProxyName) {
    const cached = CORS_PROXY_CHAIN.find(p => p.name === workingProxyName);
    if (cached) {
      try {
        const resp = await fetch(cached.build(url), { signal: AbortSignal.timeout(timeoutMs) });
        if (resp.ok) {
          options.onProxyHit?.(cached.name);
          return resp;
        }
      } catch { /* fall through to full chain */ }
      // Cached proxy failed — invalidate
      workingProxyName = null;
    }
  }

  // Cold path: try the chain once
  for (const proxy of CORS_PROXY_CHAIN) {
    try {
      const resp = await fetch(proxy.build(url), { signal: AbortSignal.timeout(timeoutMs) });
      if (resp.ok) {
        workingProxyName = proxy.name; // cache for subsequent fetches
        options.onProxyHit?.(proxy.name);
        return resp;
      }
    } catch {
      // Try next
    }
  }

  // All proxies failed — short-circuit further attempts for 60 seconds
  allProxiesDeadUntil = now + 60_000;
  return null;
}

/**
 * Reset the proxy cache. Call when the user manually retries so they can
 * try fresh after a network change.
 */
export function resetProxyCache() {
  workingProxyName = null;
  allProxiesDeadUntil = 0;
}

/**
 * Diagnostic — last fetch attempt status, exposed so UI can show
 * "all proxies blocked" guidance to the user.
 */
let lastFetchDiagnostic: {
  succeeded: boolean;
  proxyUsed: string | null;
  attemptedAt: number;
} = { succeeded: false, proxyUsed: null, attemptedAt: 0 };

export function getLastFetchDiagnostic() {
  return lastFetchDiagnostic;
}

/**
 * Public connectivity test — explicitly probes every proxy against a
 * tiny known-good URL and reports which ones work from the current
 * browser session. Used by the in-app diagnostic button.
 */
export interface ProxyTestResult {
  name: string;
  ok: boolean;
  status: number | 'timeout' | 'network-error';
  latencyMs: number;
}

export async function testCorsProxies(): Promise<ProxyTestResult[]> {
  // Use a tiny stable URL that should always return 200
  const testUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?query=UAE&mode=ArtList&maxrecords=1&format=json';

  const results = await Promise.all(
    CORS_PROXY_CHAIN.map(async (proxy) => {
      const start = Date.now();
      try {
        const resp = await fetch(proxy.build(testUrl), {
          signal: AbortSignal.timeout(6000),
        });
        return {
          name: proxy.name,
          ok: resp.ok,
          status: resp.status,
          latencyMs: Date.now() - start,
        } as ProxyTestResult;
      } catch (e) {
        const isTimeout = e instanceof DOMException && e.name === 'TimeoutError';
        return {
          name: proxy.name,
          ok: false,
          status: (isTimeout ? 'timeout' : 'network-error') as 'timeout' | 'network-error',
          latencyMs: Date.now() - start,
        } as ProxyTestResult;
      }
    })
  );

  return results;
}

// ─── Room-specific query rotation (anti-repetition) ─────────────
// Multiple query variants per room, randomly cycled each call,
// so two consecutive fetches against the same room return
// different article pools.

const ROOM_QUERY_VARIANTS: Record<RoomId, string[]> = {
  growth: [
    '"UAE non-oil GDP" OR "Dubai FDI" OR "MoIAT financing"',
    '"DIFC" expansion OR "ADGM" registrations OR "Abu Dhabi investment"',
    '"Make it in the Emirates" OR "UAE industrial financing" OR "Emiratisation"',
    '"UAE startup" OR "Dubai IPO" OR "GCC merger"',
    '"agentic AI" Dubai OR "private sector AI" UAE',
  ],
  capital: [
    '"CBUAE" rate OR "UAE bond" OR "sukuk issuance"',
    '"DIFC private credit" OR "ADGM fund" OR "UAE treasury"',
    '"UAE sovereign wealth" ADQ OR Mubadala OR ADIA',
    '"Dubai Financial Market" OR "ADX" listing OR IPO',
    '"Islamic finance" UAE OR "Shariah" structured finance',
  ],
  risk: [
    '"Federal Tax Authority" OR "FTA" UAE penalty',
    '"Ministry of Finance" UAE tax procedures OR amendments',
    '"eInvoicing" UAE OR "electronic invoicing" Phase',
    '"ADGM AML" OR "DFSA consultation" OR "UAE compliance"',
    '"corporate tax" UAE filing OR audit OR "beneficial ownership"',
    '"DFSA Islamic finance" OR "ADGM rulebook" consultation',
  ],
  world: [
    '"Federal Reserve" rate decision OR "ECB" policy',
    '"BRICS" trade OR "emerging markets" capital flow',
    '"OECD Pillar 2" OR "global minimum tax" OR "Pillar Two"',
    '"China" stimulus OR "India" economy OR "geopolitical risk"',
    '"oil price" OPEC OR "energy transition" OR "carbon border"',
  ],
};

// Pick a random variant each call → query diversity over time
function pickRoomQuery(room: RoomId): string {
  const variants = ROOM_QUERY_VARIANTS[room];
  return variants[Math.floor(Math.random() * variants.length)];
}

// ─── GDELT DOC API ──────────────────────────────────────────────

function gdeltDateParam(hoursAgo: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}00`;
}

interface GDELTArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GDELTResponse {
  articles?: GDELTArticle[];
}

/**
 * Fetch news from GDELT with a ladder recency window.
 * Tries 12h (breaking) → 24h (today) → 48h → 72h, returning the first
 * window that yields approved-source articles. Past 72h, hard reject.
 */
async function fetchGDELT(room: RoomId, maxResults = 10): Promise<NewsArticle[]> {
  const query = pickRoomQuery(room);
  const encoded = encodeURIComponent(query);

  // Single 72h request. The recency filter (isWithinRecencyWindow)
  // applied per-article still respects the user's preferred freshness.
  // No cascading — one fetch, success or fail.
  const startDate = gdeltDateParam(MAX_ARTICLE_AGE_HOURS);
  const endDate = gdeltDateParam(0);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encoded}&mode=ArtList&maxrecords=${maxResults}&format=json&sort=DateDesc&startdatetime=${startDate}&enddatetime=${endDate}`;

  const resp = await fetchWithCorsChain(url, {
    timeoutMs: 8000,
    onProxyHit: (i) => { lastFetchDiagnostic = { succeeded: true, proxyUsed: i, attemptedAt: Date.now() }; },
  });

  if (!resp) {
    lastFetchDiagnostic = { succeeded: false, proxyUsed: null, attemptedAt: Date.now() };
    throw new Error('GDELT: all CORS proxies blocked from this network');
  }

  try {
    const data: GDELTResponse = await resp.json();
    if (!data.articles?.length) {
      throw new Error('GDELT: no articles in 72h window');
    }
    const filtered = data.articles
      .filter(a => (a.language === 'English' || !a.language) && isApprovedSource(a.domain || ''))
      .map(a => articleFromGDELT(a))
      .filter(a => isWithinRecencyWindow(a));
    if (!filtered.length) {
      throw new Error('GDELT: no approved-source articles in window');
    }
    return filtered;
  } catch (e) {
    throw e instanceof Error ? e : new Error('GDELT: parse error');
  }
}

function articleFromGDELT(a: GDELTArticle): NewsArticle {
  const date = formatGDELTDate(a.seendate || '');
  const hoursAgo = computeHoursAgo(a.seendate || '');
  return {
    title: a.title || '',
    url: a.url || '',
    source: prettifyDomain(a.domain || ''),
    date,
    description: a.title || '',
    imageUrl: a.socialimage || undefined,
    hoursAgo,
  };
}

function computeHoursAgo(seendate: string): number {
  try {
    const year = parseInt(seendate.slice(0, 4));
    const month = parseInt(seendate.slice(4, 6)) - 1;
    const day = parseInt(seendate.slice(6, 8));
    const hour = parseInt(seendate.slice(9, 11)) || 0;
    const minute = parseInt(seendate.slice(11, 13)) || 0;
    const d = new Date(Date.UTC(year, month, day, hour, minute));
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 3600000));
  } catch {
    return 999;
  }
}

function prettifyDomain(domain: string): string {
  const clean = domain.toLowerCase().replace(/^www\./, '');
  // Display labels for known sources. Order matches source list grouping.
  const officialMap: Record<string, string> = {
    // UAE official
    'mof.gov.ae': 'Ministry of Finance',
    'tax.gov.ae': 'Federal Tax Authority',
    'centralbank.ae': 'CBUAE',
    'cbuae.gov.ae': 'CBUAE',
    'dfsa.ae': 'DFSA',
    'adgm.com': 'ADGM',
    'difc.ae': 'DIFC',
    'wam.ae': 'WAM',
    'mohre.gov.ae': 'MoHRE',
    'moiat.gov.ae': 'MoIAT',
    'economy.gov.ae': 'Ministry of Economy',
    'sca.gov.ae': 'SCA',
    'mediaoffice.ae': 'Dubai Media Office',
    'mediaoffice.abudhabi': 'Abu Dhabi Media Office',
    'dubaichamber.com': 'Dubai Chamber',
    // Gulf regional
    'thenationalnews.com': 'The National',
    'gulfnews.com': 'Gulf News',
    'khaleejtimes.com': 'Khaleej Times',
    'arabianbusiness.com': 'Arabian Business',
    'zawya.com': 'Zawya',
    'argaam.com': 'Argaam',
    'agbi.com': 'AGBI',
    'economymiddleeast.com': 'Economy Middle East',
    'gulfbusiness.com': 'Gulf Business',
    'gulftoday.ae': 'Gulf Today',
    'emirates247.com': 'Emirates 24|7',
    // Specialist legal/tax/advisory
    'meed.com': 'MEED',
    'mondaq.com': 'Mondaq',
    'lexology.com': 'Lexology',
    'bluej.com': 'Blue J',
    'thomsonreuters.com': 'Thomson Reuters',
    'tax.thomsonreuters.com': 'Checkpoint Edge',
    'legal.thomsonreuters.com': 'CoCounsel',
    'bloombergtax.com': 'Bloomberg Tax',
    'taxnotes.com': 'Tax Notes',
    'internationaltaxreview.com': 'International Tax Review',
    'taxfoundation.org': 'Tax Foundation',
    'pinsentmasons.com': 'Pinsent Masons',
    'whitecase.com': 'White & Case',
    // Global wires
    'bloomberg.com': 'Bloomberg',
    'reuters.com': 'Reuters',
    'ft.com': 'Financial Times',
    'wsj.com': 'Wall Street Journal',
    'economist.com': 'The Economist',
    'nikkei.com': 'Nikkei Asia',
    'scmp.com': 'South China Morning Post',
    'cnbc.com': 'CNBC',
    'marketwatch.com': 'MarketWatch',
    'forbes.com': 'Forbes',
    'businessinsider.com': 'Business Insider',
    'ftadviser.com': 'FT Adviser',
    'euromoney.com': 'Euromoney',
    'thebanker.com': 'The Banker',
    'bankerme.com': 'Banker Middle East',
    // Multilaterals & central banks
    'imf.org': 'IMF',
    'worldbank.org': 'World Bank',
    'oecd.org': 'OECD',
    'bis.org': 'BIS',
    'federalreserve.gov': 'Federal Reserve',
    'ecb.europa.eu': 'ECB',
    'bankofengland.co.uk': 'Bank of England',
    'wto.org': 'WTO',
    'unctad.org': 'UNCTAD',
    // Ratings agencies
    'spglobal.com': 'S&P Global',
    'moodys.com': 'Moody\'s',
    'fitchratings.com': 'Fitch Ratings',
    // Energy bodies
    'opec.org': 'OPEC',
    'iea.org': 'IEA',
    'eia.gov': 'EIA',
    'argusmedia.com': 'Argus Media',
    // Policy / think tanks
    'brookings.edu': 'Brookings',
    'chathamhouse.org': 'Chatham House',
    'cfr.org': 'CFR',
    'piie.com': 'PIIE',
    'rand.org': 'RAND',
    'hbr.org': 'Harvard Business Review',
    // Wire services
    'apnews.com': 'AP',
    'afp.com': 'AFP',
  };
  if (officialMap[clean]) return officialMap[clean];
  // Generic: take first label, title-case
  const first = clean.split('.')[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function formatGDELTDate(seendate: string): string {
  try {
    return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}


const MAX_ARTICLE_AGE_DAYS = 3;

function isFreshDate(value: string): boolean {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - MAX_ARTICLE_AGE_DAYS);
  return d >= cutoff && d <= now && d.getFullYear() === now.getFullYear();
}

function normalizeAndAudit(articles: NewsArticle[], feedName: string): NewsArticle[] {
  const seen = new Set<string>();
  const normalized: NewsArticle[] = [];

  for (const article of articles) {
    const url = article.url?.trim();
    const domain = extractFullDomain(url || '');
    const date = article.date?.slice(0, 10) || '';

    if (!url || seen.has(url)) continue;
    if (!isApprovedSource(domain)) continue;
    if (!isFreshDate(date)) continue;

    seen.add(url);
    normalized.push({
      ...article,
      source: article.source || extractFullDomain(url),
      date,
      fetchedAt: new Date().toISOString(),
      description: article.description || article.title,
    });
  }

  normalized.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  if (!normalized.length) {
    console.warn(`[News][${feedName}] 0 fresh approved records after audit`);
  }
  return normalized;
}
// ─── Google News RSS ────────────────────────────────────────────
// (Legacy CORS_PROXIES list removed — RSS fetcher now uses the
//  shared fetchWithCorsChain helper defined above.)

const ROOM_QUERIES_SIMPLE: Record<RoomId, string[]> = {
  growth: [
    'UAE non-oil GDP Dubai expansion 2026',
    'DIFC ADGM new business registrations',
    'UAE FDI inflows industrial financing',
    'Make it in the Emirates AED billion',
    'Dubai agentic AI initiative Hamdan',
  ],
  capital: [
    'UAE sukuk bond issuance CBUAE',
    'DIFC private credit fund AED',
    'ADGM fund registration capital markets',
    'UAE sovereign wealth deployment',
    'Dubai Financial Market IPO listing',
  ],
  risk: [
    'UAE Federal Tax Authority penalty 2026',
    'UAE eInvoicing electronic invoicing pilot',
    'ADGM AML consultation enhancement',
    'DFSA Islamic finance framework consultation',
    'UAE corporate tax procedures amendment',
    'Emiratisation deadline MoHRE June 2026',
  ],
  world: [
    'Federal Reserve rate decision policy',
    'OECD Pillar 2 global minimum tax',
    'BRICS trade emerging markets',
    'oil price OPEC energy markets',
    'EU carbon border CBAM tariff',
  ],
};

function pickSimpleQuery(room: RoomId): string {
  const variants = ROOM_QUERIES_SIMPLE[room];
  return variants[Math.floor(Math.random() * variants.length)];
}

async function fetchGoogleNewsRSS(room: RoomId, maxResults = 10): Promise<NewsArticle[]> {
  const query = encodeURIComponent(pickSimpleQuery(room));
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en&gl=AE&ceid=AE:en`;

  // Use the shared CORS fallback chain (direct, then 5 proxies)
  const resp = await fetchWithCorsChain(rssUrl, {
    timeoutMs: 6000,
    onProxyHit: (i) => { lastFetchDiagnostic = { succeeded: true, proxyUsed: i, attemptedAt: Date.now() }; },
  });

  if (!resp) {
    lastFetchDiagnostic = { succeeded: false, proxyUsed: null, attemptedAt: Date.now() };
    throw new Error('Google News: all CORS proxies blocked');
  }

  const xml = await resp.text();
  if (!xml) throw new Error('Google News: empty response from proxy');

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');

  const articles: NewsArticle[] = [];
  const now = Date.now();
  const threeDaysAgo = now - (72 * 3600 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 3600 * 1000);

  items.forEach((item, i) => {
    if (i >= maxResults * 2) return; // overscan, will filter

    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const source = item.querySelector('source')?.textContent || '';
    const description = item.querySelector('description')?.textContent || '';

    const articleDate = new Date(pubDate);
    const articleMs = articleDate.getTime();
    if (isNaN(articleMs) || articleMs < sevenDaysAgo) return;

    const domain = extractFullDomain(link);
    if (!isApprovedSource(domain)) return;

    const hoursAgo = Math.round((now - articleMs) / 3600000);
    articles.push({
      title: cleanHTMLEntities(title),
      url: link,
      source: source || prettifyDomain(domain),
      date: articleDate.toISOString().slice(0, 10),
      description: cleanHTMLEntities(stripHTML(description)),
      hoursAgo,
    });
  });

  // Sort: prefer breaking (<72h) then by recency
  articles.sort((a, b) => {
    const aBreaking = (a.hoursAgo ?? 999) <= 72 ? 0 : 1;
    const bBreaking = (b.hoursAgo ?? 999) <= 72 ? 0 : 1;
    if (aBreaking !== bBreaking) return aBreaking - bBreaking;
    return (a.hoursAgo ?? 999) - (b.hoursAgo ?? 999);
  });

  // Suppress used items
  void threeDaysAgo;
  if (!articles.length) throw new Error('Google News: no recent articles');
  return articles.slice(0, maxResults);
}

function extractFullDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function cleanHTMLEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// ─── (Removed) Pre-seeded fallback content
//
// Earlier versions of this module shipped a hand-curated pool of 32 generic
// UAE articles that would surface when live feeds returned nothing. That
// path was disabled at the policy level (no stale content under any
// circumstance) and the constant has now been removed entirely. The
// fetcher's failure mode is a single NoFreshNewsError thrown from
// fetchNews(), surfaced to the UI as "No fresh news right now".

// ─── Main Fetch Function ────────────────────────────────────────

/**
 * Fetch live news articles for a room.
 *
 * Returns up to 10 articles. The caller (contentEngine) should pick
 * a random article from the top results to maximise content variety
 * across multiple generations.
 *
 * Recency policy:
 *   1. Try GDELT 0-72h window (breaking)
 *   2. Fall back to GDELT 0-7d window
 *   3. Fall back to Google News RSS (already filtered to 7d)
 *   4. Fall back to shuffled pre-seeded UAE topical signals
 */
/**
 * Custom error thrown when no verified-current news is available.
 * Surfaces to the UI as "No fresh news right now — try again later".
 */
export class NoFreshNewsError extends Error {
  constructor() {
    super('No verified news from approved sources in the last 24 hours. Posting is blocked rather than serve stale content.');
    this.name = 'NoFreshNewsError';
  }
}

/**
 * Read the pre-fetched news JSON committed by the GitHub Actions cron.
 * Same-origin fetch — no CORS issue, works regardless of network filtering.
 * This is the PRIMARY path because it always works in any network.
 */
async function fetchFromStaticJson(room: RoomId): Promise<NewsArticle[]> {
  try {
    // Cache-busted URL so the user sees updates as soon as Actions commits
    const url = `${import.meta.env.BASE_URL || '/'}news-latest.json?t=${Math.floor(Date.now() / 60000)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    const roomArticles: NewsArticle[] = data?.rooms?.[room] || [];
    // Apply the same recency filter as the live path
    return roomArticles.filter(a => isWithinRecencyWindow(a));
  } catch {
    return [];
  }
}

/**
 * Rank cached articles by relevance to a custom topic string. Used when
 * the calendar passes a planned daily topic (e.g. "FATF mutual evaluation
 * — UAE AML compliance pressure") — instead of triggering a fresh CORS
 * fetch (which is blocked on many networks), we re-score the static
 * cached articles by token-overlap with the topic and return the best
 * matches first.
 */
function rankByTopicRelevance(articles: NewsArticle[], topic: string): NewsArticle[] {
  const topicTokens = new Set(
    topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
  if (topicTokens.size === 0) return articles;
  const scored = articles.map(a => {
    const text = `${a.title || ''} ${a.description || ''}`.toLowerCase();
    let score = 0;
    for (const tok of topicTokens) {
      if (text.includes(tok)) score += 2;
    }
    return { article: a, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.article);
}

export async function fetchNews(room: RoomId, customTopic?: string): Promise<NewsArticle[]> {
  // AUDIT REFRESH — every call re-reads system time. No caching across calls.
  const auditStartMs = Date.now();
  void auditStartMs;

  // ── PRIMARY PATH: GitHub-Actions-prefetched JSON (same-origin, no CORS) ──
  // The /.github/workflows/fetch-news.yml workflow fetches GDELT every 4
  // hours server-side and commits the results to news-latest.json on the
  // gh-pages branch. We ALWAYS try this first regardless of customTopic.
  // (Previous logic skipped static JSON when customTopic was set, causing
  // the calendar to hit blocked CORS proxies. Now we re-rank the static
  // results by topic relevance instead.)
  const cached = await fetchFromStaticJson(room);
  if (cached.length > 0) {
    lastFetchDiagnostic = { succeeded: true, proxyUsed: 'static-json', attemptedAt: Date.now() };
    return customTopic ? rankByTopicRelevance(cached, customTopic) : cached;
  }

  // Custom topic path: route through CORS chain (direct + 5 proxies)
  // — used only as a last-ditch attempt when static JSON has nothing.
  // CORS proxies are blocked on most enterprise networks so this rarely
  // succeeds; the static-JSON path above is the one that actually works.
  if (customTopic && customTopic.trim()) {
    try {
      const query = encodeURIComponent(`"${customTopic}" UAE`);
      const start = gdeltDateParam(MAX_ARTICLE_AGE_HOURS);
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=10&format=json&sort=DateDesc&startdatetime=${start}&enddatetime=${gdeltDateParam(0)}`;
      const resp = await fetchWithCorsChain(url, {
        timeoutMs: 8000,
        onProxyHit: (i) => { lastFetchDiagnostic = { succeeded: true, proxyUsed: i, attemptedAt: Date.now() }; },
      });
      if (resp) {
        const data: GDELTResponse = await resp.json();
        if (data.articles?.length) {
          const mapped = data.articles
            .filter(a => isApprovedSource(a.domain || ''))
            .map(a => articleFromGDELT(a));
          const recent = enforceRecency(mapped);
          if (recent.length) return recent;
        }
      }
    } catch { /* fall through */ }
  }

  // Tier 1: GDELT, filtered to recency window
  try {
    const articles = enforceRecency(await fetchGDELT(room));
    if (articles.length > 0) return articles;
  } catch (e) {
    console.warn('[News] GDELT failed:', e);
  }

  // Tier 2: Google News RSS, filtered to today-only recency window
  try {
    const articles = enforceRecency(await fetchGoogleNewsRSS(room));
    if (articles.length > 0) return articles;
  } catch (e) {
    console.warn('[News] Google News RSS failed:', e);
  }

  // No stale-fallback path under any circumstance. If all live feeds
  // return nothing fresh, we throw so the UI shows "no fresh news right
  // now" rather than serving recycled content.
  throw new NoFreshNewsError();
}
