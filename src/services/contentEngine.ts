/**
 * CONTENT ENGINE — Dynamic, varied UAE-specific post generation
 *
 * Designed per the UAE Real-Time Content Engine production requirements:
 *   - Always cite exact calendar dates (no vague "today/tomorrow")
 *   - Always include a "why it matters" framing for executive audience
 *   - Always end with a soft advisory CTA
 *   - Reference UAE regulators explicitly (MoF, FTA, DFSA, ADGM, MoHRE, CBUAE)
 *   - Use AED naturally; en-US spelling for body, UAE terms unchanged
 *
 * Anti-repetition design:
 *   - 6 distinct post LAYOUTS (date-stamped, numbered breakdown, stat-reveal,
 *     question-led, insider-aside, comparison, micro-pulse)
 *   - 20+ hook variants per category, 10+ body lines per room
 *   - localStorage memory of last-used layout IDs to prevent back-to-back repeats
 *   - Article picker randomises across top recent results
 *
 * Quality comes from:
 *   - Real news data (newsFetcher.ts)
 *   - UAE-specific framing via regulator-aware body lines
 *   - QA validator runs after generation (separate step in hooks)
 */

import type { GeneratedPost, RoomId, PostTypeId, StatDirection } from '../types';
import type { NewsArticle } from './newsFetcher';
import { brand, dateFormatted } from '../config/brand';
import { ROOMS } from '../config/rooms';
import {
  findHeadlineMoney,
  findHeadlinePercent,
  detectPrimaryOrg,
  smartFirstSentence,
  extractFacts,
} from './nlpEnhancer';
import { recommendFramework, FRAMEWORK_TO_LAYOUT } from './marketingGuru';

// ─── Anti-repetition memory (localStorage) ──────────────────────

const MEMORY_KEY = 'mics_layout_memory_v2';
// Track last 6 layouts, 6 hooks/bodies, 8 closers
// → with 6 layouts / 20 closers, no repeats within ~a week of posts.
const MEMORY_DEPTH_LAYOUTS = 5;
const MEMORY_DEPTH_HOOKS = 6;
const MEMORY_DEPTH_CLOSINGS = 8;

interface LayoutMemory {
  layouts: string[];
  hooks: string[];
  closings: string[];
}

function loadMemory(): LayoutMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return { layouts: [], hooks: [], closings: [] };
    return JSON.parse(raw);
  } catch {
    return { layouts: [], hooks: [], closings: [] };
  }
}

function saveMemory(mem: LayoutMemory): void {
  try {
    mem.layouts = mem.layouts.slice(-MEMORY_DEPTH_LAYOUTS);
    mem.hooks = mem.hooks.slice(-MEMORY_DEPTH_HOOKS);
    mem.closings = mem.closings.slice(-MEMORY_DEPTH_CLOSINGS);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch { /* ignore quota */ }
}

/**
 * Pick an index that hasn't been used in the last MEMORY_DEPTH calls.
 * If all are recent, picks a random one (rare with sufficient pool size).
 */
function pickFresh<T>(pool: T[], recent: string[], keyFn: (i: number) => string): number {
  const indices = pool.map((_, i) => i);
  const fresh = indices.filter(i => !recent.includes(keyFn(i)));
  const choice = (fresh.length ? fresh : indices)[Math.floor(Math.random() * (fresh.length ? fresh.length : indices.length))];
  return choice;
}

// ─── Helper utilities ───────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cleanTitle(title: string): string {
  // Remove trailing source attribution ("... - Reuters", "... | Bloomberg")
  return title.replace(/\s*[-|–]\s*[A-Z][a-zA-Z &]+$/, '').trim();
}

function firstClause(text: string): string {
  // Smart sentence boundary via compromise.js — handles abbreviations,
  // decimal numbers, and "U.S." etc. Falls back to regex on parse failure.
  const clean = cleanTitle(text);
  const sentence = smartFirstSentence(clean, 200).trim();
  // Strip trailing period for cleaner concatenation
  const noTrail = sentence.replace(/[.!?]\s*$/, '');
  if (noTrail.length > 140) return noTrail.slice(0, 137) + '…';
  return noTrail;
}

function ucFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Stat extraction ────────────────────────────────────────────

interface ExtractedStat {
  value: string;
  label: string;
  direction: StatDirection;
}

const STAT_PATTERNS = [
  { regex: /AED\s*(\d[\d,.]*)\s*(billion|million|trillion|B|M|T)\b/i, fmt: (m: RegExpMatchArray) => `AED ${m[1]}${normaliseScale(m[2])}` },
  { regex: /\$(\d[\d,.]*)\s*(billion|million|trillion|B|M|T)\b/i, fmt: (m: RegExpMatchArray) => `$${m[1]}${normaliseScale(m[2])}` },
  { regex: /USD\s*(\d[\d,.]*)\s*(billion|million|trillion|B|M|T)?/i, fmt: (m: RegExpMatchArray) => `USD ${m[1]}${m[2] ? normaliseScale(m[2]) : ''}` },
  { regex: /(\d[\d,.]*)\s*%/, fmt: (m: RegExpMatchArray) => `${m[1]}%` },
  { regex: /(\d[\d,.]*)\s*(billion|million|trillion)/i, fmt: (m: RegExpMatchArray) => `${m[1]}${normaliseScale(m[2])}` },
  { regex: /(\d{1,3}(?:,\d{3})+)/, fmt: (m: RegExpMatchArray) => m[1] },
];

