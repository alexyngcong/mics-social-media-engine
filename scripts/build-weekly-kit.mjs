#!/usr/bin/env node
/**
 * MICS Daily Posting Kit — Weekly Auto-Builder
 *
 * Runs every Sunday on GitHub Actions. Reads news-latest.json (refreshed
 * every 4h by fetch-news.mjs), picks 7 top signals across rooms with
 * framework rotation, and generates a complete posting kit:
 *
 *   daily-kit/
 *     index.html              — single-page control center
 *     README.md               — usage guide
 *     post-1-<slug>.txt       — caption ready for paste
 *     post-1-<slug>.svg       — 1080×1080 banner
 *     ... (repeats for 7 posts)
 *
 * The kit gets committed to the gh-pages branch and is accessible at
 * https://<deploy-url>/daily-kit/ — never opened locally.
 *
 * POSITIONING RULE (binding):
 *   Every post and banner produced here must read as peer-CFO intelligence
 *   shared inside a private circle, NOT as a news rewrite. The script
 *   enforces this through:
 *     - Intelligence-grade tier labels (STRUCTURAL SIGNAL, ENFORCEMENT LIVE, etc.)
 *     - UAE/GCC implication leads every post body, not the news event
 *     - Peer-tone closers (Let's stay close to this one. / Filing this and watching.)
 *     - No source publication names in body (link preview handles attribution)
 *     - No CTAs, no engagement bait, no teaching tone
 *
 * Posts are DRAFTS — high quality but template-generated. The HTML index
 * gives each card a one-click "Upgrade via AI Brief" button that uses the
 * existing claude.ai workflow to swap the draft for an LLM-grade version.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// ═══════════════════════════════════════════════════════════════
// CONFIG — Brand palette + rooms + frameworks
// ═══════════════════════════════════════════════════════════════

const ROOMS = {
  growth: {
    color: '#4ADE80',
    short: 'GROWTH SIGNALS',
    label: 'Growth',
    serviceAngle: 'Strategic Advisory · Feasibility · M&A · Valuation',
  },
  capital: {
    color: '#F0C050',
    short: 'CAPITAL · CASH',
    label: 'Capital',
    serviceAngle: 'Cash Flow Reviews · Capital Structuring · SPVs · Wealth Management',
  },
  risk: {
    color: '#EF5555',
    short: 'RISK · COMPLIANCE',
    label: 'Risk',
    serviceAngle: 'Tax · VAT · AML · Audit · Governance · Pillar 2',
  },
  world: {
    color: '#5B8DEE',
    short: 'WORLD PULSE',
    label: 'World',
    serviceAngle: 'International Advisory · Cross-border Structuring',
  },
};

// Day-by-day plan: which room slot fires on which day, in which framework.
// Rooms rotate so no two consecutive posts share a room, frameworks rotate
// so no two consecutive posts share a structural shape.
const WEEK_PLAN = [
  { day: 'Mon', slot: '08:00 GST', preferRoom: 'risk',    framework: 'PAS',  type: 'alert' },
  { day: 'Mon', slot: '17:00 GST', preferRoom: 'world',   framework: 'PAS',  type: 'alert' },
  { day: 'Tue', slot: '08:00 GST', preferRoom: 'world',   framework: 'DATA', type: 'observation' },
  { day: 'Tue', slot: '17:00 GST', preferRoom: 'risk',    framework: 'BAB',  type: 'alert' },
  { day: 'Wed', slot: '09:00 GST', preferRoom: 'capital', framework: 'AIDA', type: 'observation' },
  { day: 'Thu', slot: '09:00 GST', preferRoom: 'risk',    framework: 'BAB',  type: 'observation' },
  { day: 'Fri', slot: '09:00 GST', preferRoom: 'growth',  framework: 'AIDA', type: 'observation' },
];

// Intelligence-grade tier labels indexed by room + type.
// These are NEVER news-labels ("BREAKING", "LATEST", "JUST IN").
// They signal strategic-analysis grade.
const TIER_LABELS = {
  risk: {
    alert: ['ENFORCEMENT LIVE', 'REGULATORY SHIFT', 'COMPLIANCE WINDOW', 'GOVERNANCE SIGNAL'],
    observation: ['PATTERN MIGRATING', 'CONTROL DRIFT', 'AUDIT-SEASON SIGNAL', 'STRUCTURAL SHIFT'],
  },
  world: {
    alert: ['STRUCTURAL SIGNAL', 'MACRO ALERT', 'TRANSMISSION RISK', 'GLOBAL PIVOT'],
    observation: ['PRINT OF THE DAY', 'CROSSOVER READ', 'POLICY SIGNAL', 'SECOND-ORDER READ'],
  },
  capital: {
    alert: ['TREASURY ALERT', 'YIELD-CURVE SIGNAL', 'FUNDING WINDOW', 'LIQUIDITY READ'],
    observation: ['TREASURY READ', 'CAPITAL-MARKETS SIGNAL', 'ISSUANCE PRINT', 'CURRENCY-MIX SIGNAL'],
  },
  growth: {
    alert: ['EXPANSION WINDOW', 'TIMING SIGNAL', 'STRUCTURAL OPENING'],
    observation: ['SPEED-OF-DEPLOYMENT', 'COMPETITIVE READ', 'INVESTMENT-CYCLE SIGNAL', 'FDI SHIFT'],
  },
};

// Map framework → post structure descriptor
const FRAMEWORK_LABELS = {
  PAS:  'PAS  ·  ALERT',
  DATA: 'DATA  ·  OBSERVATION',
  AIDA: 'AIDA  ·  OBSERVATION',
  BAB:  'BAB  ·  ALERT',
  HSO:  'HSO  ·  EXCLUSIVE',
  SCQA: 'SCQA  ·  OBSERVATION',
};

// Closer pool — peer-CFO observational sign-offs, never CTAs
const CLOSERS = [
  "Let's stay close to this one.",
  "Filing this and watching.",
  "On the watchlist from here.",
  "One to keep on the radar.",
  "More to come as the picture fills in.",
  "Let's see how the next read lands.",
  "Picture should sharpen in the coming weeks.",
  "Keeping eyes on the next signal.",
];

// Generic strategic-implication body lines per room.
// These apply the POSITIONING RULE: they don't restate the news, they
// frame the UAE/GCC strategic implication. Used after the news-fact lead.
const IMPLICATIONS = {
  risk: [
    "Retroactive compliance is always more expensive than ahead-of-curve readiness. The firms that get caught mid-cycle pay in remediation costs, advisory fees, and management bandwidth that compounds across multiple quarters.",
    "Audit-season exposure is built in the quarters before audit, not during. The documentation trail, the control evidence, and the governance posture all need to be in place ahead of the window, not assembled retroactively.",
    "Controls drift quietly, and documentation either catches up to that drift or it does not. The gap shows up first in audit findings, then in penalty exposure, then in board-level conversations.",
    "Voluntary-disclosure regimes reward first movers and penalise the rest. The advantage of acting inside the disclosure window before the enforcement posture firms up is usually material.",
  ],
  world: [
    "Global rule changes hit UAE balance sheets through three channels: rates, trade flows, and energy markets. Scenario planning that ignores any one of those underprices regional exposure.",
    "Scenario planning that uses last cycle's assumptions underprices the regional transmission. The Gulf sits at the crossover of monetary, energy, and trade policy in ways that compound rather than offset.",
    "Multilateral policy turns translate into UAE compliance work faster than most expect. The time between announcement and operational impact has compressed materially in the last two cycles.",
    "Capital flows respond to policy signals before they respond to underlying fundamentals. The firms reading the signal early are the ones positioned when the flows arrive.",
  ],
  capital: [
    "Funding-mix reviews need a quarterly cadence in this environment, not an annual one. Issuance windows, deposit beta, and refinancing pipelines are moving faster than legacy treasury policy frameworks anticipate.",
    "Treasury policy that was right for 2024 will not be right for the next twelve months. The yield environment, regulatory expectations, and funding-mix options have all shifted in ways that warrant a quarterly review.",
    "The cost of inaction on reserve structuring usually shows up too late. By the time the inefficiency is visible in the numbers, the optimal restructuring window has already closed.",
    "Yield-curve positioning is a board-level conversation now, not a treasury-desk one. The implications cross into capex pacing, dividend policy, and balance-sheet structuring.",
  ],
  growth: [
    "Mainland and free-zone setup choices get harder to reverse from here. The cost of restructuring later usually exceeds the cost of getting it right the first time.",
    "Expansion timing in the UAE is structural, not opportunistic. The firms that map their next move now will be the ones executing while the rest are still in feasibility.",
    "Capital allocation across the next two quarters is where the alpha sits. Decisions made under the current setup compound through the entire next investment cycle.",
    "Operating-model choices made now will define competitive position through the next investment cycle. The window for unforced structural decisions narrows quickly.",
  ],
};

// Strategic-call body lines (the "what to do" line) per room.
const STRATEGIC_CALLS = {
  risk: [
    "Audit any client-facing trails that touch transaction data or KYC-adjacent flows. Brief the audit committee before the next supervisory cycle.",
    "Treat this as a control-matrix update, not a one-off remediation. The workpaper trail starts now, not after the first finding.",
    "Read this alongside your existing control matrix, not in isolation. The downstream documentation burden lands in finance and legal first.",
  ],
  world: [
    "The firms re-running their assumptions at the new baseline, refreshing inputs on a weekly cadence, and pre-positioning for the transmission window are the ones that will not be surprised at quarter-end.",
    "Currency-mix, supplier-mix, and funding-mix all need a second look against this. Watch the policy reaction, not the price reaction.",
    "If your scenario planning still uses last cycle's assumptions, this is the prompt to refresh them. Energy markets and policy markets are coupled more than the headlines admit.",
  ],
  capital: [
    "The sleeve nobody is talking about: short-duration AED paper paired against medium-duration USD. If your reserve policy was last reviewed under a different rate regime, this is the moment.",
    "Two things to watch: deposit beta on the AED side, and refinancing pipeline on the USD side. Capital is signalling.",
    "DIFC and ADGM private-credit allocators have been the quiet beneficiaries of bank-lending tightening. The relative-value question across UAE instruments keeps tightening.",
  ],
  growth: [
    "The early movers are not waiting for confirmation. What is interesting is not the headline number. It is the composition.",
    "Founders running feasibility on the GCC just got a cleaner input variable. If your expansion model still assumes 2023 economics, this is a useful moment to revisit the inputs.",
    "The transmission from announcement to advisory-room conversation is faster than most assume. The strategic repositioning has already started for those reading it correctly.",
  ],
};

// Date helpers — always live, never cached
const DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' };
function todayShort() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function todayLong() {
  return new Date().toLocaleDateString('en-GB', DATE_OPTS);
}
function dateForOffset(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString('en-GB', DATE_OPTS);
}

// ═══════════════════════════════════════════════════════════════
// PICKING — choose 7 items with room + framework rotation
// ═══════════════════════════════════════════════════════════════

/**
 * Pick 7 items from the feed honouring WEEK_PLAN room rotation.
 * Falls back to a different room if the preferred room is empty.
 *
 * Returns array of { item, plan } where plan has day, slot, preferRoom,
 * framework, type, AND room (the actual room used, may differ from preferRoom
 * if fallback was needed).
 */