function normaliseScale(s: string): string {
  const c = s.charAt(0).toUpperCase();
  return c === 'B' ? 'B' : c === 'M' ? 'M' : c === 'T' ? 'T' : '';
}

const UP_SIGNALS = /\b(surge|soar|rise|gain|grow|increase|expand|jump|climb|boost|up|record high|accelerat|outperform|exceed|hit.{0,10}high|raise|advance)/i;
const DOWN_SIGNALS = /\b(fall|drop|decline|plunge|shrink|cut|slash|down|low|contract|slump|tumble|decrease|reduce|slow)/i;

function extractStat(title: string, description: string): ExtractedStat | null {
  const text = `${title} ${description}`;

  // Determine direction once for the whole text
  let direction: StatDirection = 'neutral';
  if (UP_SIGNALS.test(text)) direction = 'up';
  else if (DOWN_SIGNALS.test(text)) direction = 'down';

  // 1. NLP-FIRST PATH — compromise.js correctly parses "AED 18 billion",
  //    "$3.2B", "USD 4.9 billion", "73%" without regex gymnastics.
  const moneyToken = findHeadlineMoney(text);
  if (moneyToken) {
    const normalised = normaliseMoneyToken(moneyToken);
    return { value: normalised, label: buildStatLabel(title, moneyToken), direction };
  }

  const pctToken = findHeadlinePercent(text);
  if (pctToken) {
    return { value: pctToken.trim(), label: buildStatLabel(title, pctToken), direction };
  }

  // 2. REGEX FALLBACK — for tokens compromise might miss
  for (const { regex, fmt } of STAT_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      return { value: fmt(match), label: buildStatLabel(title, match[0]), direction };
    }
  }
  return null;
}

/**
 * Normalise compromise's money output to the engine's preferred display format.
 * Examples:
 *   "AED 18 billion" → "AED 18B"
 *   "USD 4.9 billion" → "USD 4.9B"
 *   "$3.2 billion"   → "$3.2B"
 */
function normaliseMoneyToken(token: string): string {
  return token
    .replace(/\s+billion\b/i, 'B')
    .replace(/\s+million\b/i, 'M')
    .replace(/\s+trillion\b/i, 'T')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildStatLabel(title: string, statStr: string): string {
  const idx = title.indexOf(statStr);
  if (idx === -1) {
    const words = title.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
    return words.join(' ').toUpperCase().slice(0, 30);
  }
  const after = title.slice(idx + statStr.length).trim().split(/\s+/).filter(w => w.length > 2).slice(0, 3);
  if (after.length >= 2) return after.join(' ').toUpperCase().slice(0, 30);
  const before = title.slice(0, idx).trim().split(/\s+/).filter(w => w.length > 2).slice(-3);
  return before.join(' ').toUpperCase().slice(0, 30);
}

// ─── Headline generator ─────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'but', 'with', 'from', 'into', 'that', 'this', 'has',
  'have', 'been', 'was', 'were', 'are', 'its', 'a', 'an', 'or', 'in', 'on',
  'at', 'to', 'by', 'of', 'as', 'is',
]);

function generateHeadline(title: string): string {
  const cleaned = cleanTitle(title).replace(/['"]/g, '');
  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
  const headline = words.slice(0, 5).join(' ').toUpperCase();
  return headline.length > 5 ? headline : cleaned.split(/\s+/).slice(0, 5).join(' ').toUpperCase();
}

// ─── UAE regulator awareness ────────────────────────────────────
// Detect which UAE entity the article references, so body lines can name it.

interface UAEContext {
  regulator?: string;       // human label e.g. "Federal Tax Authority"
  topic?: string;           // detected topical theme
  hasEffectiveDate?: boolean;
}

function detectUAEContext(article: NewsArticle): UAEContext {
  const fullText = `${article.title} ${article.description} ${article.source}`;
  const blob = fullText.toLowerCase();
  const ctx: UAEContext = {};

  // Regulator detection — NLP-powered (handles "Ministry of Finance" as a
  // single entity, plus all UAE-specific aliases via nlpEnhancer)
  const detectedOrg = detectPrimaryOrg(fullText);
  if (detectedOrg) ctx.regulator = detectedOrg;

  // Topic detection (kept regex-based, these are domain-specific keywords)
  if (/einvoic|electronic invoic/.test(blob)) ctx.topic = 'eInvoicing';
  else if (/corporate tax|tax procedure/.test(blob)) ctx.topic = 'corporate tax';
  else if (/aml|money laundering/.test(blob)) ctx.topic = 'AML';
  else if (/emiratisation/.test(blob)) ctx.topic = 'Emiratisation';
  else if (/sukuk/.test(blob)) ctx.topic = 'sukuk';
  else if (/private credit/.test(blob)) ctx.topic = 'private credit';
  else if (/agentic ai|artificial intelligence/.test(blob)) ctx.topic = 'AI';
  else if (/pillar (two|2)/.test(blob)) ctx.topic = 'OECD Pillar Two';

  // Effective-date language — augmented with compromise's date detection
  const facts = extractFacts(fullText);
  ctx.hasEffectiveDate = facts.hasDeadlineLanguage ||
    /effective|deadline|come into force|enters into force|by \d|from \d/i.test(blob);

  return ctx;
}

// ─── Hook pools (expanded) ──────────────────────────────────────

const HOOKS_DATE_LED = [
  (date: string) => `*${date}.*`,
  (date: string) => `Filed ${date}.`,
  (date: string) => `${date}.`,
  (date: string) => `${date}. New on the radar.`,
];

const HOOKS_CONTRARIAN = [
  (topic: string) => `The consensus narrative says one thing. ${topic} says another.`,
  (topic: string) => `While most are watching the obvious story, ${topic} is the quieter signal.`,
  (topic: string) => `Here's what the mainstream framing got wrong about ${topic}.`,
  (topic: string) => `The comfortable read on this just broke. ${topic}.`,
  (topic: string) => `Everyone is parsing the headline. The substance is in ${topic}.`,
  (topic: string) => `Reading the room wrong on this is going to cost someone. ${topic}.`,
  (topic: string) => `Two things can be true. The market is calm. ${topic} suggests it shouldn't be.`,
];

// All revelation hooks are source-agnostic — never name the news outlet
// in the post body (source names are internal reference only).
const HOOKS_REVELATION = [
  (topic: string) => `Something just landed that most boards won't notice for weeks. ${topic}.`,
  (topic: string) => `Something shifted in the data this week. ${topic}.`,
  (topic: string) => `Quiet development that deserves wider attention: ${topic}.`,
  (topic: string) => `This confirms what insiders had been pricing in: ${topic}.`,
  (topic: string) => `This did not make the front pages. It probably should have. ${topic}.`,
  (topic: string) => `Underneath the noise, a real signal: ${topic}.`,
  (topic: string) => `If you are tracking the second-order effects, this one matters. ${topic}.`,
];

const HOOKS_QUANTIFIED = [
  (stat: string, ctx: string) => `*${stat}.* That is the print. ${ctx}.`,
  (stat: string, ctx: string) => `*${stat}.* Read it twice. ${ctx}.`,
  (stat: string, ctx: string) => `The number: *${stat}*. ${ctx}.`,
  (stat: string, ctx: string) => `When *${stat}* hits the wire, attention is warranted. ${ctx}.`,
  (stat: string, ctx: string) => `*${stat}*. If that does not recalibrate the outlook, the next one will. ${ctx}.`,
  (stat: string, ctx: string) => `Print of the week: *${stat}*. ${ctx}.`,
];

const HOOKS_QUESTION = [
  (topic: string) => `What changes if ${topic.toLowerCase()}?`,
  (topic: string) => `How prepared is your structure for ${topic.toLowerCase()}?`,
  (topic: string) => `Where does ${topic.toLowerCase()} actually leave you?`,
  (topic: string) => `Is ${topic.toLowerCase()} already priced into your plan?`,
  (topic: string) => `Who benefits, and who pays, when ${topic.toLowerCase()}?`,
];

const HOOKS_INSIDER = [
  () => `Quick thought before the week gets busy.`,
  () => `Something crossed the desk this morning.`,
  () => `Been turning this over since it landed.`,
  () => `Not making a big public deal of this, but worth flagging here.`,
  () => `Sharing this here first.`,
  () => `One I want to put in front of this group early.`,
];

// ─── Body lines per room (expanded, UAE-specific) ───────────────

const ROOM_BODY: Record<RoomId, ((a: NewsArticle, ctx: UAEContext) => string)[]> = {
  growth: [
    (a) => `${firstClause(a.title)}. The competitive landscape just shifted for founders mapping their next UAE move.`,
    (a) => `Growth-stage planning math has shifted. Capital flows and regulatory tailwinds are aligning in a way that rewards early structural decisions.`,
    (a) => `The data tells a story the headlines do not. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.regulator
      ? `${ctx.regulator}'s position is consistent with the broader push into the next phase of UAE diversification.`
      : `The signal is consistent with the broader diversification thesis the UAE has been executing against.`,
    (a) => `${firstClause(a.title)}. The free-zone footprint, DIFC and ADGM in particular, keeps absorbing the activity.`,
    (a) => `Founders running feasibility on the GCC just got a cleaner input variable: ${firstClause(a.title.toLowerCase())}.`,
    (a) => `If your expansion model still assumes 2023 economics, this is a useful moment to revisit the inputs. ${firstClause(a.title)}.`,
    (a) => `The early movers are not waiting for confirmation. ${firstClause(a.title)}.`,
    (a) => `What is interesting is not the headline number. It is the composition. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.topic === 'AI'
      ? `Dubai's agentic-AI push reframes the operating-model conversation for every UAE private-sector firm of size.`
      : `The transmission from announcement to advisory-room conversation is faster than most assume.`,
  ],
  capital: [
    (a) => `${firstClause(a.title)}. For treasurers managing cash positions, the curve just sent a signal worth pricing in.`,
    (a) => `Capital deployment decisions just got more textured. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.regulator === 'CBUAE'
      ? `With CBUAE maintaining alignment to the dirham-dollar peg, the relative-value question becomes structural, not cyclical.`
      : `The relative-value question across UAE instruments keeps tightening.`,
    (a) => `For those managing liquidity across multiple entities, the structuring window matters. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.topic === 'sukuk'
      ? `Sukuk issuance momentum continues to reward issuers who locked in early in the rate cycle.`
      : `The spread between what is available and what most are doing with reserves is widening.`,
    (a) => `DIFC and ADGM private-credit allocators have been the quiet beneficiaries of bank-lending tightening. ${firstClause(a.title)}.`,
    (a) => `The sleeve nobody is talking about: short-duration AED paper paired against medium-duration USD. ${firstClause(a.title)}.`,
    (a) => `If your reserve policy was last reviewed under a different rate regime, this is the moment. ${firstClause(a.title)}.`,
    (a) => `Two things to watch: deposit beta on the AED side, and refinancing pipeline on the USD side. ${firstClause(a.title)}.`,
    (a) => `Capital is signalling. The question is who is reading it as a yield-curve event and who is reading it as a structural shift.`,
  ],
  risk: [
    (a, ctx) => ctx.regulator
      ? `${ctx.regulator} just moved. ${firstClause(a.title)}. The gap between technically compliant and actually prepared is where exposure sits.`
      : `Compliance just got a new wrinkle. ${firstClause(a.title)}.`,
    (a) => `This is the kind of regulatory shift that catches firms mid-cycle. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.hasEffectiveDate
      ? `Effective-date language matters here. Retroactive remediation is always more expensive than ahead-of-curve readiness. ${firstClause(a.title)}.`
      : `The cost of retroactive compliance always exceeds the cost of preparation. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.topic === 'eInvoicing'
      ? `eInvoicing readiness is now a finance-systems decision, not a tax-team decision. ${firstClause(a.title)}.`
      : `If your governance framework was built for last year's rulebook, this is the moment to stress-test it.`,
    (a, ctx) => ctx.topic === 'corporate tax'
      ? `Corporate-tax enforcement posture continues to firm up. ${firstClause(a.title)}.`
      : `Enforcement patterns suggest this is the baseline, not a warning shot. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.topic === 'AML'
      ? `AML expectations across UAE financial-services entities and DNFBPs continue to tighten. ${firstClause(a.title)}.`
      : `${firstClause(a.title)}. The downstream documentation burden lands in finance and legal first.`,
    (a, ctx) => ctx.topic === 'Emiratisation'
      ? `Emiratisation deadlines do not move. The board-reporting and operating-cost implications need to be on the agenda before, not after.`
      : `Quarterly board reporting should reflect this. ${firstClause(a.title)}.`,
    (a) => `Voluntary-disclosure regimes reward firms that move first. ${firstClause(a.title)}.`,
    (a) => `If you are inside an audit window, the workpaper trail starts now. ${firstClause(a.title)}.`,
    (a) => `${firstClause(a.title)}. Read this alongside your current control matrix, not in isolation.`,
  ],
  world: [
    (a) => `Global signal worth tracking from a UAE seat: ${firstClause(a.title)}. Transmission to the Gulf is faster than most assume.`,
    (a) => `Second-order effects hit the region within quarters, not years. ${firstClause(a.title)}.`,
    (a, ctx) => ctx.topic === 'OECD Pillar Two'
      ? `Pillar Two operationalisation continues to shape in-scope UAE groups. ${firstClause(a.title)}.`
      : `When a shift of this kind happens at the macro level, the question is the speed of regional transmission, not whether it arrives.`,
    (a) => `The strategic repositioning has already started for those reading it correctly. ${firstClause(a.title)}.`,
    (a) => `Currency-mix, supplier-mix, and funding-mix all need a second look against this. ${firstClause(a.title)}.`,
    (a) => `Multilateral guidance is the canary. ${firstClause(a.title)}.`,
    (a) => `If your scenario planning still uses last cycle's assumptions, this is the prompt to refresh them. ${firstClause(a.title)}.`,
    (a) => `Energy markets and policy markets are coupled more than the headlines admit. ${firstClause(a.title)}.`,
    (a) => `Watch the policy reaction, not the price reaction. ${firstClause(a.title)}.`,
    (a) => `The GCC sits at the crossover of three transmission channels: rates, energy, and trade. ${firstClause(a.title)}.`,
  ],
};

// ─── Why-it-matters lines per room ──────────────────────────────

const WHY_IT_MATTERS: Record<RoomId, string[]> = {
  growth: [
    'Expansion timing in the UAE is structural, not opportunistic. The firms that map their next move now will be the ones executing while the rest are still in feasibility.',
    'Capital allocation across the next two quarters is where the alpha sits. Decisions made under the current setup compound through the entire next investment cycle.',
    'Mainland and free-zone setup choices get harder to reverse from here. The cost of restructuring later usually exceeds the cost of getting it right the first time.',
    'Operating-model choices made now will define competitive position through the next investment cycle. The window for unforced structural decisions narrows quickly.',
  ],
  capital: [
    'Treasury policy that was right for 2024 will not be right for the next twelve months. The yield environment, regulatory expectations, and funding-mix options have all shifted in ways that warrant a quarterly review, not an annual one.',
    'The cost of inaction on reserve structuring usually shows up too late. By the time the inefficiency is visible in the numbers, the optimal restructuring window has already closed.',
    'Funding-mix reviews need a quarterly cadence in this environment, not an annual one. Issuance windows, deposit beta, and refinancing pipelines are moving faster than legacy treasury policy frameworks anticipate.',
    'Yield-curve positioning is a board-level conversation now, not a treasury-desk one. The implications cross into capex pacing, dividend policy, and balance-sheet structuring.',
  ],
  risk: [
    'Retroactive compliance is always more expensive than ahead-of-curve readiness. The firms that get caught mid-cycle pay in remediation costs, advisory fees, and management bandwidth that compounds across multiple quarters.',
    'Audit-season exposure is built in the quarters before audit, not during. The documentation trail, the control evidence, and the governance posture all need to be in place ahead of the window, not assembled retroactively.',
    'Controls drift quietly, and documentation either catches up to that drift or it does not. The gap shows up first in audit findings, then in penalty exposure, then in board-level conversations.',
    'Voluntary disclosure regimes reward first movers and penalise the rest. The advantage of acting inside the disclosure window before the enforcement posture firms up is usually material.',
  ],
  world: [
    'Global rule changes hit UAE balance sheets through three channels: rates, trade flows, and energy markets. Scenario planning that ignores any one of those underprices regional exposure.',
    'Scenario planning that uses last cycle\'s assumptions underprices the regional transmission. The Gulf sits at the crossover of monetary, energy, and trade policy in ways that compound rather than offset.',
    'Multilateral policy turns translate into UAE compliance work faster than most expect. The time between announcement and operational impact has compressed materially in the last two cycles.',
    'Capital flows respond to policy signals before they respond to underlying fundamentals. The firms reading the signal early are the ones positioned when the flows arrive.',
  ],
};

// ─── Closing lines (peer "we're tracking this together" register) ──
// No asks, no "send a note", no "happy to discuss." Just observational
// sign-offs in the register of "Let's stay updated in this evolving journey."
// Large pool + memory rotation → no repeats within a week of posts.

const CLOSERS = [
  "Let's stay close to this one.",
  "Let's stay updated as this evolves.",
  "More to come as the picture fills in.",
  "One to keep on the radar.",
  "Story still being written.",
  "Worth tracking as the next move lands.",
  "Filing this and watching.",
  "We'll see how this one lands.",
  "The curve is still being drawn here.",
  "Picture should sharpen in the coming weeks.",
  "Updates to follow as they arrive.",
  "Keeping eyes on the next signal.",
  "Let's see where this goes.",
  "One to revisit when the dust settles.",
  "Threading this for the week.",
  "More signals expected on this front.",
  "Watching the follow-through.",
  "Keeping this one bookmarked.",
  "Let's see how the next read lands.",
  "On the watchlist from here.",
];

function pickCloser(mem: LayoutMemory): string {
  const indices = CLOSERS.map((_, i) => i);
  const recentSet = new Set(mem.closings);
  const fresh = indices.filter(i => !recentSet.has(String(i)));
  const pool = fresh.length ? fresh : indices;
  const idx = pool[Math.floor(Math.random() * pool.length)];
  mem.closings.push(String(idx));
  return CLOSERS[idx];
}

function buildEnding(closer: string, _sourceUrl: string): string {
  // POLICY: do NOT append the source URL to the post text.
  // The URL is auto-attached by the group-posting flow / link preview;
  // showing it in the body duplicates the link and triggers self-promo flags.
  // The URL is still stored on `result.sourceUrl` for the in-app source button.
  void _sourceUrl;
  return closer;
}

/**
 * Pick two DIFFERENT body lines from a room's pool, avoiding back-to-back
 * repeats via memory. Used by layouts that need a richer 2-paragraph body
 * (factual lead + elaboration) instead of a single short sentence.
 *
 * IMPORTANT: when the article carries a `briefImplication` from imported
 * Deep Research, the two body lines come from THAT instead of the generic
 * ROOM_BODY templates. This is how LLM-quality analysis flows into the
 * framework structure without the app needing to call an LLM itself.
 */
function pickTwoBodies(
  a: NewsArticle,
  room: RoomId,
  ctx: UAEContext,
  mem: LayoutMemory,
): [string, string] {
  // Brief-powered path: use the imported CFO implication as body content
  if (a.briefImplication && a.briefImplication.length > 100) {
    return splitImplicationIntoTwo(a.briefImplication);
  }

  // Template path (default, when no brief is available)
  const pool = ROOM_BODY[room];
  const idx1 = pickFresh(pool, mem.hooks, (i) => `${room}-body-${i}`);
  mem.hooks.push(`${room}-body-${idx1}`);

  const remaining = pool.map((_, i) => i).filter(i => i !== idx1);
  const recentSet = new Set(mem.hooks);
  const fresh = remaining.filter(i => !recentSet.has(`${room}-body-${i}`));
  const idx2 = (fresh.length ? fresh : remaining)[Math.floor(Math.random() * (fresh.length ? fresh.length : remaining.length))];
  mem.hooks.push(`${room}-body-${idx2}`);

  return [pool[idx1](a, ctx), pool[idx2](a, ctx)];
}

/**
 * Split a CFO implication paragraph into two balanced body paragraphs.
 * Uses smart sentence boundary detection (compromise.js) so abbreviations
 * and decimal numbers don't break the split.
 */
function splitImplicationIntoTwo(implication: string): [string, string] {
  const clean = implication.replace(/\s+/g, ' ').trim();
  // Use compromise's sentence boundary if available, otherwise regex
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z*_~])/);
  if (sentences.length <= 1) {
    // Single sentence — duplicate trick: split at midpoint clause
    const midpoint = Math.floor(clean.length / 2);
    const splitAt = clean.indexOf(' ', midpoint);
    if (splitAt < 0) return [clean, ''];
    return [clean.slice(0, splitAt).trim() + '.', clean.slice(splitAt).trim()];
  }
  if (sentences.length === 2) return [sentences[0].trim(), sentences[1].trim()];
  // 3+ sentences — split roughly down the middle
  const mid = Math.ceil(sentences.length / 2);
  const para1 = sentences.slice(0, mid).join(' ').trim();
  const para2 = sentences.slice(mid).join(' ').trim();
  return [para1, para2];
}