function pickKit(feed) {
  const used = new Set();
  const kit = [];

  // Score sort within each room so we always pick top signals
  const roomPools = {};
  for (const room of Object.keys(ROOMS)) {
    roomPools[room] = (feed.rooms[room] || [])
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  for (const plan of WEEK_PLAN) {
    // 1. Try preferred room
    let pick = roomPools[plan.preferRoom]?.find(a => !used.has(a.url));
    let actualRoom = plan.preferRoom;

    // 2. Fallback: any room with unused high-score items
    if (!pick) {
      const fallbackOrder = ['risk', 'world', 'capital', 'growth'].filter(r => r !== plan.preferRoom);
      for (const r of fallbackOrder) {
        pick = roomPools[r]?.find(a => !used.has(a.url));
        if (pick) { actualRoom = r; break; }
      }
    }

    if (pick) {
      used.add(pick.url);
      kit.push({ item: pick, plan, room: actualRoom });
    } else {
      // Feed is too thin — generate a synthetic placeholder so the kit
      // still has 7 slots. The HTML will mark these as "awaiting fresh
      // signal" with a manual brief flow.
      kit.push({ item: null, plan, room: plan.preferRoom });
    }
  }
  return kit;
}

// ═══════════════════════════════════════════════════════════════
// POST GENERATION — apply positioning rule per item
// ═══════════════════════════════════════════════════════════════

/** Extract a money or percent token to use as banner stat. */
function extractStat(text) {
  if (!text) return null;
  const moneyRe = /(AED|USD|EUR|€|\$|£)\s*\d[\d,.]*(\s*(billion|million|trillion|B|M|T))?/i;
  const pctRe = /\d[\d,.]*\s*%/;
  const m = text.match(moneyRe);
  if (m) return normaliseMoney(m[0]);
  const p = text.match(pctRe);
  if (p) return p[0].trim();
  return null;
}

function normaliseMoney(token) {
  return token
    .replace(/\s+billion\b/i, 'B')
    .replace(/\s+million\b/i, 'M')
    .replace(/\s+trillion\b/i, 'T')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a 4-5 word headline (used in banner). */
function buildBannerHeadline(title) {
  const stop = new Set(['the', 'and', 'for', 'but', 'with', 'from', 'into', 'that', 'this', 'has', 'have', 'been', 'was', 'were', 'are', 'its', 'a', 'an', 'or', 'in', 'on', 'at', 'to', 'by', 'of', 'as', 'is', 'after', 'over', 'up', 'down']);
  const cleaned = (title || '')
    .replace(/^(title|headline|breaking|update):\s*/i, '')
    .replace(/\s*[-|–]\s*[A-Z][a-zA-Z &]+$/, '')
    .replace(/['"]/g, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !stop.has(w.toLowerCase()));
  return words.slice(0, 6).join(' ');
}

/** Pick a tier label appropriate to the room + type. */
function pickTier(room, type, dayIndex) {
  const pool = TIER_LABELS[room]?.[type] || TIER_LABELS[room]?.observation || ['STRATEGIC SIGNAL'];
  return pool[dayIndex % pool.length];
}

/** Pick one element from an array, indexed by day for stable rotation. */
function pickByDay(arr, dayIndex) {
  return arr[dayIndex % arr.length];
}

/** Strip "Title:" / "Headline:" labels and source attribution from a title. */
function cleanFact(title) {
  if (!title) return '';
  return title
    .replace(/^(title|headline|breaking|update):\s*/i, '')
    .replace(/\s*[-|–]\s*[A-Z][a-zA-Z &]+$/, '')
    .trim();
}

/**
 * Generate a peer-CFO style draft post for the item, applying the
 * positioning rule (UAE/GCC implication lead, no news-summary tone,
 * observational closer).
 */
function generatePost(picked, dayIndex) {
  const { item, plan, room } = picked;
  const roomMeta = ROOMS[room];
  const date = todayLong();

  if (!item) {
    // Awaiting fresh signal placeholder
    return `${date}.

The intelligence feed had no fresh ${roomMeta.label.toLowerCase()} signal at the cutoff that cleared the strategic-signal threshold. Rather than serve recycled commentary, the slot is held.

Use the AI Brief flow on the live feed to generate a polished post if a relevant signal has landed since this kit was assembled.

${pickByDay(CLOSERS, dayIndex)}
`;
  }

  const fact = cleanFact(item.title);
  const description = (item.description || '').slice(0, 400);
  const closer = pickByDay(CLOSERS, dayIndex);
  const implication = pickByDay(IMPLICATIONS[room], dayIndex);
  const strategicCall = pickByDay(STRATEGIC_CALLS[room], dayIndex);

  // STRUCTURE:
  // 1. Date stamp (peer-room signal of when this lands)
  // 2. Fact paragraph (one sentence) — what happened, no source name
  // 3. UAE/GCC implication paragraph (the "why this matters here")
  // 4. Strategic call paragraph (what to do — peer-CFO frame)
  // 5. Generic-but-strong room implication (the cross-cycle truth)
  // 6. Observational closer

  // Open with date for time-stamped intelligence feel
  const opener = `${date}.`;

  // Fact paragraph — extract first usable sentence from description, else use title
  let factPara = fact;
  if (description.length > 80) {
    const firstSentence = description.split(/(?<=[.!?])\s+/)[0];
    if (firstSentence && firstSentence.length > 40 && firstSentence.length < 280) {
      factPara = firstSentence;
    } else {
      factPara = `${fact}. ${description.slice(0, 200).trim()}`;
    }
  }
  // Strip source-name leaks
  factPara = factPara.replace(/\b(reuters|bloomberg|cnbc|ft|wsj|forbes|al jazeera|the national|gulf news|khaleej times|arabian business|zawya|agbi|meed|mondaq|lexology|bbc|guardian|associated press|ap)\b\s*[:,]?\s*/gi, '').trim();
  if (factPara && !/[.!?]$/.test(factPara)) factPara += '.';

  // UAE/GCC implication — bridge from the fact to the regional read
  const bridges = {
    risk: 'For UAE-regulated entities and any group with downstream compliance exposure',
    world: 'For UAE corporates positioned across global trade and energy channels',
    capital: 'For UAE treasury and capital-allocation teams',
    growth: 'For UAE founders and family offices mapping the next expansion move',
  };
  const bridge = bridges[room];

  const regionalRead = `${bridge}, the strategic implication lands ahead of where the headline cycle catches it. ${strategicCall}`;

  return `${opener}

${factPara}

${regionalRead}

${implication}

${closer}
`;
}

// ═══════════════════════════════════════════════════════════════
// PHOTO LIBRARY — topic-matched Unsplash backgrounds
// ═══════════════════════════════════════════════════════════════
// Photos chosen for editorial / financial-press feel: subjects that
// signal authority, scale, gravity. Skylines, gold, trading floors,
// satellite imagery, refineries, port logistics. NOT stock-photo
// businesspeople-in-suits clichés.

const UNSPLASH_PARAMS = 'w=1600&q=80&fit=crop&crop=entropy&auto=format';
const U = (id) => `https://images.unsplash.com/${id}?${UNSPLASH_PARAMS}`;

const PHOTOS = [
  // ── Energy / oil / shipping / Hormuz-adjacent ──
  { url: U('photo-1513828583688-c52646db42da'), tags: ['oil', 'refinery', 'energy', 'petroleum', 'opec', 'brent', 'crude'] },
  { url: U('photo-1532601224476-15c79f2f7a51'), tags: ['pipeline', 'oil', 'gas', 'energy', 'industrial'] },
  { url: U('photo-1494412574643-ff11b0a5eb19'), tags: ['container', 'shipping', 'trade', 'logistics', 'port', 'hormuz', 'freight'] },
  { url: U('photo-1521295121783-8a321d551ad2'), tags: ['shipping', 'port', 'trade', 'logistics', 'cargo'] },

  // ── Treasury / capital / gold / trading ──
  { url: U('photo-1618044733300-9472054094ee'), tags: ['gold', 'bars', 'wealth', 'capital', 'reserve', 'treasury'] },
  { url: U('photo-1611974789855-9c2a0a7236a3'), tags: ['finance', 'abstract', 'markets', 'capital', 'bonds'] },
  { url: U('photo-1554224155-8d04cb21cd6c'), tags: ['trading', 'screens', 'stock', 'markets', 'capital', 'bond'] },
  { url: U('photo-1560520653-9e0e4c89eb11'), tags: ['stock', 'exchange', 'trading', 'ipo', 'capital', 'bonds'] },
  { url: U('photo-1556742049-0cfed4f6a45d'), tags: ['bank', 'vault', 'banking', 'finance', 'capital'] },

  // ── Compliance / regulation / governance / cyber ──
  { url: U('photo-1454165804606-c3d57bc86b40'), tags: ['documents', 'legal', 'compliance', 'risk', 'audit', 'tax'] },
  { url: U('photo-1589829545856-d10d557cf95f'), tags: ['gavel', 'law', 'regulation', 'risk', 'legal', 'enforcement'] },
  { url: U('photo-1550751827-4bd374c3f58b'), tags: ['security', 'lock', 'cyber', 'risk', 'protection', 'whatsapp', 'data'] },
  { url: U('photo-1633265486064-086b219458ec'), tags: ['shield', 'security', 'digital', 'risk', 'governance'] },
  { url: U('photo-1554224154-26032ffc0d07'), tags: ['tax', 'documents', 'accounting', 'compliance', 'vat'] },

  // ── UAE / GCC / skyline ──
  { url: U('photo-1512453979798-5ea266f8880c'), tags: ['dubai', 'skyline', 'uae', 'city', 'growth'] },
  { url: U('photo-1518684079-3c830dcef090'), tags: ['dubai', 'marina', 'towers', 'real-estate'] },
  { url: U('photo-1582407947092-47f5835e3a28'), tags: ['abu-dhabi', 'skyline', 'uae'] },
  { url: U('photo-1547483238-f400e65ccd56'), tags: ['dubai', 'aerial', 'city', 'infrastructure'] },

  // ── Global / world / geopolitics / satellite ──
  { url: U('photo-1451187580459-43490279c0fa'), tags: ['earth', 'space', 'global', 'world', 'planet', 'satellite'] },
  { url: U('photo-1526778548025-fa2f459cd5c1'), tags: ['world-map', 'digital', 'global', 'network', 'trade'] },
  { url: U('photo-1558618666-fcd25c85f82e'), tags: ['network', 'connections', 'global', 'digital', 'macro'] },
  { url: U('photo-1446776811953-b23d57bd21aa'), tags: ['earth', 'atmosphere', 'global', 'climate', 'macro'] },

  // ── EU / CBAM / industrial Europe ──
  { url: U('photo-1466611653911-95081537e5b7'), tags: ['wind', 'turbine', 'energy', 'renewable', 'green', 'cbam', 'climate'] },
  { url: U('photo-1474314170901-f351b68f544f'), tags: ['solar', 'energy', 'renewable', 'green', 'climate', 'eu', 'ets'] },

  // ── AI / Big Tech / data centres ──
  { url: U('photo-1677442136019-21780ecad995'), tags: ['ai', 'artificial-intelligence', 'tech', 'robot', 'digital'] },
  { url: U('photo-1518770660439-4636190af475'), tags: ['circuit', 'tech', 'chip', 'semiconductor', 'ai', 'capex'] },
  { url: U('photo-1504868584819-f8e8b4b6d7e3'), tags: ['server', 'data-center', 'tech', 'infrastructure', 'ai'] },
  { url: U('photo-1488229297570-58520851e868'), tags: ['network', 'data', 'tech', 'cloud', 'digital'] },

  // ── Growth / expansion / India / emerging markets ──
  { url: U('photo-1486406146926-c627a92ad1ab'), tags: ['office', 'tower', 'corporate', 'business', 'growth', 'india'] },
  { url: U('photo-1496568816309-51d7c20e3b21'), tags: ['sunrise', 'city', 'real-estate', 'skyline', 'growth'] },
];

const ROOM_FALLBACK_TAGS = {
  growth: ['dubai', 'skyline', 'corporate', 'growth', 'business', 'india'],
  capital: ['gold', 'finance', 'trading', 'capital', 'markets', 'bonds', 'treasury'],
  risk: ['security', 'risk', 'compliance', 'legal', 'cyber', 'governance', 'enforcement'],
  world: ['earth', 'global', 'network', 'trade', 'shipping', 'macro', 'satellite'],
};

/** Find best-matching photo URL for an article's title + description + topic. */
function pickPhoto(picked) {
  const { item, room } = picked;
  const roomMeta = ROOMS[room];
  const topicText = item
    ? `${item.title} ${item.description || ''} ${item.topic || ''}`.toLowerCase()
    : roomMeta.label.toLowerCase();
  const topicWords = topicText.split(/[\s,.\-/()]+/).filter(w => w.length > 2);

  const scored = PHOTOS.map((p, idx) => {
    let score = 0;
    for (const tag of p.tags) {
      if (topicText.includes(tag)) score += 3;
      for (const w of topicWords) {
        if (tag.includes(w) || w.includes(tag)) score += 1;
      }
      if (ROOM_FALLBACK_TAGS[room].includes(tag)) score += 0.5;
    }
    return { url: p.url, score, idx };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  const top = scored.filter(s => s.score > 0).slice(0, 5);
  if (top.length > 0) return top[0].url;

  // Fallback: pick first room-matched photo
  const roomPhotos = PHOTOS.filter(p => p.tags.some(t => ROOM_FALLBACK_TAGS[room].includes(t)));
  return roomPhotos[0]?.url || PHOTOS[0].url;
}

// ═══════════════════════════════════════════════════════════════
// SVG BANNER COMPOSER — real-time design synthesis per signal
// ═══════════════════════════════════════════════════════════════
//
// Every banner is COMPOSED from primitives at generation time, driven by:
//   1. Topic theme detected from article content (energy, compliance,
//      treasury, ai-tech, geopolitics, growth, shipping, etc.)
//   2. A deterministic hash of the article URL so the SAME signal always
//      gets the SAME banner — but different signals get different banners.
//   3. The theme's design DNA — preferred layouts, accent shapes, photo
//      cast, typography emphasis — pre-tuned per topic category.
//
// Compositional dimensions (multiplied = combinatorial uniqueness):
//   - Base layouts:        5 structural shells (hero-left, split-vertical,
//                          magazine-cover, frosted-card, bottom-strip)
//   - Photo treatments:    6 cinematic filters (warm-amber, cool-red,
//                          gold-premium, cyber-blue, sea-cool, mono-grade)
//   - Accent decorations:  7 ornament systems, 2 picked per banner
//                          (corner-ticks, bracket-frame, diagonal-slash,
//                          orbital-rings, horizon-stripe, grid-overlay,
//                          edge-marks)
//   - Typography emphasis: 4 weights (serif-massive, sans-precise,
//                          serif-italic, mixed)
//
// Total combinations: 5 × 6 × C(7,2) × 4 = ~2,520 distinct designs.
// The seeded hash ensures determinism; the topic theme ensures coherence.

/** XML-escape characters that would break SVG text content. */
function svgEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Compute font-size that fits the stat in a 920px-wide slot. */
function statFontSize(stat, slot = 'hero') {
  const len = (stat || '').length;
  if (slot === 'card') {
    if (len <= 4) return 200;
    if (len <= 6) return 160;
    if (len <= 9) return 130;
    return 100;
  }
  if (slot === 'strip') {
    if (len <= 4) return 130;
    if (len <= 6) return 110;
    if (len <= 9) return 90;
    return 70;
  }
  if (len <= 4) return 280;
  if (len <= 6) return 220;
  if (len <= 9) return 180;
  if (len <= 12) return 140;
  return 110;
}

/** Shared SVG <defs> block. Filters + gradients all banners can reference. */
function svgDefs(color) {
  return `
  <defs>
    <filter id="cinematic" x="0" y="0" width="100%" height="100%">
      <feColorMatrix type="matrix" values="
        0.6 0.05 0.05 0 0
        0.05 0.55 0.05 0 0
        0.05 0.05 0.7 0 0
        0   0    0    1 0"/>
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude="1" exponent="0.95" offset="0"/>
        <feFuncG type="gamma" amplitude="1" exponent="0.95" offset="0"/>
        <feFuncB type="gamma" amplitude="1" exponent="0.9"  offset="0"/>
      </feComponentTransfer>
    </filter>
    <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0.25"/>
      <stop offset="35%" stop-color="#06060f" stop-opacity="0.55"/>
      <stop offset="65%" stop-color="#06060f" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0"/>
      <stop offset="60%" stop-color="#06060f" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="vignTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#06060f" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.98"/>
    </linearGradient>
    <radialGradient id="vignCenter" cx="0.5" cy="0.5" r="0.65">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0"/>
      <stop offset="55%" stop-color="#06060f" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.95"/>
    </radialGradient>
    <radialGradient id="accentGlow" cx="0.78" cy="0.22" r="0.55">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="${color}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brassUnder" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#A8926A" stop-opacity="0"/>
      <stop offset="50%" stop-color="#A8926A" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#A8926A" stop-opacity="0"/>
    </linearGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.75"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="cardBlur" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10"/>
    </filter>
  </defs>`;
}

/** Common image element — Unsplash photo with cinematic filter. */
function svgImage(photoUrl, x = 0, y = -40, w = 1080, h = 1080) {
  const u = svgEscape(photoUrl);
  return `<image href="${u}" xlink:href="${u}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" filter="url(#cinematic)"/>`;
}

/** Common footer — brand wordmark only, centered with bronze hairline. */
function svgFooter() {
  return `
  <rect x="80" y="1000" width="920" height="1" fill="url(#brassUnder)"/>
  <text x="540" y="1042" font-size="13" font-weight="700" letter-spacing="6" fill="rgba(168,146,106,0.7)" text-anchor="middle">MICS INTERNATIONAL</text>`;
}

/** Wrap any layout body in the standard SVG envelope. */
function svgWrap(color, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1080" width="1080" height="1080" font-family="'Figtree','Segoe UI',system-ui,sans-serif">
${svgDefs(color)}
  <rect width="1080" height="1080" fill="#06060f"/>
${body}
${svgFooter()}
</svg>
`;
}

// ─── LAYOUT 1: HERO LEFT ────────────────────────────────────────
// Photo full canvas, dark bottom gradient, all text left-aligned in
// lower-third, 32px room bar at left edge. Original layout.
function layoutHeroLeft(ctx) {
  const { color, photoUrl, roomMeta, tier, stat, statSize, headline } = ctx;
  const statY = 800 - Math.max(0, statSize - 200);
  return `
  ${svgImage(photoUrl)}
  <rect width="1080" height="1080" fill="url(#darken)"/>
  <rect width="1080" height="1080" fill="url(#accentGlow)"/>
  <rect x="0" y="0" width="32" height="1080" fill="${color}"/>
  <rect x="32" y="0" width="1048" height="2" fill="${color}" opacity="0.4"/>

  <text x="80" y="92" font-size="20" font-weight="700" letter-spacing="4" fill="#A8926A" filter="url(#textShadow)">MICS  ·  CFOs PRIVATE INSIGHTS CIRCLE</text>
  <text x="80" y="128" font-size="17" letter-spacing="2" fill="rgba(234,230,222,0.6)" filter="url(#textShadow)">${svgEscape(roomMeta.short)}</text>

  <line x1="80" y1="610" x2="200" y2="610" stroke="${color}" stroke-width="2" opacity="0.85"/>
  <text x="80" y="660" font-size="22" font-weight="700" letter-spacing="6" fill="${color}" filter="url(#textShadow)">${svgEscape(tier)}</text>

  <text x="80" y="${statY}" font-family="'Cormorant Garamond','Georgia',serif" font-size="${statSize}" font-weight="500" fill="#ffffff" filter="url(#textShadow)">${svgEscape(stat)}</text>
  <text x="80" y="830" font-size="18" font-weight="600" letter-spacing="3" fill="${color}" filter="url(#textShadow)">${svgEscape(roomMeta.serviceAngle.toUpperCase())}</text>

  <text x="80" y="888" font-family="'Cormorant Garamond','Georgia',serif" font-size="42" font-weight="600" fill="#EAE6DE" filter="url(#textShadow)">${svgEscape(headline[0])}</text>
  <text x="80" y="934" font-family="'Cormorant Garamond','Georgia',serif" font-size="42" font-weight="600" fill="#EAE6DE" filter="url(#textShadow)">${svgEscape(headline[1])}</text>`;
}

// ─── LAYOUT 2: SPLIT VERTICAL ───────────────────────────────────
// Photo fills left 55%, fades to ink. Right 45% solid ink panel with
// vertical stat hero centered. Room bar runs along the bottom edge.
function layoutSplitVertical(ctx) {
  const { color, photoUrl, roomMeta, tier, stat, statSize, headline } = ctx;
  const statSizeNarrow = statFontSize(stat, 'card');
  return `
  <!-- Photo only fills left 55% via clip -->
  <clipPath id="leftHalf"><rect x="0" y="0" width="595" height="1080"/></clipPath>
  <g clip-path="url(#leftHalf)">
    ${svgImage(photoUrl, 0, -40, 700, 1080)}
    <rect width="595" height="1080" fill="url(#darken)" opacity="0.55"/>
    <rect width="595" height="1080" fill="url(#fadeRight)"/>
  </g>

  <!-- Right ink panel -->
  <rect x="595" y="0" width="485" height="1080" fill="#0a0a18"/>
  <rect x="595" y="0" width="485" height="1080" fill="url(#accentGlow)" opacity="0.7"/>

  <!-- Vertical divider with room color -->
  <rect x="593" y="80" width="2" height="920" fill="${color}" opacity="0.6"/>

  <!-- Bottom room bar across whole width -->
  <rect x="0" y="1078" width="1080" height="2" fill="${color}"/>

  <!-- Top metadata on left photo side -->
  <text x="60" y="92" font-size="20" font-weight="700" letter-spacing="4" fill="#A8926A" filter="url(#textShadow)">MICS</text>
  <text x="60" y="128" font-size="14" letter-spacing="2" fill="rgba(234,230,222,0.7)" filter="url(#textShadow)">CFOs PRIVATE INSIGHTS CIRCLE</text>

  <!-- Tier label on right panel -->
  <line x1="640" y1="200" x2="760" y2="200" stroke="${color}" stroke-width="2"/>
  <text x="640" y="245" font-size="19" font-weight="700" letter-spacing="5" fill="${color}">${svgEscape(tier)}</text>

  <!-- Stat hero, right panel -->
  <text x="640" y="${480 + (statSizeNarrow / 4)}" font-family="'Cormorant Garamond','Georgia',serif" font-size="${statSizeNarrow}" font-weight="500" fill="#ffffff">${svgEscape(stat)}</text>
  <text x="640" y="540" font-size="15" font-weight="600" letter-spacing="3" fill="${color}">${svgEscape(roomMeta.short)}</text>

  <!-- Headline, right panel, smaller -->
  <text x="640" y="660" font-family="'Cormorant Garamond','Georgia',serif" font-size="34" font-weight="600" fill="#EAE6DE">${svgEscape(headline[0])}</text>
  <text x="640" y="700" font-family="'Cormorant Garamond','Georgia',serif" font-size="34" font-weight="600" fill="#EAE6DE">${svgEscape(headline[1])}</text>

  <!-- Service angle, right panel bottom -->
  <text x="640" y="950" font-size="14" font-style="italic" fill="#B0AAB0">${svgEscape(roomMeta.serviceAngle)}</text>`;
}

// ─── LAYOUT 3: MAGAZINE COVER ───────────────────────────────────
// Photo top 55%, dark ink bottom 45%. Tier banner across top edge of
// ink panel. MASSIVE stat fills bottom-left, headline lower-right.
function layoutMagazineCover(ctx) {
  const { color, photoUrl, roomMeta, tier, stat, statSize, headline } = ctx;
  const statSizeBig = Math.min(280, statSize + 50);
  return `
  <!-- Photo top region only -->
  <clipPath id="topHalf"><rect x="0" y="0" width="1080" height="595"/></clipPath>
  <g clip-path="url(#topHalf)">
    ${svgImage(photoUrl, 0, -40, 1080, 700)}
    <rect width="1080" height="595" fill="url(#vignTop)"/>
    <rect width="1080" height="595" fill="url(#accentGlow)"/>
  </g>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1080" height="6" fill="${color}"/>

  <!-- Bottom ink panel -->
  <rect x="0" y="595" width="1080" height="485" fill="#08081a"/>

  <!-- Tier banner across the seam -->
  <rect x="60" y="565" width="960" height="60" fill="#06060f" stroke="${color}" stroke-width="2"/>
  <text x="540" y="603" font-size="22" font-weight="700" letter-spacing="8" fill="${color}" text-anchor="middle">${svgEscape(tier)}</text>

  <!-- Top metadata, over photo -->
  <text x="80" y="80" font-size="20" font-weight="700" letter-spacing="4" fill="#A8926A" filter="url(#textShadow)">MICS  ·  CFOs PRIVATE INSIGHTS CIRCLE</text>
  <text x="80" y="116" font-size="17" letter-spacing="2" fill="rgba(234,230,222,0.65)" filter="url(#textShadow)">${svgEscape(roomMeta.short)}</text>

  <!-- HUGE stat in bottom panel, left side -->
  <text x="80" y="${795 + Math.min(40, (statSizeBig - 200) / 2)}" font-family="'Cormorant Garamond','Georgia',serif" font-size="${statSizeBig}" font-weight="500" fill="#ffffff">${svgEscape(stat)}</text>
  <text x="80" y="850" font-size="16" font-weight="600" letter-spacing="4" fill="${color}">${svgEscape(roomMeta.serviceAngle.toUpperCase())}</text>

  <!-- Headline, right-aligned bottom -->
  <text x="1000" y="900" font-family="'Cormorant Garamond','Georgia',serif" font-size="34" font-weight="600" fill="#EAE6DE" text-anchor="end">${svgEscape(headline[0])}</text>
  <text x="1000" y="942" font-family="'Cormorant Garamond','Georgia',serif" font-size="34" font-weight="600" fill="#EAE6DE" text-anchor="end">${svgEscape(headline[1])}</text>`;
}

// ─── LAYOUT 4: FROSTED CARD ─────────────────────────────────────
// Photo full canvas (only edges darkened). Centered semi-transparent
// card panel holds all the text. Bronze border on card, room glow ring.
function layoutFrostedCard(ctx) {
  const { color, photoUrl, roomMeta, tier, stat, statSize, headline } = ctx;
  const statSizeCard = statFontSize(stat, 'card');
  return `
  ${svgImage(photoUrl)}
  <rect width="1080" height="1080" fill="url(#vignCenter)"/>
  <rect width="1080" height="1080" fill="url(#accentGlow)" opacity="0.6"/>

  <!-- Top metadata over photo, no card needed -->
  <text x="80" y="92" font-size="20" font-weight="700" letter-spacing="4" fill="#A8926A" filter="url(#textShadow)">MICS  ·  CFOs PRIVATE INSIGHTS CIRCLE</text>
  <text x="80" y="128" font-size="17" letter-spacing="2" fill="rgba(234,230,222,0.65)" filter="url(#textShadow)">${svgEscape(roomMeta.short)}</text>

  <!-- Frosted glass card panel -->
  <rect x="90" y="280" width="900" height="600" rx="6" ry="6"
        fill="rgba(8,8,20,0.62)" stroke="${color}" stroke-width="1" opacity="1"/>
  <!-- Inner highlight line -->
  <rect x="98" y="288" width="884" height="1" fill="${color}" opacity="0.35"/>
  <!-- Bronze corner ticks -->
  <line x1="90" y1="280" x2="120" y2="280" stroke="#A8926A" stroke-width="2"/>
  <line x1="90" y1="280" x2="90" y2="310" stroke="#A8926A" stroke-width="2"/>
  <line x1="990" y1="880" x2="960" y2="880" stroke="#A8926A" stroke-width="2"/>
  <line x1="990" y1="880" x2="990" y2="850" stroke="#A8926A" stroke-width="2"/>

  <!-- Tier label inside card -->
  <text x="540" y="350" font-size="20" font-weight="700" letter-spacing="6" fill="${color}" text-anchor="middle">${svgEscape(tier)}</text>

  <!-- Centered stat inside card -->
  <text x="540" y="${540 + statSizeCard / 4}" font-family="'Cormorant Garamond','Georgia',serif" font-size="${statSizeCard}" font-weight="500" fill="#ffffff" text-anchor="middle">${svgEscape(stat)}</text>
  <text x="540" y="620" font-size="14" font-weight="600" letter-spacing="3" fill="${color}" text-anchor="middle">${svgEscape(roomMeta.serviceAngle.toUpperCase())}</text>

  <!-- Headline centered, smaller -->
  <text x="540" y="720" font-family="'Cormorant Garamond','Georgia',serif" font-size="34" font-weight="600" fill="#EAE6DE" text-anchor="middle">${svgEscape(headline[0])}</text>
  <text x="540" y="762" font-family="'Cormorant Garamond','Georgia',serif" font-size="34" font-weight="600" fill="#EAE6DE" text-anchor="middle">${svgEscape(headline[1])}</text>

  <!-- Hairline divider inside card bottom -->
  <line x1="440" y1="820" x2="640" y2="820" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
}

// ─── LAYOUT 5: BOTTOM STRIP NEWSPAPER ───────────────────────────
// Photo top 70%, ink bottom 30% strip with horizontal info bar:
// LEFT — tier + room context. CENTER — stat. RIGHT — 2-line headline.
function layoutBottomStrip(ctx) {
  const { color, photoUrl, roomMeta, tier, stat, headline } = ctx;
  const statSizeStrip = statFontSize(stat, 'strip');
  return `
  <!-- Photo top 70% -->
  <clipPath id="topStrip"><rect x="0" y="0" width="1080" height="755"/></clipPath>
  <g clip-path="url(#topStrip)">
    ${svgImage(photoUrl, 0, 0, 1080, 800)}
    <rect width="1080" height="755" fill="url(#darken)" opacity="0.5"/>
    <rect width="1080" height="755" fill="url(#accentGlow)"/>
  </g>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1080" height="4" fill="${color}"/>

  <!-- Bottom strip -->
  <rect x="0" y="755" width="1080" height="325" fill="#06060f"/>
  <rect x="0" y="753" width="1080" height="2" fill="${color}"/>

  <!-- Top metadata -->
  <text x="80" y="80" font-size="20" font-weight="700" letter-spacing="4" fill="#A8926A" filter="url(#textShadow)">MICS  ·  CFOs PRIVATE INSIGHTS CIRCLE</text>
  <text x="80" y="116" font-size="17" letter-spacing="2" fill="rgba(234,230,222,0.65)" filter="url(#textShadow)">${svgEscape(roomMeta.short)}</text>

  <!-- Big "Insight" word over the photo as visual anchor (replaces the missing stat hero) -->
  <text x="80" y="690" font-family="'Cormorant Garamond','Georgia',serif" font-size="42" font-style="italic" font-weight="600" fill="rgba(234,230,222,0.85)" filter="url(#textShadow)">"${svgEscape(headline[0])}"</text>

  <!-- LEFT COLUMN — tier + room -->
  <line x1="80" y1="800" x2="180" y2="800" stroke="${color}" stroke-width="2"/>
  <text x="80" y="845" font-size="18" font-weight="700" letter-spacing="5" fill="${color}">${svgEscape(tier)}</text>
  <text x="80" y="885" font-size="14" letter-spacing="3" fill="#B0AAB0">${svgEscape(roomMeta.short)}</text>
  <text x="80" y="918" font-size="12" font-style="italic" fill="#6A6478">${svgEscape(roomMeta.serviceAngle)}</text>

  <!-- VERTICAL DIVIDER between columns -->
  <line x1="430" y1="785" x2="430" y2="975" stroke="${color}" stroke-width="1" opacity="0.4"/>

  <!-- CENTER COLUMN — stat -->
  <text x="540" y="${870 + statSizeStrip / 4}" font-family="'Cormorant Garamond','Georgia',serif" font-size="${statSizeStrip}" font-weight="500" fill="#ffffff" text-anchor="middle">${svgEscape(stat)}</text>

  <!-- VERTICAL DIVIDER -->
  <line x1="650" y1="785" x2="650" y2="975" stroke="${color}" stroke-width="1" opacity="0.4"/>

  <!-- RIGHT COLUMN — headline -->
  <text x="1000" y="845" font-family="'Cormorant Garamond','Georgia',serif" font-size="30" font-weight="600" fill="#EAE6DE" text-anchor="end">${svgEscape(headline[0])}</text>
  <text x="1000" y="885" font-family="'Cormorant Garamond','Georgia',serif" font-size="30" font-weight="600" fill="#EAE6DE" text-anchor="end">${svgEscape(headline[1])}</text>`;
}

// ─── Layout registry ────────────────────────────────────────────

const LAYOUTS = [
  { id: 'hero-left',       fn: layoutHeroLeft },
  { id: 'split-vertical',  fn: layoutSplitVertical },
  { id: 'magazine-cover',  fn: layoutMagazineCover },
  { id: 'frosted-card',    fn: layoutFrostedCard },
  { id: 'bottom-strip',    fn: layoutBottomStrip },
];

// ═══════════════════════════════════════════════════════════════
// TOPIC THEME DETECTION — drives all design choices
// ═══════════════════════════════════════════════════════════════

const TOPIC_THEMES = {
  oil_energy: {
    test: /\b(oil|brent|wti|crude|petroleum|opec|gas|pipeline|hormuz|refin|barrel)\b/i,
    photoCast: 'warm-amber',
    accentBias: ['horizon-stripe', 'bracket-frame', 'edge-marks'],
    layoutBias: ['hero-left', 'magazine-cover', 'bottom-strip'],
    label: 'ENERGY',
  },
  compliance_risk: {
    test: /\b(penalty|fine|sanction|enforce|aml|compliance|tax|audit|deadline|breach|violation|prosecution)\b/i,
    photoCast: 'cool-red',
    accentBias: ['bracket-frame', 'corner-ticks', 'diagonal-slash'],
    layoutBias: ['hero-left', 'frosted-card', 'split-vertical'],
    label: 'REGULATORY',
  },
  treasury_capital: {
    test: /\b(bond|sukuk|yield|rate|treasury|capital|liquidity|hedge|reserve|currency|fx|coupon|spread)\b/i,
    photoCast: 'gold-premium',
    accentBias: ['horizon-stripe', 'grid-overlay', 'edge-marks'],
    layoutBias: ['split-vertical', 'magazine-cover', 'frosted-card'],
    label: 'TREASURY',
  },
  ai_tech: {
    test: /\b(ai|artificial intelligence|machine learning|gpu|chip|semiconductor|data center|datacenter|capex|cloud|llm)\b/i,
    photoCast: 'cyber-blue',
    accentBias: ['orbital-rings', 'grid-overlay', 'diagonal-slash'],
    layoutBias: ['frosted-card', 'split-vertical', 'magazine-cover'],
    label: 'TECH',
  },
  geopolitics: {
    test: /\b(tariff|trade war|export control|geopolit|brics|alliance|conflict|war|nato|asean|opec)\b/i,
    photoCast: 'cool-cinematic',
    accentBias: ['horizon-stripe', 'orbital-rings', 'corner-ticks'],
    layoutBias: ['hero-left', 'magazine-cover', 'bottom-strip'],
    label: 'GEOPOLITICS',
  },
  shipping_logistics: {
    test: /\b(shipping|port|cargo|freight|logistic|supply chain|container|maritime|jebel ali|adnoc)\b/i,
    photoCast: 'sea-cool',
    accentBias: ['horizon-stripe', 'edge-marks', 'corner-ticks'],
    layoutBias: ['split-vertical', 'bottom-strip', 'magazine-cover'],
    label: 'LOGISTICS',
  },
  growth_expansion: {
    test: /\b(ipo|listing|funding|investment|expand|growth|family office|allocate|deploy|venture|series|round)\b/i,
    photoCast: 'warm-vibrant',
    accentBias: ['orbital-rings', 'bracket-frame', 'horizon-stripe'],
    layoutBias: ['magazine-cover', 'hero-left', 'split-vertical'],
    label: 'GROWTH',
  },
  real_estate: {
    test: /\b(real estate|property|mortgage|construction|infrastructure|reit|residential|commercial)\b/i,
    photoCast: 'warm-amber',
    accentBias: ['grid-overlay', 'edge-marks', 'bracket-frame'],
    layoutBias: ['hero-left', 'magazine-cover', 'frosted-card'],
    label: 'REAL ESTATE',
  },
};

function detectTheme(item, room) {
  const text = `${item?.title || ''} ${item?.description || ''} ${item?.topic || ''}`;
  for (const [key, theme] of Object.entries(TOPIC_THEMES)) {
    if (theme.test.test(text)) return { key, ...theme };
  }
  // Fallback per room
  const roomFallback = {
    growth: 'growth_expansion',
    capital: 'treasury_capital',
    risk: 'compliance_risk',
    world: 'geopolitics',
  };
  const fallbackKey = roomFallback[room] || 'geopolitics';
  return { key: fallbackKey, ...TOPIC_THEMES[fallbackKey] };
}

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC SEEDED RNG — same signal → same banner every time
// ═══════════════════════════════════════════════════════════════

/** Stable 32-bit hash of a string. djb2 variant. */
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return Math.abs(h) >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic. Returns a function () => [0,1). */
function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSeeded(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickNSeeded(arr, n, rng) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// PHOTO CAST FILTERS — 6 cinematic treatments
// ═══════════════════════════════════════════════════════════════

const PHOTO_CASTS = {
  'warm-amber':      { r: [0.85, 0.10, 0.05], g: [0.10, 0.7, 0.05], b: [0.05, 0.10, 0.55], gamma: [0.92, 0.95, 1.0] },
  'cool-red':        { r: [0.85, 0.05, 0.05], g: [0.10, 0.55, 0.10], b: [0.10, 0.10, 0.55], gamma: [0.9, 0.95, 0.95] },
  'gold-premium':    { r: [0.7, 0.15, 0.05], g: [0.15, 0.7, 0.05], b: [0.05, 0.10, 0.55], gamma: [0.92, 0.95, 1.0] },
  'cyber-blue':      { r: [0.55, 0.05, 0.05], g: [0.05, 0.55, 0.10], b: [0.10, 0.15, 0.85], gamma: [0.95, 0.95, 0.85] },
  'cool-cinematic':  { r: [0.55, 0.05, 0.10], g: [0.05, 0.65, 0.15], b: [0.10, 0.15, 0.85], gamma: [0.95, 0.95, 0.9] },
  'sea-cool':        { r: [0.45, 0.10, 0.15], g: [0.10, 0.6, 0.15], b: [0.15, 0.20, 0.8], gamma: [0.95, 0.95, 0.92] },
  'warm-vibrant':    { r: [0.65, 0.20, 0.10], g: [0.15, 0.8, 0.15], b: [0.10, 0.15, 0.55], gamma: [0.92, 0.9, 0.95] },
};

function photoFilterSVG(castKey) {
  const c = PHOTO_CASTS[castKey] || PHOTO_CASTS['cool-cinematic'];
  return `<filter id="cinematic" x="0" y="0" width="100%" height="100%">
      <feColorMatrix type="matrix" values="
        ${c.r[0]} ${c.r[1]} ${c.r[2]} 0 0
        ${c.g[0]} ${c.g[1]} ${c.g[2]} 0 0
        ${c.b[0]} ${c.b[1]} ${c.b[2]} 0 0
        0   0    0    1 0"/>
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude="1" exponent="${c.gamma[0]}" offset="0"/>
        <feFuncG type="gamma" amplitude="1" exponent="${c.gamma[1]}" offset="0"/>
        <feFuncB type="gamma" amplitude="1" exponent="${c.gamma[2]}" offset="0"/>
      </feComponentTransfer>
    </filter>`;
}

// ═══════════════════════════════════════════════════════════════
// DECORATION SYSTEM — 7 ornament generators
// ═══════════════════════════════════════════════════════════════
//
// Each function returns SVG fragments that overlay the banner. They are
// designed to layer cleanly with any base layout — they touch the edges
// and corners, not the content zone where stat + headline live.

function decorCornerTicks(color) {
  // Bronze corner ticks at all 4 corners — editorial mark
  const c = '#A8926A';
  return `
  <line x1="40" y1="40" x2="90" y2="40" stroke="${c}" stroke-width="2"/>
  <line x1="40" y1="40" x2="40" y2="90" stroke="${c}" stroke-width="2"/>
  <line x1="1040" y1="40" x2="990" y2="40" stroke="${c}" stroke-width="2"/>
  <line x1="1040" y1="40" x2="1040" y2="90" stroke="${c}" stroke-width="2"/>
  <line x1="40" y1="1040" x2="90" y2="1040" stroke="${c}" stroke-width="2"/>
  <line x1="40" y1="1040" x2="40" y2="990" stroke="${c}" stroke-width="2"/>
  <line x1="1040" y1="1040" x2="990" y2="1040" stroke="${c}" stroke-width="2"/>
  <line x1="1040" y1="1040" x2="1040" y2="990" stroke="${c}" stroke-width="2"/>`;
}

function decorBracketFrame(color) {
  // Asymmetric room-colored bracket frame — upper-right + lower-left
  return `
  <line x1="900" y1="50" x2="1040" y2="50" stroke="${color}" stroke-width="3" opacity="0.8"/>
  <line x1="1040" y1="50" x2="1040" y2="180" stroke="${color}" stroke-width="3" opacity="0.8"/>
  <line x1="40" y1="900" x2="40" y2="1040" stroke="${color}" stroke-width="3" opacity="0.8"/>
  <line x1="40" y1="1040" x2="180" y2="1040" stroke="${color}" stroke-width="3" opacity="0.8"/>`;
}

function decorDiagonalSlash(color) {
  // Subtle diagonal stripe from upper-right to lower-left
  return `
  <line x1="1080" y1="0" x2="0" y2="1080" stroke="${color}" stroke-width="1" opacity="0.12"/>
  <line x1="1080" y1="60" x2="60" y2="1080" stroke="${color}" stroke-width="1" opacity="0.08"/>
  <line x1="1020" y1="0" x2="0" y2="1020" stroke="#A8926A" stroke-width="1" opacity="0.08"/>`;
}

function decorOrbitalRings(color) {
  // Three concentric thin rings in upper-right — orbital / network feel
  return `
  <circle cx="940" cy="240" r="60" fill="none" stroke="${color}" stroke-width="1" opacity="0.35"/>
  <circle cx="940" cy="240" r="100" fill="none" stroke="${color}" stroke-width="1" opacity="0.22"/>
  <circle cx="940" cy="240" r="150" fill="none" stroke="${color}" stroke-width="1" opacity="0.12"/>
  <circle cx="940" cy="240" r="4" fill="${color}" opacity="0.8"/>`;
}

function decorHorizonStripe(color) {
  // Two horizontal stripes — one near top, one near bottom — like maritime/atlas marks
  return `
  <rect x="120" y="180" width="60" height="2" fill="${color}" opacity="0.7"/>
  <rect x="900" y="180" width="60" height="2" fill="${color}" opacity="0.7"/>
  <rect x="120" y="930" width="60" height="2" fill="#A8926A" opacity="0.6"/>
  <rect x="900" y="930" width="60" height="2" fill="#A8926A" opacity="0.6"/>`;
}

function decorGridOverlay(color) {
  // Fine 6×6 grid in the upper-left corner — data/digital feel
  let g = '<g opacity="0.15">';
  for (let i = 0; i <= 6; i++) {
    g += `<line x1="${60 + i * 40}" y1="60" x2="${60 + i * 40}" y2="300" stroke="${color}" stroke-width="0.5"/>`;
    g += `<line x1="60" y1="${60 + i * 40}" x2="300" y2="${60 + i * 40}" stroke="${color}" stroke-width="0.5"/>`;
  }
  return g + '</g>';
}

function decorEdgeMarks(color) {
  // Four tick marks on the inner edge — passport / classified-doc feel
  return `
  <rect x="540" y="20" width="40" height="3" fill="${color}" opacity="0.85"/>
  <rect x="540" y="1057" width="40" height="3" fill="${color}" opacity="0.85"/>
  <rect x="20" y="540" width="3" height="40" fill="#A8926A" opacity="0.7"/>
  <rect x="1057" y="540" width="3" height="40" fill="#A8926A" opacity="0.7"/>`;
}

const DECORATIONS = {
  'corner-ticks':     decorCornerTicks,
  'bracket-frame':    decorBracketFrame,
  'diagonal-slash':   decorDiagonalSlash,
  'orbital-rings':    decorOrbitalRings,
  'horizon-stripe':   decorHorizonStripe,
  'grid-overlay':     decorGridOverlay,
  'edge-marks':       decorEdgeMarks,
};

// ═══════════════════════════════════════════════════════════════
// COMPOSER — combines layout + theme + decorations + seed into final SVG
// ═══════════════════════════════════════════════════════════════

function svgWrapTheme(color, photoCast, body) {
  const filterDef = photoFilterSVG(photoCast);
  // Reuse svgDefs structure but replace the cinematic filter with theme-cast version
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1080" width="1080" height="1080" font-family="'Figtree','Segoe UI',system-ui,sans-serif">
  <defs>
    ${filterDef}
    <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0.25"/>
      <stop offset="35%" stop-color="#06060f" stop-opacity="0.55"/>
      <stop offset="65%" stop-color="#06060f" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0"/>
      <stop offset="60%" stop-color="#06060f" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="vignTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#06060f" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.98"/>
    </linearGradient>
    <radialGradient id="vignCenter" cx="0.5" cy="0.5" r="0.65">
      <stop offset="0%" stop-color="#06060f" stop-opacity="0"/>
      <stop offset="55%" stop-color="#06060f" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.95"/>
    </radialGradient>
    <radialGradient id="accentGlow" cx="0.78" cy="0.22" r="0.55">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="${color}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brassUnder" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#A8926A" stop-opacity="0"/>
      <stop offset="50%" stop-color="#A8926A" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#A8926A" stop-opacity="0"/>
    </linearGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.75"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="#06060f"/>
${body}
${svgFooter()}
</svg>
`;
}

function generateBanner(picked, dayIndex) {
  const { item, plan, room } = picked;
  const roomMeta = ROOMS[room];
  const color = roomMeta.color;
  const tier = pickTier(room, plan.type, dayIndex);
  const fact = cleanFact(item?.title || `Awaiting ${roomMeta.label} signal`);
  const stat = item ? (extractStat(item.title) || extractStat(item.description) || 'SIGNAL') : 'PENDING';
  const statSize = statFontSize(stat);
  const headline = fact.length > 60 ? splitHeadline(fact) : [fact, ''];
  const photoUrl = pickPhoto(picked);

  // 1. Detect the topic theme — drives layout bias, photo cast, accents
  const theme = detectTheme(item, room);

  // 2. Build a deterministic seed from the article (url+title) so every
  //    rebuild of the SAME signal produces the SAME banner, but DIFFERENT
  //    signals get different designs.
  const seedString = `${item?.url || ''}::${item?.title || ''}::${room}::${dayIndex}`;
  const rng = seededRng(hashString(seedString));

  // 3. Pick layout: seed-random within theme.layoutBias for theme coherence
  const preferredLayouts = LAYOUTS.filter(l => theme.layoutBias.includes(l.id));
  const layoutPool = preferredLayouts.length > 0 ? preferredLayouts : LAYOUTS;
  const layout = pickSeeded(layoutPool, rng);

  // 4. Pick 2 accent decorations from the theme's accent bias (always 2 so
  //    the banner has visual interest beyond the layout shell, but never so
  //    cluttered that the content suffers)
  const accentKeys = pickNSeeded(theme.accentBias, 2, rng);
  const accents = accentKeys.map(k => DECORATIONS[k]?.(color) || '').join('\n');

  // 5. Compose final SVG with theme-derived photo cast
  const ctx = {
    color, photoUrl, roomMeta, tier, stat, statSize, headline,
    plan, item, room, theme,
  };
  const body = layout.fn(ctx) + '\n' + accents;
  return svgWrapTheme(color, theme.photoCast, body);
}

/** Split a long headline into two roughly balanced lines on word boundary. */
function splitHeadline(text) {
  const t = text.replace(/[.!?]+$/, '');
  if (t.length <= 36) return [t, ''];
  const target = Math.floor(t.length / 2);
  const words = t.split(' ');
  let bestSplit = 0;
  let bestDelta = Infinity;
  let lenSoFar = 0;
  for (let i = 0; i < words.length - 1; i++) {
    lenSoFar += words[i].length + 1;
    const delta = Math.abs(lenSoFar - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestSplit = i + 1;
    }
  }
  const line1 = words.slice(0, bestSplit).join(' ');
  const line2 = words.slice(bestSplit).join(' ');
  return [
    line1.length > 38 ? line1.slice(0, 36) + '…' : line1,
    line2.length > 38 ? line2.slice(0, 36) + '…' : line2,
  ];
}

// ═══════════════════════════════════════════════════════════════
// HTML INDEX GENERATION
// ═══════════════════════════════════════════════════════════════

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'signal';
}


// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('MICS Daily Posting Kit — Weekly Auto-Builder');
  console.log(`Generated at: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Read latest news feed
  if (!existsSync('news-latest.json')) {
    console.error('FATAL: news-latest.json not found in working directory.');
    console.error('Expected workflow: checkout gh-pages → file is present from fetch-news cron.');
    process.exit(1);
  }
  const feed = JSON.parse(await readFile('news-latest.json', 'utf8'));
  console.log(`[FEED] Loaded ${feed.totalCount || 0} scored signals across rooms`);
  for (const room of ['risk', 'world', 'capital', 'growth']) {
    console.log(`  ${room.padEnd(8)} ${(feed.rooms[room] || []).length}`);
  }

  // 2. Pick the kit
  const kit = pickKit(feed);
  console.log(`\n[KIT] Selected ${kit.filter(k => k.item).length}/7 slots with fresh signals`);
  for (let i = 0; i < kit.length; i++) {
    const { item, plan, room } = kit[i];
    if (item) {
      console.log(`  Post ${i + 1}  ${plan.day} ${plan.slot}  [${room}]  ${item.title.slice(0, 70)}`);
    } else {
      console.log(`  Post ${i + 1}  ${plan.day} ${plan.slot}  [${room}]  (awaiting signal)`);
    }
  }

  // 3. Ensure /kit/ folder exists at the gh-pages root (matches what the
  //    React WeeklyKit view fetches: BASE_URL/kit/<slug>.svg + .txt and
  //    BASE_URL/kit-latest.json for the manifest).
  await mkdir('kit', { recursive: true });

  // 4. Generate posts + banners, and build the manifest entries
  const manifestPosts = [];
  for (let i = 0; i < kit.length; i++) {
    const picked = kit[i];
    const n = i + 1;
    const slug = slugify(picked.item?.title || `awaiting-${picked.plan.preferRoom}-signal`);
    const fileBase = `post-${n}-${slug}`;
    const theme = detectTheme(picked.item, picked.room);
    const tier = pickTier(picked.room, picked.plan.type, i);

    const postText = generatePost(picked, i);
    const bannerSvg = generateBanner(picked, i);

    await writeFile(`kit/${fileBase}.txt`, postText, 'utf8');
    await writeFile(`kit/${fileBase}.svg`, bannerSvg, 'utf8');
    console.log(`  ✓ kit/${fileBase}.txt + .svg`);

    manifestPosts.push({
      n,
      slug,
      slot: { day: picked.plan.day, time: picked.plan.slot },
      framework: FRAMEWORK_LABELS[picked.plan.framework] || picked.plan.framework,
      room: picked.room,
      theme: theme.key,
      tier,
      title: picked.item?.title || `Awaiting ${ROOMS[picked.room].label} signal`,
      sourceUrl: picked.item?.url || '',
      filenameBase: fileBase,
    });
  }

  // 5. Write the lightweight manifest the React WeeklyKit view fetches.
  //    No standalone HTML page — the kit renders inside the app only.
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    weekOf: todayShort(),
    totalCount: manifestPosts.length,
    posts: manifestPosts,
  };
  await writeFile('kit-latest.json', JSON.stringify(manifest, null, 2), 'utf8');
  console.log('  ✓ kit-latest.json');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Kit complete. React app fetches it via WeeklyKit view (step 13).');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('Fatal error in build-weekly-kit:', e);
  process.exit(1);
});