// ─── Layout assemblers ──────────────────────────────────────────
// Each layout is structurally distinct. The same article + room can be
// rendered through any of 6+ layouts → wide visual variety post-to-post.

type LayoutFn = (
  article: NewsArticle,
  room: RoomId,
  ctx: UAEContext,
  stat: ExtractedStat | null,
  mem: LayoutMemory,
) => string;

const DATE = dateFormatted.short;

// LAYOUT A — Date-stamped Executive Brief
// Professional 3-paragraph executive structure: lead → elaboration → implication
const layoutDateBrief: LayoutFn = (a, room, ctx, stat, mem) => {
  const dateHook = pickRandom(HOOKS_DATE_LED)(DATE);
  const [body1, body2] = pickTwoBodies(a, room, ctx, mem);
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const closer = pickCloser(mem);
  const statLine = stat ? ` *${stat.value}*.` : '';

  // Three substantive paragraphs: lead (body1 + stat) → elaboration (body2) → implication (why) → closer
  return `${dateHook}\n\n${body1}${statLine}\n\n${body2}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT B — Numbered Breakdown (1/2/3)
const layoutNumberedBreakdown: LayoutFn = (a, room, ctx, stat, mem) => {
  const topic = firstClause(a.title);
  const opener = pickRandom([
    `Three angles I'm watching here.`,
    `Reading it in three lines.`,
    `Three things on the desk after this.`,
    `Three signals worth sitting with.`,
    `Three threads I'd pull on this one.`,
  ]);

  // Build 3 punchy points
  const pointPool = ROOM_BODY[room].map(fn => fn(a, ctx).split('\n')[0]);
  const shuffled = [...pointPool].sort(() => Math.random() - 0.5).slice(0, 3);
  const statSuffix = stat ? ` (${stat.value})` : '';
  const points = [
    `*1.* ${shuffled[0]}`,
    `*2.* ${shuffled[1]}${statSuffix}`,
    `*3.* ${shuffled[2] || pickRandom(WHY_IT_MATTERS[room])}`,
  ];
  const closer = pickCloser(mem);

  return `${topic}.\n\n${opener}\n\n${points.join('\n\n')}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT C — Stat-First Reveal (with full elaboration body)
const layoutStatReveal: LayoutFn = (a, room, ctx, stat, mem) => {
  const value = stat?.value || (ctx.regulator ? `${DATE}` : firstClause(a.title));
  const contextual = stat
    ? firstClause(a.title)
    : `Filed ${DATE}`;
  const [body1, body2] = pickTwoBodies(a, room, ctx, mem);
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const closer = pickCloser(mem);

  return `*${value}.*\n\n${contextual}.\n\n${body1}\n\n${body2}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT D — Question-Led Frame (with full elaboration)
const layoutQuestion: LayoutFn = (a, room, ctx, stat, mem) => {
  const topic = firstClause(a.title);
  const question = pickRandom(HOOKS_QUESTION)(topic);
  const [body1, body2] = pickTwoBodies(a, room, ctx, mem);
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const statLine = stat ? `*${stat.value}*.\n\n` : '';
  const closer = pickCloser(mem);

  return `${question}\n\n${statLine}${body1}\n\n${body2}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT E — Insider Aside (personal voice, longer substance)
const layoutInsiderAside: LayoutFn = (a, room, ctx, stat, mem) => {
  const opener = pickRandom(HOOKS_INSIDER)();
  const topic = firstClause(a.title);
  const statLine = stat ? ` *${stat.value}* is the figure that stood out.` : '';
  const [body1, body2] = pickTwoBodies(a, room, ctx, mem);
  const closer = pickCloser(mem);

  return `${opener}\n\n${topic}.${statLine}\n\n${body1}\n\n${body2}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT F — Surface vs. Substance (with two-line elaboration)
const layoutContrast: LayoutFn = (a, room, ctx, stat, mem) => {
  const topic = firstClause(a.title);
  const surfaceFrames = [
    `Easy to read as a one-line story. The structure underneath is doing more work.`,
    `The surface read is one thing. The operating implications are another.`,
    `Headline-level take, clean. Two layers down, more interesting.`,
    `Reads simple on first pass. The second pass is the one that costs money.`,
    `Looks routine on the wire. The mechanics are anything but.`,
  ];
  const frame = pickRandom(surfaceFrames);
  const [body1, body2] = pickTwoBodies(a, room, ctx, mem);
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const statLine = stat ? ` *${stat.value}*.` : '';
  const closer = pickCloser(mem);

  return `${topic}.\n\n${frame}\n\n${body1}${statLine}\n\n${body2}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT G — Pulse (short micro-post, 200-400 chars)
const layoutPulse: LayoutFn = (a, _room, _ctx, stat, mem) => {
  void mem;
  const topic = firstClause(a.title);
  const statTag = stat ? ` *${stat.value}*.` : '';
  const tags = [
    `${topic}.${statTag} Quiet on the wire, louder underneath.`,
    `${topic}.${statTag} Second-order effects matter more than the headline.`,
    `${DATE}.${statTag} ${topic}. The window for ahead-of-curve positioning narrows from here.`,
    `${topic}.${statTag} The kind of move that prices in slowly.`,
    `${topic}.${statTag} Filing it before the cycle catches up.`,
  ];
  // No URL in body — auto-attached by the group-posting flow / link preview.
  void a.url;
  return pickRandom(tags);
};

// ─── FRAMEWORK-BASED LAYOUTS (Marketing Guru) ──────────────────
// Each layout follows a proven copywriting framework structure.

// LAYOUT AIDA — Attention, Interest, Desire, Action
// Best for growth/capital signals and fresh opportunity stats.
const layoutAIDA: LayoutFn = (a, room, ctx, stat, mem) => {
  const attention = stat
    ? `*${stat.value}*. ${firstClause(a.title)}.`
    : `${firstClause(a.title)}.`;
  const [body1, body2] = pickTwoBodies(a, room, ctx, mem);
  const desire = pickRandom(WHY_IT_MATTERS[room]);
  const closer = pickCloser(mem);

  // A: hook → I: relate → D: implications → A: forward-look (closer)
  return `${attention}\n\n${body1}\n\n${body2}\n\n${desire}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT PAS — Problem, Agitate, Solution
// Best for regulatory deadlines, penalties, compliance pressure.
const layoutPAS: LayoutFn = (a, room, ctx, stat, mem) => {
  const problem = `*${DATE}.* ${firstClause(a.title)}.`;
  const [bodyA, bodyB] = pickTwoBodies(a, room, ctx, mem);
  // Agitation: pressure the cost of inaction
  const agitate = ctx.hasEffectiveDate
    ? `The clock matters. ${bodyA}`
    : `The pressure compounds. ${bodyA}`;
  // Solution: forward-looking implication
  const solution = bodyB;
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const closer = pickCloser(mem);
  const statLine = stat ? ` *${stat.value}*.` : '';

  return `${problem}${statLine}\n\n${agitate}\n\n${solution}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT BAB — Before, After, Bridge
// Best for regulatory amendments, rule changes, structural shifts.
const layoutBAB: LayoutFn = (a, room, ctx, stat, mem) => {
  const dateHook = `*${DATE}.*`;
  const topic = firstClause(a.title);
  const [bodyA, bodyB] = pickTwoBodies(a, room, ctx, mem);
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const closer = pickCloser(mem);
  const statLine = stat ? ` *${stat.value}*.` : '';

  // B: previous state (implicit), A: new state (the news), Bridge (how to transition)
  return `${dateHook}\n\n${topic}.${statLine}\n\n${bodyA}\n\n${bodyB}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT HSO — Hook, Story, Offer
// Best for insider notes, exclusive intelligence, personal observations.
const layoutHSO: LayoutFn = (a, room, ctx, stat, mem) => {
  const insiderOpener = pickRandom(HOOKS_INSIDER)();
  const topic = firstClause(a.title);
  const [storyA, storyB] = pickTwoBodies(a, room, ctx, mem);
  const closer = pickCloser(mem);
  const statLine = stat ? ` *${stat.value}* is the figure I keep coming back to.` : '';

  // Hook: insider opener → Story: 2 elaborations → Offer: forward-looking close
  return `${insiderOpener}\n\n${topic}.${statLine}\n\n${storyA}\n\n${storyB}\n\n${buildEnding(closer, a.url)}`;
};

// LAYOUT SCQA — Situation, Complication, Question, Answer
// Best for macro/world news with UAE transmission implications.
const layoutSCQA: LayoutFn = (a, room, ctx, stat, mem) => {
  const situation = `${firstClause(a.title)}.`;
  const [bodyA, bodyB] = pickTwoBodies(a, room, ctx, mem);
  const question = pickRandom([
    `So how does this land in the UAE?`,
    `What does this mean from a Gulf seat?`,
    `Where does the regional read sit?`,
    `What's the UAE-side transmission?`,
  ]);
  const why = pickRandom(WHY_IT_MATTERS[room]);
  const closer = pickCloser(mem);
  const statLine = stat ? ` *${stat.value}*.` : '';

  // S: situation → C: complication (1st body) → Q: question → A: answer (2nd body + why)
  return `${situation}${statLine}\n\n${bodyA}\n\n${question}\n\n${bodyB}\n\n${why}\n\n${buildEnding(closer, a.url)}`;
};

// ─── Layout registry ────────────────────────────────────────────

interface LayoutEntry {
  id: string;
  fn: LayoutFn;
  suitableFor: PostTypeId[];
}

const LAYOUTS: LayoutEntry[] = [
  // Original variety layouts
  { id: 'date-brief',         fn: layoutDateBrief,         suitableFor: ['observation', 'alert', 'exclusive', 'generic'] },
  { id: 'numbered-breakdown', fn: layoutNumberedBreakdown, suitableFor: ['observation', 'generic', 'exclusive'] },
  { id: 'stat-reveal',        fn: layoutStatReveal,        suitableFor: ['observation', 'alert', 'exclusive', 'generic'] },
  { id: 'question',           fn: layoutQuestion,          suitableFor: ['observation', 'poll', 'generic'] },
  { id: 'insider-aside',      fn: layoutInsiderAside,      suitableFor: ['voicenote', 'exclusive', 'observation'] },
  { id: 'contrast',           fn: layoutContrast,          suitableFor: ['observation', 'generic', 'alert', 'exclusive'] },
  { id: 'pulse',              fn: layoutPulse,             suitableFor: ['pulse'] },
  // Marketing-framework layouts (recommended by the marketingGuru)
  { id: 'aida-funnel',        fn: layoutAIDA,              suitableFor: ['observation', 'alert', 'exclusive', 'generic'] },
  { id: 'pas-problem',        fn: layoutPAS,               suitableFor: ['observation', 'alert', 'exclusive', 'generic'] },
  { id: 'bab-bridge',         fn: layoutBAB,               suitableFor: ['observation', 'alert', 'exclusive', 'generic'] },
  { id: 'hso-story',          fn: layoutHSO,               suitableFor: ['voicenote', 'exclusive', 'observation'] },
  { id: 'scqa-frame',         fn: layoutSCQA,              suitableFor: ['observation', 'alert', 'exclusive', 'generic'] },
];

/**
 * Guru-aware layout selector. Two-pass logic:
 *   Pass 1: Ask the marketing guru which framework fits this article best.
 *           If the recommended layout is eligible AND hasn't been used too
 *           recently, pick it.
 *   Pass 2: Fall back to anti-repetition rotation through all eligible.
 */
function selectLayout(
  postType: PostTypeId,
  mem: LayoutMemory,
  article: NewsArticle,
  room: RoomId,
): LayoutEntry {
  const eligible = LAYOUTS.filter(l => l.suitableFor.includes(postType));
  if (!eligible.length) return LAYOUTS[0];

  // PASS 1 — Marketing Guru recommendation
  const rec = recommendFramework(article, room, postType);
  const preferredId = FRAMEWORK_TO_LAYOUT[rec.framework];
  const preferred = eligible.find(l => l.id === preferredId);
  // Use the guru's pick if it's eligible AND not in recent memory
  if (preferred && !mem.layouts.includes(preferred.id)) {
    return preferred;
  }

  // PASS 2 — Anti-repetition rotation through ALL eligible layouts
  const fresh = eligible.filter(l => !mem.layouts.includes(l.id));
  const pool = fresh.length ? fresh : eligible;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Poll assembly (special case, retains 4-option format) ──────

function assemblePoll(article: NewsArticle, room: RoomId, mem: LayoutMemory): string {
  const roomObj = ROOMS.find(r => r.id === room);
  const question = roomObj?.cfoQuestion || 'What\'s your next move?';
  const topicShort = firstClause(article.title);

  const options: Record<RoomId, string[]> = {
    growth: ['Already moving on this', 'Reviewing but waiting for clarity', 'Consolidating current positions first', 'This is new, not yet evaluated'],
    capital: ['Restructured in the last six months', 'Reviewing but not moved yet', 'Comfortable with current allocation', 'Not on the agenda yet'],
    risk: ['Already aligned with the new posture', 'In progress on the update', 'Aware but not started', 'Hearing about this for the first time'],
    world: ['Already adjusted regional positioning', 'Monitoring closely, ready to pivot', 'Still assessing the impact', 'Don\'t see direct exposure'],
  };

  const opts = options[room] || options.growth;
  const letters = ['A', 'B', 'C', 'D'];
  const closer = pickCloser(mem);

  // No URL in body — auto-attached by group-posting flow.
  void article.url;
  return `*${topicShort}.*\n\n${question}\n\n${opts.map((o, i) => `${letters[i]}. ${o}`).join('\n')}\n\n${closer}`;
}

// ─── Article picker (anti-repetition) ───────────────────────────

/**
 * Pick an article from the top recent results, weighted toward freshness.
 * Avoids always-pick-index-0 which causes identical posts when the same
 * article remains on top across consecutive calls.
 */
function pickArticle(articles: NewsArticle[]): NewsArticle {
  if (!articles.length) {
    return {
      title: 'UAE financial markets signal shift',
      url: '',
      source: 'Market Intelligence',
      date: dateFormatted.short,
      description: '',
    };
  }
  // Prefer top-5; choose randomly from that pool
  const topN = articles.slice(0, Math.min(5, articles.length));
  return topN[Math.floor(Math.random() * topN.length)];
}

// ─── Main engine ────────────────────────────────────────────────

export function generatePost(
  articles: NewsArticle[],
  room: RoomId,
  postTypeId: PostTypeId,
  customTopic?: string,
): GeneratedPost {
  // Pick article (varied across calls)
  const article = articles.length ? pickArticle(articles) : {
    title: customTopic || 'UAE financial markets signal shift',
    url: '',
    source: 'Market Intelligence',
    date: dateFormatted.short,
    description: customTopic || '',
  };

  // Load anti-repetition memory
  const mem = loadMemory();

  // Detect UAE-specific context
  const ctx = detectUAEContext(article);

  // Extract stat
  const stat = extractStat(article.title, article.description);

  // Generate headline (ALL CAPS, 4-6 words)
  const headline = generateHeadline(article.title);

  // Build subline with date + stat ONLY.
  // Source name is NOT displayed to viewers — it's internal reference only.
  // The author can see the source in the in-app attribution panel; the
  // banner that gets shared to WhatsApp keeps the source anonymous.
  const subline = `${dateFormatted.short}${stat ? ` | ${stat.value}` : ''}`;

  // Assemble text — guru-aware layout selection picks the best framework
  let text: string;
  if (postTypeId === 'poll') {
    text = assemblePoll(article, room, mem);
    mem.layouts.push('poll');
  } else {
    const layout = selectLayout(postTypeId, mem, article, room);
    text = layout.fn(article, room, ctx, stat, mem);
    mem.layouts.push(layout.id);
  }

  // Save memory
  saveMemory(mem);

  // Normalise: replace any em-dashes with periods (banned)
  text = text.replace(/—/g, '.').replace(/–/g, '-');

  return {
    text,
    headline,
    subline,
    stat: stat?.value || '',
    statLabel: stat?.label || headline.split(/\s+/).slice(0, 3).join(' '),
    statDirection: stat?.direction || 'neutral',
    source: article.source,
    sourceUrl: article.url,
    // AUDIT REFRESH metadata — captured at generation time, never cached
    articleHoursAgo: article.hoursAgo,
    generatedAtMs: Date.now(),
  };
}

// Use brand to keep import live for downstream consumers
void brand;
