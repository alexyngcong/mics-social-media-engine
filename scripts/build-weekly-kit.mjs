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

// Full week posting plan. Covers EVERY post type relevant to a CFO
// intelligence group:
//   - exclusive  : Sunday "week ahead" insider signal (gold accent, top of week)
//   - alert      : Morning urgency posts (PAS / BAB frameworks)
//   - observation: Analytical reads (DATA / AIDA frameworks)
//   - pulse      : Short midweek micro-post (200–400 chars)
//   - poll       : Engagement post with 4 answer options
//   - voicenote  : Weekend personal aside / insider tone
//
// Rooms + frameworks + types all rotate so no two consecutive posts share
// the same structural shape or register.
const WEEK_PLAN = [
  { day: 'Sun', slot: '18:00 GST', preferRoom: 'world',   framework: 'HSO',  type: 'exclusive' },
  { day: 'Mon', slot: '08:00 GST', preferRoom: 'risk',    framework: 'PAS',  type: 'alert' },
  { day: 'Mon', slot: '17:00 GST', preferRoom: 'world',   framework: 'PAS',  type: 'alert' },
  { day: 'Tue', slot: '08:00 GST', preferRoom: 'world',   framework: 'DATA', type: 'observation' },
  { day: 'Tue', slot: '17:00 GST', preferRoom: 'capital', framework: 'BAB',  type: 'poll' },
  { day: 'Wed', slot: '09:00 GST', preferRoom: 'capital', framework: 'AIDA', type: 'observation' },
  { day: 'Wed', slot: '15:00 GST', preferRoom: 'growth',  framework: 'AIDA', type: 'pulse' },
  { day: 'Thu', slot: '09:00 GST', preferRoom: 'risk',    framework: 'BAB',  type: 'observation' },
  { day: 'Fri', slot: '09:00 GST', preferRoom: 'growth',  framework: 'AIDA', type: 'observation' },
  { day: 'Sat', slot: '10:00 GST', preferRoom: 'world',   framework: 'HSO',  type: 'voicenote' },
];

// Human-readable label per post type — shown on the banner + in-app chip
const POST_TYPE_LABELS = {
  alert:       { label: 'ALERT',         icon: '🚨', accent: '#EF5555' },
  observation: { label: 'OBSERVATION',   icon: '🔍', accent: '#A8926A' },
  pulse:       { label: 'PULSE',         icon: '🎯', accent: '#F0C050' },
  poll:        { label: 'POLL',          icon: '🗳️', accent: '#A78BFA' },
  voicenote:   { label: 'INSIDER NOTE',  icon: '💬', accent: '#5B8DEE' },
  exclusive:   { label: 'WEEK AHEAD',    icon: '🔒', accent: '#A8926A' },
};

// Intelligence-grade tier labels indexed by room + type.
// These are NEVER news-labels ("BREAKING", "LATEST", "JUST IN").
// They signal strategic-analysis grade.
const TIER_LABELS = {
  risk: {
    alert: ['ENFORCEMENT LIVE', 'REGULATORY SHIFT', 'COMPLIANCE WINDOW', 'GOVERNANCE SIGNAL'],
    observation: ['PATTERN MIGRATING', 'CONTROL DRIFT', 'AUDIT-SEASON SIGNAL', 'STRUCTURAL SHIFT'],
    pulse: ['QUICK READ', 'SIGNAL CHECK', 'MIDWEEK PULSE'],
    poll: ['ROOM CHECK', 'READING THE ROOM', 'PEER SIGNAL'],
    voicenote: ['INSIDER NOTE', 'OFF-RECORD', 'PEER ASIDE'],
    exclusive: ['WEEK AHEAD', 'INSIDER READ', 'FRONT-FOOT SIGNAL'],
  },
  world: {
    alert: ['STRUCTURAL SIGNAL', 'MACRO ALERT', 'TRANSMISSION RISK', 'GLOBAL PIVOT'],
    observation: ['PRINT OF THE DAY', 'CROSSOVER READ', 'POLICY SIGNAL', 'SECOND-ORDER READ'],
    pulse: ['MACRO PULSE', 'POLICY CHECK', 'SIGNAL OF THE WEEK'],
    poll: ['MACRO READ', 'POLICY POLL', 'PEER SIGNAL'],
    voicenote: ['INSIDER MACRO', 'WEEKEND READ', 'PEER ASIDE'],
    exclusive: ['WEEK AHEAD MACRO', 'INSIDER MACRO', 'FRONT-FOOT MACRO'],
  },
  capital: {
    alert: ['TREASURY ALERT', 'YIELD-CURVE SIGNAL', 'FUNDING WINDOW', 'LIQUIDITY READ'],
    observation: ['TREASURY READ', 'CAPITAL-MARKETS SIGNAL', 'ISSUANCE PRINT', 'CURRENCY-MIX SIGNAL'],
    pulse: ['CAPITAL PULSE', 'YIELD CHECK', 'TREASURY PULSE'],
    poll: ['TREASURY POLL', 'CAPITAL READ', 'PEER SIGNAL'],
    voicenote: ['INSIDER TREASURY', 'PEER ASIDE', 'OFF-DESK NOTE'],
    exclusive: ['WEEK AHEAD CAPITAL', 'FUNDING WINDOW', 'FRONT-FOOT TREASURY'],
  },
  growth: {
    alert: ['EXPANSION WINDOW', 'TIMING SIGNAL', 'STRUCTURAL OPENING'],
    observation: ['SPEED-OF-DEPLOYMENT', 'COMPETITIVE READ', 'INVESTMENT-CYCLE SIGNAL', 'FDI SHIFT'],
    pulse: ['GROWTH PULSE', 'TIMING CHECK', 'OPPORTUNITY PULSE'],
    poll: ['GROWTH POLL', 'PEER SIGNAL', 'TIMING READ'],
    voicenote: ['INSIDER GROWTH', 'PEER ASIDE', 'WEEKEND READ'],
    exclusive: ['WEEK AHEAD GROWTH', 'FRONT-FOOT EXPANSION', 'OPENING READ'],
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

// THEME-keyed paragraph pools (matches the detectTheme() taxonomy used by
// the banner composer). Each theme has 6–10 substantive paragraphs that
// frame the UAE/GCC strategic implication, naming a specific operational
// lever — treasury sleeve, hedge book, control matrix, capex pacing,
// supplier-mix, board agenda. The writing register is peer-CFO,
// confident, dry, observational — the same register as the hand-crafted
// seed posts.
//
// The composer picks one IMPLICATION + one STRATEGIC_CALL + one
// CROSS_CYCLE_TRUTH per article, rotated deterministically by article
// hash so the same signal always renders the same post.

const THEME_BRIDGES = {
  oil_energy: 'For UAE corporates routing through Jebel Ali, leaning on regional refining margins, or carrying logistics-heavy supply chains',
  compliance_risk: 'For UAE-regulated entities, DIFC and ADGM-licensed firms, and any group with downstream compliance exposure',
  treasury_capital: 'For UAE treasury teams, family offices managing multi-currency reserves, and CFOs sizing the next funding round',
  ai_tech: 'For UAE corporates running AI-capex roadmaps and treasury teams sizing long-duration debt programmes',
  geopolitics: 'For UAE corporates positioned across global trade corridors, energy channels, and cross-border funding lines',
  shipping_logistics: 'For UAE importers, logistics-exposed groups, and treasury teams sizing freight-impacted working capital',
  growth_expansion: 'For UAE founders, family offices mapping the next regional move, and CFOs reviewing expansion math',
  real_estate: 'For UAE developers, REIT operators, and any group with material real-estate-collateralised debt exposure',
  default: 'For UAE corporates positioned across the strategic transmission channels this signal opens',
};

const THEME_IMPLICATIONS = {
  oil_energy: [
    "The clock matters here. With energy prices repricing across the curve and freight risk re-pricing across regional logistics, fuel hedges set in the last quarter are well underwater and covenant headroom on energy- and logistics-exposed debt narrows quickly. The cash-flow stress test runs out faster than the news cycle suggests.",
    "Hedge accounting under IFRS 9 turns on whether the original economic logic still holds. With the underlying market this far from the strike, marking-to-market lands on quarterly P&L rather than OCI, and that distinction shows up in covenant calculations before it shows up in commentary.",
    "Freight insurance premiums are re-pricing faster than ocean-shipping spot rates. For UAE corporates running unhedged exposure to maritime supply chains, the second-order cost shows up in vendor pricing within 60 days, not in headline freight indices.",
    "Refining margins across the region are sensitive to crude differentials more than headline price. The firms re-running their landed-cost models against Brent–Dubai spreads, not just Brent, are the ones reading the signal correctly.",
    "Energy-shock pricing transmits through the regional non-oil economy via two channels: input costs to industry, and consumption demand via household budgets. Both move on a 30–60 day lag from the wellhead price, not a quarterly one.",
    "The OPEC+ production posture sets the floor, but disruption risk sets the ceiling. Scenario models that assume the floor is the relevant data point underprice the volatility CFOs actually have to manage against.",
  ],
  compliance_risk: [
    "The pressure is at enforcement level. Non-compliance can trigger supervisory action, financial sanctions, and reputational exposure that compounds across multiple supervisory cycles. The immediate work is two-fold: audit the client-facing trails touching transaction data or KYC-adjacent flows, then brief the audit committee on the customer-experience implications.",
    "Retroactive compliance is always more expensive than ahead-of-curve readiness. The firms that get caught mid-cycle pay in remediation costs, advisory fees, and management bandwidth that compounds across multiple quarters before the supervisory finding even closes.",
    "Audit-season exposure is built in the quarters before audit, not during. The documentation trail, the control evidence, and the governance posture all need to be in place ahead of the window, not assembled retroactively under examiner pressure.",
    "Controls drift quietly, and documentation either catches up to that drift or it does not. The gap shows up first in audit findings, then in penalty exposure, then in board-level conversations. The window to close it is always shorter than the rulebook suggests.",
    "Voluntary-disclosure regimes reward first movers and penalise the rest. The advantage of acting inside the disclosure window — before enforcement posture firms up — is usually material in both penalty avoidance and supervisory standing.",
    "Effective-date language matters here. Retroactive remediation is always more expensive than ahead-of-curve readiness. For groups with cross-border footprint, the documentation burden lands in finance and legal teams first, well before it reaches risk dashboards.",
    "Supervisory expectations are migrating across the GCC faster than commentary admits. The CBUAE, DFSA, and ADGM FSRA posture on this category continues to firm up; the relevant benchmark for the next cycle is the current cycle, not the prior one.",
  ],
  treasury_capital: [
    "Funding-mix reviews need a quarterly cadence in this environment, not an annual one. Issuance windows, deposit beta, and refinancing pipelines are moving faster than legacy treasury policy frameworks anticipate, and the cost of operating against last year's framework shows up in pricing within a single rate cycle.",
    "Treasury policy that was right for the last rate regime will not be right for the next twelve months. The yield environment, regulatory expectations, and funding-mix options have all shifted in ways that warrant a quarterly review with the board, not an annual one with the auditor.",
    "The cost of inaction on reserve structuring usually shows up too late. By the time the inefficiency is visible in the numbers, the optimal restructuring window has already closed, and the cost of catching up is materially higher than the cost of moving early.",
    "Yield-curve positioning is a board-level conversation now, not a treasury-desk one. The implications cross into capex pacing, dividend policy, and balance-sheet structuring in ways that touch every major capital-allocation decision in the cycle.",
    "Multi-currency funding has moved from fringe treasury tactic to mainstream board agenda. The JPY and CHF investor base is absorbing long-duration paper at acceptable spreads, and that opens a usable benchmark for any UAE issuer sizing programme against ADQ, Mubadala, or MoIAT pipelines.",
    "Sukuk issuance momentum continues to reward issuers who locked in early in the cycle. DIFC- and ADGM-listed paper is trading inside swap on relative-value terms across many tenors, and the spread reflects continued demand for hard-currency GCC sovereign and quasi-sovereign exposure.",
    "Private credit deployment in DIFC and ADGM continues to outpace bank lending for a second consecutive quarter. The alternative-credit sleeve is gaining structural share as bank balance sheets stay constrained — and the relative-value math for borrowers is shifting accordingly.",
  ],
  ai_tech: [
    "AI-capex restructuring is moving from operational planning into balance-sheet territory. Multi-currency funding programmes that absorb long-duration debt across JPY, CHF, EUR, and CAD prints are setting the benchmark for any large UAE issuer with industrial-financing pipeline ambitions.",
    "The signal underneath the headline capex number: long-duration debt is being absorbed at spreads that look manageable on the surface but compound across the maturity stack. CFOs sizing AI-related programmes need to model the refinancing path, not just the issuance window.",
    "For UAE corporates building agentic-AI capability into operating models, the capex math is now interleaved with operating-leverage assumptions. Decisions made in this cycle compound through the next investment cycle.",
    "Data-centre infrastructure investment in the region tracks both grid capacity and sovereign capital allocation. The firms reading both signals together get the timing math correct; the ones reading only the press releases miss the constraint.",
    "Chip supply chain volatility transmits into project finance through schedule risk, not just unit cost. CFOs working against industrial-strategy timelines should model schedule contingency at the high end, not the mid-point.",
  ],
  geopolitics: [
    "Global rule changes hit UAE balance sheets through three channels: rates, trade flows, and energy markets. Scenario planning that ignores any one of those underprices regional exposure, and the firms operating with current-cycle assumptions are the ones positioned when the flows arrive.",
    "Scenario planning that uses last cycle's assumptions underprices the regional transmission. The Gulf sits at the crossover of monetary, energy, and trade policy in ways that compound rather than offset across cycles.",
    "Multilateral policy turns translate into UAE compliance and treasury work faster than most expect. The time between announcement and operational impact has compressed materially in the last two cycles; the operating lead time is now weeks, not quarters.",
    "Capital flows respond to policy signals before they respond to underlying fundamentals. The firms reading the signal early are the ones positioned when the flows arrive — and the cost of reading late is usually visible in valuation, not in the income statement.",
    "Currency-mix, supplier-mix, and funding-mix all need a second look against this. The Gulf's role as a connector economy means transmission timing matters more than transmission magnitude; the firms positioned for the inflection capture both the upside and the optionality.",
    "Trade-corridor fragmentation is shifting GCC-Asia and GCC-Europe flows faster than legacy supplier frameworks anticipate. The procurement teams that haven't cycled through their top suppliers with revised assumptions are running on stale inputs.",
  ],
  shipping_logistics: [
    "Freight risk is re-pricing across regional logistics faster than commentary admits. For UAE importers and logistics-exposed groups, the operational read is to refresh landed-cost assumptions on a weekly cadence and pre-position for trapped working capital before the next quarter-end close.",
    "Procurement teams that have not cycled through their top suppliers with revised cost models in the last sixty days are running on stale assumptions. Tightening PO frequency, locking spot where contracts allow, and re-modelling landed cost on a USD basis are the table-stakes moves.",
    "Supply chain volatility transmits to UAE corporate margins through two channels: direct vendor pricing, and indirect competitive repositioning by faster-moving peers. Margin defence has to come from contract structure rather than from passing it forward.",
    "Logistics-side cost shocks compound when treasury and procurement run on different cadences. The firms aligning the two operating rhythms — weekly working-capital review against monthly procurement signoff — are the ones absorbing the shock without surprises at quarter-end.",
  ],
  growth_expansion: [
    "Mainland and free-zone setup choices get harder to reverse from here. The cost of restructuring later usually exceeds the cost of getting it right the first time, and the early-mover advantage compounds through the entire next investment cycle.",
    "Expansion timing in the UAE is structural, not opportunistic. The firms that map their next move now will be the ones executing while the rest are still in feasibility — and the gap between mapped and executing is where the alpha sits.",
    "Capital allocation across the next two quarters is where the differential return lives. Decisions made under the current setup compound through the entire next investment cycle, both for upside capture and for downside protection.",
    "Operating-model choices made now will define competitive position through the next investment cycle. The window for unforced structural decisions narrows quickly, and the cost of acting later is higher than the headline math suggests.",
    "For UAE family offices and growth-stage allocators, the operational rhythm question matters more than the thesis question right now. Speed of deployment, side-letter terms, and capacity allocation are where the real negotiating leverage lives.",
    "The transmission from cross-border policy shift to UAE advisory-room conversation is faster than most assume. The strategic repositioning has already started for those reading the signal correctly; the cost of confirmation bias is now visible in valuation gaps.",
  ],
  real_estate: [
    "Property-collateralised lending math shifts twice when supervisory expectations move: once on the loan-to-value assumption, and again on the capital charge applied to the residual exposure. The CFOs running ahead of both are the ones not caught in the next supervisory cycle.",
    "REIT operators carrying GCC retail and industrial exposure should re-stress dividend cover at the new rate baseline before the next quarterly board pack lands. The math compounds quickly under sustained refinancing pressure.",
    "Construction-phase financing assumptions made under the prior rate regime do not survive the next cycle untouched. The development pipelines being sized today should already reflect the higher cost of capital, not the legacy curve.",
  ],
  default: [
    "Global rule changes hit UAE balance sheets through three channels: rates, trade flows, and energy markets. Scenario planning that ignores any one of those underprices regional exposure across the next operating cycle.",
    "The transmission from announcement to advisory-room conversation is faster than most assume. The firms reading the signal early are the ones positioned when the flows arrive, not the ones playing catch-up at the next board pack.",
    "Operating-model choices made now will define competitive position through the next investment cycle. The window for unforced structural decisions narrows quickly when peer firms start moving on the same signal.",
  ],
};

const THEME_STRATEGIC_CALLS = {
  oil_energy: [
    "The firms re-running their hedge book against a sustained price baseline over a 30–90 day horizon, refreshing freight assumptions on a weekly cadence, and pre-positioning for trapped working capital are the ones that will not be surprised at quarter-end.",
    "Treasury teams should stress the working-capital cycle against a 20% input-cost shock and re-confirm covenant headroom on energy-exposed debt before the next quarterly close. The cost of doing this late is materially higher than the cost of doing it now.",
    "Procurement, treasury, and risk should be operating against the same baseline this cycle. The firms running aligned working-capital reviews on a weekly cadence are the ones absorbing the shock without surprises.",
  ],
  compliance_risk: [
    "Audit any client-facing trails that touch transaction data or KYC-adjacent flows. Migrate to compliant channels, brief the audit committee on customer-experience implications, and update the control matrix before the next supervisory cycle lands.",
    "Treat this as a control-matrix update, not a one-off remediation. The workpaper trail starts now, the documentation burden lands in finance and legal first, and the supervisory benchmark for next cycle is the current cycle.",
    "The firms moving inside the voluntary-disclosure window — before the enforcement posture firms up — are the ones that arrive at the next audit with cleaner standing and lower remediation cost.",
    "Read this alongside the existing control matrix, not in isolation. Refresh the risk register, lock the supervisory communication trail, and front-load the audit committee briefing before the cycle catches the firm cold.",
  ],
  treasury_capital: [
    "The sleeve worth modelling now: short-duration AED paper paired against medium-duration USD, with optionality on the funding-mix question. Reserve policies reviewed under a different rate regime are the ones most exposed to the next cycle's structural shift.",
    "Two things to watch this cycle: deposit beta on the AED side, and refinancing pipeline on the USD side. The relative-value question across UAE instruments keeps tightening, and the firms pre-positioning capture both the carry and the optionality.",
    "Funding-mix reviews should be on a quarterly cadence in this environment, not annual. The CFOs treating issuance windows, deposit beta, and refinancing as discrete monthly signals are the ones reading the curve correctly.",
    "For UAE issuers sizing programmes against sovereign or quasi-sovereign benchmarks, the multi-currency funding question is now structural rather than tactical. The currency-mix conversation belongs in the board pack, not the treasury desk note.",
  ],
  ai_tech: [
    "Treasury teams sizing long-duration AI-capex programmes against benchmark currencies should be modelling the refinancing path on a 5–10 year horizon, not just the issuance window. The spread compounds across the maturity stack.",
    "For UAE corporates building agentic-AI capability into operating models, the capex math is now interleaved with operating-leverage assumptions. The decisions made in this cycle compound through the next investment cycle, both ways.",
  ],
  geopolitics: [
    "Currency-mix, supplier-mix, and funding-mix all need a second look against this. Refresh scenario assumptions on a weekly cadence, watch the policy reaction rather than the price reaction, and align procurement and treasury on a single working-capital baseline.",
    "The firms re-running their assumptions at the new baseline, refreshing inputs on a weekly cadence, and pre-positioning for the transmission window are the ones that will not be surprised at quarter-end.",
    "Energy markets and policy markets are coupled more than the headlines admit. The CFOs reading both signals together — and refreshing their cross-border treasury structure accordingly — are the ones positioned for the inflection.",
  ],
  shipping_logistics: [
    "Procurement teams should cycle through their top 20 suppliers with revised cost models inside 30 days, tighten PO frequency, lock spot where contracts allow, and re-model landed cost on a USD basis. Hoping it passes is not the move.",
    "The firms aligning treasury and procurement operating rhythms — weekly working-capital review against monthly procurement signoff — are the ones absorbing the shock without quarter-end surprises.",
  ],
  growth_expansion: [
    "Refresh the bench of GPs and partners being tracked, revisit the timing assumptions in the commitment plan, and pre-position the operating model for the faster cycle. The firms adapting to the new rhythm pull more GCC capital faster than the ones holding the old framework.",
    "Founders running feasibility on the GCC just got a cleaner input variable. Models built on prior-cycle economics should be refreshed against the current setup before the next board meeting.",
    "The early movers are not waiting for confirmation. The strategic repositioning has already started for those reading the signal correctly — the cost of reading late shows up first in valuation, then in capital availability.",
  ],
  real_estate: [
    "REIT operators and developers should stress-test dividend cover and refinancing assumptions at the new rate baseline before the next quarterly board pack. The math compounds quickly under sustained pressure.",
  ],
  default: [
    "The firms re-running their assumptions at the new baseline, refreshing inputs on a weekly cadence, and pre-positioning for the transmission window are the ones that will not be surprised at quarter-end.",
    "Read this alongside the current operating plan, not in isolation. The implications cross into capex pacing, treasury structure, and board-agenda items that take more than one cycle to reposition.",
  ],
};

// Cross-cycle truth — one or two-sentence wisdom that closes the strategic
// reading. Theme-keyed but kept generic enough to apply to most signals
// inside the theme. Comes right before the observational closer.
const CROSS_CYCLE_TRUTHS = {
  oil_energy: [
    "Energy shocks transmit through balance sheets faster than they transmit through headlines. The firms reading the curve early are the ones not caught at quarter-end.",
    "Hedge books built for the last cycle are the most expensive ones to carry into the next one. The repositioning math doesn't get easier from here.",
  ],
  compliance_risk: [
    "Audit-season exposure is built in the quarters before audit, not during. The documentation trail, the control evidence, and the governance posture all need to be in place ahead of the window.",
    "Retroactive compliance is always more expensive than ahead-of-curve readiness. The cost of moving inside the supervisory window is materially lower than the cost of catching up after the first finding.",
  ],
  treasury_capital: [
    "Treasury policy that was right for the last rate regime will not be right for the next twelve months. Quarterly review is the operating cadence now, not annual.",
    "Funding-mix decisions made under stale assumptions show up in pricing within a single rate cycle. The cost of running on last year's framework compounds quickly.",
  ],
  ai_tech: [
    "Capex programmes sized in this cycle compound through the next investment cycle. The decisions made now define competitive position for years, not quarters.",
  ],
  geopolitics: [
    "Global rule changes hit UAE balance sheets through three channels: rates, trade flows, and energy markets. Scenario planning that ignores any one of those underprices regional exposure.",
    "Capital flows respond to policy signals before they respond to underlying fundamentals. Reading the signal early is the differential — confirmation bias is the cost.",
  ],
  shipping_logistics: [
    "Supply-side cost shocks compound when treasury and procurement run on different cadences. The firms aligning the two operating rhythms are the ones absorbing the shock without surprises.",
  ],
  growth_expansion: [
    "Expansion timing in the UAE is structural, not opportunistic. The firms mapping their next move now are the ones executing while the rest are still in feasibility.",
    "Mainland and free-zone setup choices get harder to reverse from here. The cost of restructuring later usually exceeds the cost of getting it right the first time.",
  ],
  real_estate: [
    "Property-collateralised lending math shifts twice when supervisory expectations move: once on LTV, and again on the capital charge. CFOs running ahead of both are the ones not caught in the next supervisory cycle.",
  ],
  default: [
    "Global rule changes hit UAE balance sheets through three channels: rates, trade flows, and energy markets. Scenario planning that ignores any one of those underprices regional exposure.",
    "The transmission from announcement to advisory-room conversation is faster than most assume. The firms reading the signal early are the ones positioned when the flows arrive.",
  ],
};

// Legacy room-keyed pools — kept for backward compatibility with any code
// path that still references them, but the active composition path uses
// the theme-keyed pools above.
const IMPLICATIONS = {
  risk: THEME_IMPLICATIONS.compliance_risk,
  world: THEME_IMPLICATIONS.geopolitics,
  capital: THEME_IMPLICATIONS.treasury_capital,
  growth: THEME_IMPLICATIONS.growth_expansion,
};
const STRATEGIC_CALLS = {
  risk: THEME_STRATEGIC_CALLS.compliance_risk,
  world: THEME_STRATEGIC_CALLS.geopolitics,
  capital: THEME_STRATEGIC_CALLS.treasury_capital,
  growth: THEME_STRATEGIC_CALLS.growth_expansion,
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
/**
 * Generate the post caption in Claude-style peer-CFO prose.
 *
 * Dispatches by post type:
 *   alert / observation / exclusive  → 6-paragraph structured analysis
 *   pulse                            → short 3-line micro-post
 *   poll                             → question + 4 answer options
 *   voicenote                        → personal insider aside (4 paragraphs)
 *
 * All variants use the same theme-keyed paragraph pools and seeded RNG
 * (article URL hash) so the same signal always renders the same post.
 */
function generatePost(picked, dayIndex) {
  const { item, plan, room } = picked;
  const roomMeta = ROOMS[room];
  const date = todayLong();

  // Awaiting-signal placeholder — kept terse on purpose
  if (!item) {
    return `${date}.

No signal cleared the strategic-signal threshold for the ${roomMeta.label.toLowerCase()} room at the cutoff for this slot. Rather than serve recycled commentary, the slot is held until something worth flagging lands.

Open the Intelligence Feed inside the app and use the AI Brief flow on any live item to produce a polished post on demand.

${pickByDay(CLOSERS, dayIndex)}
`;
  }

  // Dispatch to the type-specific generator. Each one uses the same
  // theme-keyed paragraph pools, just composes them differently.
  switch (plan.type) {
    case 'pulse':     return generatePulsePost(picked, dayIndex);
    case 'poll':      return generatePollPost(picked, dayIndex);
    case 'voicenote': return generateVoicenotePost(picked, dayIndex);
    case 'exclusive': return generateExclusivePost(picked, dayIndex);
    case 'alert':
    case 'observation':
    default:          return generateStructuredPost(picked, dayIndex);
  }
}

/**
 * STANDARD STRUCTURED POST — alert / observation / default
 * 6 paragraphs: date → fact → UAE implication → strategic call →
 * cross-cycle truth → observational closer.
 */
function generateStructuredPost(picked, dayIndex) {
  const { item, room } = picked;
  const theme = detectTheme(item, room);
  const date = todayLong();
  const seed = hashString(`${item.url || ''}::${item.title || ''}::${room}::${dayIndex}`);
  const rng = seededRng(seed);

  const opener = `${date}.`;
  const factPara = buildFactParagraph(item);
  const bridge = THEME_BRIDGES[theme.key] || THEME_BRIDGES.default;
  const themeImplication = pickSeeded(THEME_IMPLICATIONS[theme.key] || THEME_IMPLICATIONS.default, rng);
  const regionalRead = `${bridge}, the strategic read lands ahead of where headline coverage catches it. ${themeImplication}`;
  const strategicCall = pickSeeded(THEME_STRATEGIC_CALLS[theme.key] || THEME_STRATEGIC_CALLS.default, rng);
  const crossCycleTruth = pickSeeded(CROSS_CYCLE_TRUTHS[theme.key] || CROSS_CYCLE_TRUTHS.default, rng);
  const closer = pickSeeded(CLOSERS, rng);

  return `${opener}

${factPara}

${regionalRead}

${strategicCall}

${crossCycleTruth}

${closer}
`;
}

/**
 * PULSE POST — short midweek micro-read, 200–400 chars.
 * Date + tight fact + cross-cycle one-liner + closer.
 */
function generatePulsePost(picked, dayIndex) {
  const { item, room } = picked;
  const theme = detectTheme(item, room);
  const date = todayLong();
  const seed = hashString(`pulse::${item.url || ''}::${room}::${dayIndex}`);
  const rng = seededRng(seed);

  const topic = cleanFact(item.title);
  const stat = extractStat(item.title) || extractStat(item.description) || '';
  const statTag = stat ? ` *${stat}*.` : '';
  const truth = pickSeeded(CROSS_CYCLE_TRUTHS[theme.key] || CROSS_CYCLE_TRUTHS.default, rng);
  const closer = pickSeeded(CLOSERS, rng);

  const frames = [
    `*${date}.*\n\n${topic}.${statTag} Quiet on the wire, louder underneath.\n\n${truth}\n\n${closer}`,
    `*${date}.*\n\n${topic}.${statTag} Second-order effects matter more than the headline here.\n\n${truth}\n\n${closer}`,
    `*${date}.*\n\n${topic}.${statTag} The kind of move that prices in slowly.\n\n${truth}\n\n${closer}`,
    `*${date}.*\n\n${topic}.${statTag} Filing this before the cycle catches up.\n\n${truth}\n\n${closer}`,
    `*${date}.*\n\n${topic}.${statTag} The window for ahead-of-curve positioning narrows from here.\n\n${truth}\n\n${closer}`,
  ];

  return pickSeeded(frames, rng) + '\n';
}

/**
 * POLL POST — engagement post with a CFO question + 4 answer options.
 * Options are graded by readiness so they feel like answers a CFO would
 * actually pick.
 */
function generatePollPost(picked, dayIndex) {
  const { item, room } = picked;
  const date = todayLong();
  const seed = hashString(`poll::${item.url || ''}::${room}::${dayIndex}`);
  const rng = seededRng(seed);

  const topic = cleanFact(item.title);
  const stat = extractStat(item.title) || extractStat(item.description) || '';
  const statTag = stat ? ` *${stat}*.` : '';

  const questions = {
    risk: [
      'Where is your team on this one?',
      'How prepared is the audit committee for this?',
      'How does this read against your current control matrix?',
    ],
    capital: [
      'How is your treasury positioned for this?',
      'What does this do to your funding-mix conversation?',
      'Where does this land in your reserve policy review?',
    ],
    growth: [
      'How does this shift your expansion math?',
      'What does this open for your next allocation cycle?',
      'Where does this land in your feasibility queue?',
    ],
    world: [
      'How are you reading the transmission to the GCC?',
      'What does this change in your scenario plan?',
      'Where does this land in your cross-border structuring conversation?',
    ],
  };

  const options = {
    risk: [
      'Already aligned — control matrix updated',
      'In progress — audit committee briefed',
      'Aware but not started',
      'Hearing about this first time',
    ],
    capital: [
      'Restructured in the last six months',
      'Reviewing but not moved yet',
      'Comfortable with current allocation',
      'Not on the agenda yet',
    ],
    growth: [
      'Already moving on this',
      'Reviewing but waiting for clarity',
      'Consolidating current positions first',
      'New, not yet evaluated',
    ],
    world: [
      'Already adjusted regional positioning',
      'Monitoring closely, ready to pivot',
      'Still assessing the impact',
      "Don't see direct exposure",
    ],
  };

  const question = pickSeeded(questions[room] || questions.world, rng);
  const opts = options[room] || options.world;
  const letters = ['A', 'B', 'C', 'D'];
  const closer = pickSeeded(CLOSERS, rng);

  return `*${date}.*

${topic}.${statTag}

${question}

${opts.map((o, i) => `${letters[i]}. ${o}`).join('\n')}

${closer}
`;
}

/**
 * VOICENOTE POST — personal insider aside. Weekend register: 4 paragraphs,
 * personal opener, lighter on the strategic-call structure.
 */
function generateVoicenotePost(picked, dayIndex) {
  const { item, room } = picked;
  const theme = detectTheme(item, room);
  const date = todayLong();
  const seed = hashString(`voicenote::${item.url || ''}::${room}::${dayIndex}`);
  const rng = seededRng(seed);

  const personalOpeners = [
    'Quick thought before the week starts.',
    'Something crossed the desk this weekend.',
    "Been turning this over since it landed.",
    "Sharing this here first — not making a big public thing of it.",
    "One I want to put in front of this group early.",
    "Quiet observation while the rest of the cycle catches up.",
  ];
  const opener = pickSeeded(personalOpeners, rng);

  const topic = cleanFact(item.title);
  const stat = extractStat(item.title) || extractStat(item.description) || '';
  const statLine = stat ? ` *${stat}* is the figure that stayed with me.` : '';
  const themeImplication = pickSeeded(THEME_IMPLICATIONS[theme.key] || THEME_IMPLICATIONS.default, rng);
  const truth = pickSeeded(CROSS_CYCLE_TRUTHS[theme.key] || CROSS_CYCLE_TRUTHS.default, rng);
  const closer = pickSeeded(CLOSERS, rng);

  return `*${date}.*

${opener}

${topic}.${statLine}

${themeImplication}

${truth}

${closer}
`;
}

/**
 * EXCLUSIVE / WEEK-AHEAD POST — Sunday format. Frames the signal as
 * what's coming next week, with a confident insider tone.
 */
function generateExclusivePost(picked, dayIndex) {
  const { item, room } = picked;
  const theme = detectTheme(item, room);
  const date = todayLong();
  const seed = hashString(`exclusive::${item.url || ''}::${room}::${dayIndex}`);
  const rng = seededRng(seed);

  const openers = [
    'Setting the tone for the week.',
    'Top of mind heading into the new week.',
    'The signal worth carrying into Monday.',
    'Filing the week-ahead read.',
    "What I'd watch through the next five trading days.",
  ];
  const opener = pickSeeded(openers, rng);

  const factPara = buildFactParagraph(item);
  const bridge = THEME_BRIDGES[theme.key] || THEME_BRIDGES.default;
  const themeImplication = pickSeeded(THEME_IMPLICATIONS[theme.key] || THEME_IMPLICATIONS.default, rng);
  const strategicCall = pickSeeded(THEME_STRATEGIC_CALLS[theme.key] || THEME_STRATEGIC_CALLS.default, rng);
  const truth = pickSeeded(CROSS_CYCLE_TRUTHS[theme.key] || CROSS_CYCLE_TRUTHS.default, rng);
  const closer = pickSeeded(CLOSERS, rng);

  return `*${date}.*

${opener}

${factPara}

${bridge}, the strategic implication lands ahead of where headline coverage catches it. ${themeImplication}

${strategicCall}

${truth}

${closer}
`;
}

/**
 * Build the fact paragraph. Uses the article description's first
 * substantive sentence when available; falls back to the title.
 * Strips source-publication leaks and HTML entity artifacts.
 */
function buildFactParagraph(item) {
  const fact = cleanFact(item.title);
  const description = (item.description || '').replace(/&#8230;|&hellip;|…/g, '').slice(0, 500).trim();

  // Try to find the best sentence in the description: prefer one with
  // a number, a UAE/GCC reference, or a named regulator/organization.
  let factPara = fact;
  if (description.length > 60) {
    const sentences = description.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && s.length < 320);
    if (sentences.length > 0) {
      // Score sentences: number/% +3, UAE/GCC ref +2, regulator +2, long-enough +1
      const scored = sentences.map(s => {
        let score = 1;
        if (/\d+[\d,.]*\s*(%|million|billion|trillion|bn|m\b)/i.test(s)) score += 3;
        if (/\b(uae|dubai|abu dhabi|emirates|gulf|gcc|saudi|qatar|bahrain|oman|kuwait|difc|adgm)\b/i.test(s)) score += 2;
        if (/\b(cbuae|fta|mof|dfsa|mohre|moiat|sec|fed|ecb|oecd|imf|opec)\b/i.test(s)) score += 2;
        if (s.length > 120 && s.length < 240) score += 1;
        return { s, score };
      });
      scored.sort((a, b) => b.score - a.score);
      factPara = scored[0].s;
    }
  }

  // Strip source-publication name leaks. The body never names the news outlet —
  // the link preview handles attribution.
  factPara = factPara
    .replace(/\b(reuters|bloomberg|cnbc|ft\.com|wall street journal|wsj|forbes|al jazeera|the national|gulf news|khaleej times|arabian business|zawya|agbi|meed|mondaq|lexology|bbc|guardian|associated press|\bap\b|economymiddleeast|gulf business)\b\s*[:,—–]?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:]+/, '')
    .trim();

  if (factPara && !/[.!?]$/.test(factPara)) factPara += '.';
  return factPara;
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

// Photo library — substantially expanded (60+ photos) covering every theme
// likely to appear in UAE/GCC financial intelligence: oil & energy,
// shipping & logistics, treasury & banking, compliance & regulation, AI &
// data centres, real estate & construction, aviation, retail & consumer,
// healthcare & pharma, telecoms, industrial / manufacturing, agriculture,
// tourism & hospitality, geopolitics, EU / climate, UAE / Dubai skyline,
// India / emerging-market growth, sovereign / family-office capital.
//
// Each photo is tagged with the SPECIFIC concepts it actually depicts so
// the matcher can pick a photo that visibly relates to the article topic,
// not just a same-room generic.
const PHOTOS = [
  // ── OIL · ENERGY · GAS · REFINING ──────────────────────────────
  { url: U('photo-1513828583688-c52646db42da'), tags: ['oil', 'refinery', 'petroleum', 'opec', 'brent', 'crude', 'energy', 'industrial'] },
  { url: U('photo-1532601224476-15c79f2f7a51'), tags: ['pipeline', 'oil', 'gas', 'lng', 'energy', 'industrial'] },
  { url: U('photo-1610283003415-9d99b6d3d2cb'), tags: ['oil pump', 'drilling', 'oil rig', 'petroleum', 'opec'] },
  { url: U('photo-1497435334941-8c899ee9e8e9'), tags: ['offshore', 'platform', 'oil rig', 'gas'] },

  // ── SHIPPING · PORTS · LOGISTICS · MARITIME ────────────────────
  { url: U('photo-1494412574643-ff11b0a5eb19'), tags: ['container', 'shipping', 'cargo', 'freight', 'port', 'hormuz', 'jebel ali', 'logistics', 'maritime', 'trade'] },
  { url: U('photo-1521295121783-8a321d551ad2'), tags: ['shipping', 'port', 'tanker', 'logistics', 'cargo', 'maritime'] },
  { url: U('photo-1577416412292-747c6607f055'), tags: ['cargo ship', 'tanker', 'shipping', 'maritime', 'sea'] },
  { url: U('photo-1494412519320-aa613dfb7738'), tags: ['port', 'cranes', 'shipping', 'logistics', 'container'] },

  // ── TREASURY · BANKING · GOLD · CAPITAL · TRADING ──────────────
  { url: U('photo-1618044733300-9472054094ee'), tags: ['gold', 'bars', 'wealth', 'reserve', 'treasury', 'capital'] },
  { url: U('photo-1611974789855-9c2a0a7236a3'), tags: ['finance', 'abstract', 'markets', 'capital', 'bonds'] },
  { url: U('photo-1554224155-8d04cb21cd6c'), tags: ['trading', 'screens', 'stock', 'markets', 'bonds', 'bloomberg'] },
  { url: U('photo-1560520653-9e0e4c89eb11'), tags: ['stock', 'exchange', 'trading', 'ipo', 'listing', 'capital'] },
  { url: U('photo-1556742049-0cfed4f6a45d'), tags: ['bank', 'vault', 'banking', 'finance', 'cbuae', 'central bank'] },
  { url: U('photo-1601597111158-2fceff292cdc'), tags: ['bank building', 'banking', 'cbuae', 'institutional', 'columns'] },
  { url: U('photo-1607863680198-23d4b2565df0'), tags: ['sukuk', 'islamic finance', 'middle east', 'architecture'] },
  { url: U('photo-1579532537598-459ecdaf39cc'), tags: ['currency', 'dollar', 'cash', 'fx', 'forex'] },
  { url: U('photo-1607863680151-8c8a86eafc02'), tags: ['family office', 'wealth management', 'private banking'] },

  // ── COMPLIANCE · REGULATION · GAVEL · LEGAL · CYBER ────────────
  { url: U('photo-1454165804606-c3d57bc86b40'), tags: ['documents', 'legal', 'compliance', 'audit', 'tax', 'paperwork'] },
  { url: U('photo-1589829545856-d10d557cf95f'), tags: ['gavel', 'law', 'regulation', 'court', 'legal', 'enforcement', 'penalty'] },
  { url: U('photo-1550751827-4bd374c3f58b'), tags: ['security', 'lock', 'cyber', 'data', 'whatsapp', 'protection', 'privacy'] },
  { url: U('photo-1633265486064-086b219458ec'), tags: ['shield', 'security', 'digital', 'governance', 'protection'] },
  { url: U('photo-1554224154-26032ffc0d07'), tags: ['tax', 'documents', 'accounting', 'vat', 'fta', 'returns'] },
  { url: U('photo-1450101499163-c8848c66ca85'), tags: ['contract', 'signing', 'deal', 'legal', 'agreement'] },
  { url: U('photo-1505664063603-28e48ca204eb'), tags: ['audit', 'paperwork', 'accountant', 'financial review'] },
  { url: U('photo-1521791136064-7986c2920216'), tags: ['handshake', 'deal', 'agreement', 'mou', 'partnership'] },
  { url: U('photo-1589994965851-a8f479c573a9'), tags: ['parliament', 'government', 'policy', 'regulation'] },

  // ── AI · TECHNOLOGY · DATA CENTRES · CHIPS ─────────────────────
  { url: U('photo-1677442136019-21780ecad995'), tags: ['ai', 'artificial-intelligence', 'machine learning', 'llm'] },
  { url: U('photo-1518770660439-4636190af475'), tags: ['circuit', 'chip', 'semiconductor', 'gpu', 'silicon', 'capex'] },
  { url: U('photo-1504868584819-f8e8b4b6d7e3'), tags: ['server', 'data-center', 'datacenter', 'infrastructure', 'cloud'] },
  { url: U('photo-1488229297570-58520851e868'), tags: ['network', 'data', 'cloud', 'digital'] },
  { url: U('photo-1620712943543-bcc4688e7485'), tags: ['ai chip', 'agentic ai', 'robot', 'automation'] },

  // ── UAE · DUBAI · ABU DHABI · GCC SKYLINE ──────────────────────
  { url: U('photo-1512453979798-5ea266f8880c'), tags: ['dubai', 'skyline', 'uae', 'difc', 'city'] },
  { url: U('photo-1518684079-3c830dcef090'), tags: ['dubai marina', 'towers', 'real-estate', 'residential'] },
  { url: U('photo-1582407947092-47f5835e3a28'), tags: ['abu dhabi', 'skyline', 'uae', 'adgm'] },
  { url: U('photo-1547483238-f400e65ccd56'), tags: ['dubai aerial', 'city', 'infrastructure', 'uae'] },
  { url: U('photo-1546412414-e1885259563a'), tags: ['burj khalifa', 'dubai', 'landmark', 'tourism'] },
  { url: U('photo-1572252009286-268acec5ca0a'), tags: ['saudi arabia', 'riyadh', 'ksa', 'middle east'] },

  // ── REAL ESTATE · CONSTRUCTION · INFRASTRUCTURE ────────────────
  { url: U('photo-1496568816309-51d7c20e3b21'), tags: ['sunrise', 'real-estate', 'skyline', 'growth'] },
  { url: U('photo-1545324418-cc1a3fa10c00'), tags: ['building', 'architecture', 'real-estate', 'commercial'] },
  { url: U('photo-1479839672679-a46483c0e7c8'), tags: ['construction', 'crane', 'development', 'infrastructure'] },
  { url: U('photo-1503387762-592deb58ef4e'), tags: ['residential', 'housing', 'real-estate', 'apartments'] },

  // ── AVIATION · AIRPORTS · AIRLINES ─────────────────────────────
  { url: U('photo-1436491865332-7a61a109db05'), tags: ['airplane', 'aviation', 'airline', 'travel', 'flynas', 'emirates airline', 'etihad'] },
  { url: U('photo-1556388158-158ea5ccacbd'), tags: ['airport', 'terminal', 'aviation', 'travel'] },
  { url: U('photo-1569154941061-e231b4725ef1'), tags: ['airline', 'airplane', 'jet', 'aviation', 'fleet'] },

  // ── RETAIL · CONSUMER · F&B ────────────────────────────────────
  { url: U('photo-1481437156560-3205f6a55735'), tags: ['retail', 'shopping mall', 'store', 'cenomi', 'alshaya', 'consumer'] },
  { url: U('photo-1567521464027-f127ff144326'), tags: ['shopping', 'retail', 'consumer goods', 'storefront'] },
  { url: U('photo-1568901346375-23c9450c58cd'), tags: ['food', 'restaurant', 'hospitality', 'beverage'] },

  // ── HEALTHCARE · PHARMA · BIOTECH ──────────────────────────────
  { url: U('photo-1579684385127-1ef15d508118'), tags: ['healthcare', 'medical', 'pharma', 'science', 'hospital'] },
  { url: U('photo-1576091160550-2173dba999ef'), tags: ['lab', 'research', 'science', 'biotech', 'pharmaceutical'] },

  // ── TELECOMS · 5G · INFRASTRUCTURE ─────────────────────────────
  { url: U('photo-1551193658-3bd7c4ef1ad8'), tags: ['cell tower', '5g', 'telecom', 'antenna', 'wireless'] },

  // ── INDUSTRIAL · MANUFACTURING ─────────────────────────────────
  { url: U('photo-1565793298595-6a879b1d9492'), tags: ['factory', 'manufacturing', 'industrial', 'moiat', 'production'] },
  { url: U('photo-1556761175-b413da4baf72'), tags: ['warehouse', 'logistics', 'industrial', 'storage'] },
  { url: U('photo-1581094271901-8022df4466f9'), tags: ['steel', 'metals', 'commodities', 'mining'] },

  // ── EU · CBAM · CLIMATE · RENEWABLES ───────────────────────────
  { url: U('photo-1466611653911-95081537e5b7'), tags: ['wind turbine', 'renewable', 'green energy', 'cbam', 'climate'] },
  { url: U('photo-1474314170901-f351b68f544f'), tags: ['solar', 'renewable', 'green', 'climate', 'eu', 'ets'] },
  { url: U('photo-1497436072909-60f360e1d4b1'), tags: ['nature', 'climate', 'esg', 'sustainability'] },

  // ── GEOPOLITICS · WORLD · TRADE · MAPS ─────────────────────────
  { url: U('photo-1451187580459-43490279c0fa'), tags: ['earth', 'space', 'global', 'satellite', 'planet'] },
  { url: U('photo-1526778548025-fa2f459cd5c1'), tags: ['world map', 'digital', 'global', 'network'] },
  { url: U('photo-1558618666-fcd25c85f82e'), tags: ['network', 'connections', 'global', 'macro'] },
  { url: U('photo-1446776811953-b23d57bd21aa'), tags: ['earth', 'atmosphere', 'global', 'climate'] },

  // ── INDIA · EMERGING MARKETS · GROWTH ──────────────────────────
  { url: U('photo-1524492412937-b28074a5d7da'), tags: ['india', 'mumbai', 'emerging markets', 'sebi', 'asia'] },
  { url: U('photo-1592978615499-bd0e64c8fbd9'), tags: ['family office', 'private equity', 'investment', 'allocation'] },
  { url: U('photo-1486406146926-c627a92ad1ab'), tags: ['office tower', 'corporate', 'business', 'india'] },

  // ── BIG TECH · CORPORATE · FORTUNE 500 ─────────────────────────
  { url: U('photo-1560179707-f14e90ef3623'), tags: ['corporate', 'headquarters', 'tech', 'alphabet', 'amazon', 'big tech'] },
  { url: U('photo-1497366216548-37526070297c'), tags: ['office', 'modern', 'corporate', 'startup', 'workplace'] },
];

const ROOM_FALLBACK_TAGS = {
  growth: ['dubai', 'skyline', 'corporate', 'growth', 'business', 'india', 'emerging markets'],
  capital: ['gold', 'finance', 'trading', 'capital', 'markets', 'bonds', 'treasury', 'bank'],
  risk: ['security', 'compliance', 'legal', 'cyber', 'governance', 'enforcement', 'gavel'],
  world: ['earth', 'global', 'network', 'trade', 'shipping', 'macro', 'satellite'],
};

// ENTITY → IMPLIED TAGS map. When an article's title or description names
// a specific company / regulator / topic, this map injects the right
// visual tags into the matcher so the photo VISIBLY relates to the
// subject — not just to a same-room generic.
//
// Pattern key matches regexp-style against the article text (case-insensitive).
const ENTITY_TAGS = [
  // Airlines / aviation
  { test: /\b(flynas|emirates airline|etihad|saudia|qatar airways|gulf air|riyadh air|flydubai)\b/i,
    tags: ['airplane', 'aviation', 'airline'] },
  { test: /\b(boeing|airbus|aerospace|aircraft order|fleet|airport)\b/i,
    tags: ['aviation', 'airplane', 'airport'] },

  // Retail / consumer
  { test: /\b(cenomi|alshaya|americana|landmark group|chalhoub|majid al futtaim|emaar mall|mall of)\b/i,
    tags: ['retail', 'shopping', 'consumer goods'] },

  // Banking / central banks
  { test: /\b(cbuae|central bank of (the )?uae)\b/i,
    tags: ['bank', 'banking', 'cbuae', 'central bank'] },
  { test: /\b(saudi central bank|sama|qatar central bank|bahrain central bank)\b/i,
    tags: ['bank', 'banking', 'central bank'] },
  { test: /\b(emirates nbd|first abu dhabi bank|fab|adcb|enbd|adib|mashreq|dib|dubai islamic)\b/i,
    tags: ['bank', 'banking'] },

  // Regulators / tax / compliance
  { test: /\b(dfsa|adgm fsra|fta|federal tax authority|moiat|mohre|mof|ministry of finance|sec|cma|sebi)\b/i,
    tags: ['gavel', 'regulation', 'legal', 'compliance'] },
  { test: /\b(aml|kyc|sanction|enforcement|penalty|fine|breach|violation)\b/i,
    tags: ['gavel', 'compliance', 'legal', 'enforcement'] },
  { test: /\b(audit|tax|vat|pillar 2|dmtt|einvoic|emiratisation)\b/i,
    tags: ['tax', 'accounting', 'audit', 'paperwork'] },

  // Energy / oil / commodities
  { test: /\b(brent|wti|crude|opec|oil price|oil rally|oil shock|barrel|petroleum)\b/i,
    tags: ['oil', 'refinery', 'petroleum', 'crude'] },
  { test: /\b(natural gas|lng|pipeline|aramco|adnoc|qatar energy)\b/i,
    tags: ['pipeline', 'gas', 'energy', 'industrial'] },
  { test: /\b(refinery|refining|downstream)\b/i,
    tags: ['refinery', 'industrial', 'petroleum'] },

  // Shipping / logistics / supply chain
  { test: /\b(shipping|cargo|freight|container|tanker|maritime|hormuz|red sea|suez|jebel ali|port)\b/i,
    tags: ['shipping', 'cargo', 'container', 'maritime', 'port'] },
  { test: /\b(supply chain|supplier|procurement|logistics)\b/i,
    tags: ['shipping', 'logistics', 'cargo'] },

  // Treasury / capital markets / debt
  { test: /\b(sukuk|islamic bond|islamic finance|sharia)\b/i,
    tags: ['sukuk', 'islamic finance', 'bonds'] },
  { test: /\b(bond|treasury|yield|coupon|spread|debut issuance|tap)\b/i,
    tags: ['bonds', 'trading', 'finance'] },
  { test: /\b(ipo|listing|adx|dfm|tadawul|nasdaq dubai)\b/i,
    tags: ['stock', 'exchange', 'ipo', 'listing'] },
  { test: /\b(rate|interest rate|federal reserve|fed|ecb|cbuae rate|repo)\b/i,
    tags: ['trading', 'bank', 'markets'] },
  { test: /\b(currency|fx|forex|dirham|dollar|yen|euro)\b/i,
    tags: ['currency', 'fx', 'dollar'] },
  { test: /\b(family office|private credit|private equity|alternative|allocator)\b/i,
    tags: ['family office', 'wealth management', 'private banking'] },

  // AI / Big Tech / chips
  { test: /\b(ai|artificial intelligence|machine learning|llm|genai|generative ai|agentic)\b/i,
    tags: ['ai', 'artificial-intelligence', 'machine learning'] },
  { test: /\b(nvidia|amd|tsmc|chip|semiconductor|gpu|silicon)\b/i,
    tags: ['chip', 'semiconductor', 'gpu', 'silicon'] },
  { test: /\b(data centre|data center|hyperscaler|cloud capex)\b/i,
    tags: ['server', 'data-center', 'datacenter', 'infrastructure'] },
  { test: /\b(alphabet|google|amazon|microsoft|meta|apple|big tech)\b/i,
    tags: ['big tech', 'corporate', 'tech'] },

  // Real estate / construction
  { test: /\b(real estate|reit|property|residential|commercial|construction|mortgage|emaar|aldar|damac|sobha)\b/i,
    tags: ['real-estate', 'building', 'construction', 'commercial'] },

  // Healthcare / pharma
  { test: /\b(pharma|drug|biotech|healthcare|hospital|nmc|aster|burjeel)\b/i,
    tags: ['healthcare', 'pharma', 'medical', 'hospital'] },

  // Telecoms
  { test: /\b(telecom|5g|du|etisalat|stc|zain|fiber|broadband)\b/i,
    tags: ['cell tower', '5g', 'telecom'] },

  // Industrial / manufacturing
  { test: /\b(factory|manufacturing|industrial|steel|aluminium|aluminum|emirates global aluminium|ega)\b/i,
    tags: ['factory', 'manufacturing', 'industrial', 'steel'] },

  // EU / CBAM / climate
  { test: /\b(cbam|ets|carbon|emission|net zero|esg|climate)\b/i,
    tags: ['wind turbine', 'solar', 'climate', 'renewable'] },

  // India / emerging markets
  { test: /\b(india|sebi|mumbai|bangalore|hyderabad|tata|reliance|adani)\b/i,
    tags: ['india', 'emerging markets', 'mumbai'] },

  // UAE / Dubai / Abu Dhabi context
  { test: /\b(dubai|burj|difc|jbr|deira)\b/i,
    tags: ['dubai', 'skyline', 'uae'] },
  { test: /\b(abu dhabi|adgm|adq|mubadala)\b/i,
    tags: ['abu dhabi', 'uae', 'adgm'] },

  // Messaging / communications platforms
  { test: /\b(whatsapp|telegram|signal|imessage|sms|messaging app)\b/i,
    tags: ['cyber', 'security', 'data', 'protection', 'whatsapp'] },

  // Sovereign wealth / state capital
  { test: /\b(pif|public investment fund|sovereign wealth|aramco ipo)\b/i,
    tags: ['gold', 'wealth', 'family office', 'capital'] },

  // Crypto / digital assets
  { test: /\b(bitcoin|crypto|blockchain|stablecoin|token|exchange listing|coinbase|binance)\b/i,
    tags: ['ai', 'digital', 'cloud', 'cyber'] },

  // Tourism / hospitality / events
  { test: /\b(hospitality|hotel|tourism|world expo|cop|conference|summit|trade show)\b/i,
    tags: ['burj khalifa', 'dubai', 'tourism', 'landmark'] },

  // Sports / entertainment finance
  { test: /\b(saudi pro league|liv golf|sports finance|f1|fifa|sponsorship)\b/i,
    tags: ['saudi arabia', 'middle east', 'tourism'] },
];

/**
 * Find best-matching photo for an article. Three-tier matching:
 *
 *   Tier 1 — ENTITY: Scan the article for known entities (regulators,
 *            companies, topics). Photos matching those entity tags get
 *            a heavy +5 score boost.
 *   Tier 2 — KEYWORD: Score photos by overlap between their tags and
 *            the article's title + description + topic field.
 *   Tier 3 — ROOM FALLBACK: If no photo scores above zero, use any
 *            photo tagged with the room's fallback themes.
 *
 * Returns the photo URL plus an optional diagnostic string showing
 * which entities triggered which tags — useful for verifying matches.
 */
function pickPhoto(picked) {
  const { item, room } = picked;
  const roomMeta = ROOMS[room];

  const topicText = item
    ? `${item.title || ''} ${item.description || ''} ${item.topic || ''}`
    : roomMeta.label;
  const lower = topicText.toLowerCase();
  const words = lower.split(/[\s,.\-/()]+/).filter(w => w.length > 2);

  // Tier 1 — Collect entity-implied tags
  const entityTags = new Set();
  const matchedEntities = [];
  for (const ent of ENTITY_TAGS) {
    if (ent.test.test(topicText)) {
      matchedEntities.push(ent.test.source.replace(/\\b|\(|\)|\?:/g, '').slice(0, 50));
      ent.tags.forEach(t => entityTags.add(t));
    }
  }

  // Score every photo
  const scored = PHOTOS.map((p, idx) => {
    let score = 0;
    let entityHit = false;
    for (const tag of p.tags) {
      // Entity-implied tag — heavy weight
      if (entityTags.has(tag)) { score += 5; entityHit = true; }
      // Direct phrase match in article text
      if (lower.includes(tag)) score += 3;
      // Word-level match
      for (const w of words) {
        if (tag === w) score += 1.5;
        else if (tag.includes(w) || w.includes(tag)) score += 0.6;
      }
      // Room affinity bonus (small — entity/keyword should dominate)
      if (ROOM_FALLBACK_TAGS[room].includes(tag)) score += 0.3;
    }
    return { url: p.url, score, idx, entityHit, tags: p.tags };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  const best = scored[0];

  // Diagnostic log — visible in the GitHub Actions output so we can
  // verify each banner is getting a topically-relevant photo
  if (item) {
    const title = (item.title || '').slice(0, 60);
    console.log(`  [photo] ${title} → ${best.tags.slice(0, 3).join('/')} (score ${best.score.toFixed(1)}${matchedEntities.length ? `, entities: ${matchedEntities.slice(0, 2).join('|')}` : ''})`);
  }

  if (best.score > 0) return best.url;

  // Tier 3 — Room fallback
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
    <!-- darken: gentle bottom-up scrim. Keeps the top 60% of the photo
         bright and only darkens the lower 40% just enough for text. The
         old version was 0.55–0.98 which buried the photo entirely. -->
    <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#06060f" stop-opacity="0.08"/>
      <stop offset="55%" stop-color="#06060f" stop-opacity="0.15"/>
      <stop offset="78%" stop-color="#06060f" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.85"/>
    </linearGradient>
    <!-- textScrim: tight bottom-half scrim used by layouts that need a
         stronger contrast band specifically behind the headline + stat
         block, without darkening the photo's hero zone. -->
    <linearGradient id="textScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#06060f" stop-opacity="0"/>
      <stop offset="40%" stop-color="#06060f" stop-opacity="0.50"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.90"/>
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

// PHOTO CASTS — much subtler color shifts now. The previous matrices were
// crushing 30-45% of each channel, which destroyed photo vibrancy. These
// preserve the original photo and just add a small theme tint. The hero
// photo should remain the dominant visual; the tint is mood, not mask.
const PHOTO_CASTS = {
  'warm-amber':      { r: [0.98, 0.05, 0.0], g: [0.02, 0.92, 0.02], b: [0.0,  0.02, 0.85], gamma: [0.95, 0.97, 1.0] },
  'cool-red':        { r: [1.00, 0.02, 0.02], g: [0.02, 0.88, 0.02], b: [0.0,  0.02, 0.88], gamma: [0.95, 0.97, 0.97] },
  'gold-premium':    { r: [0.98, 0.05, 0.0], g: [0.05, 0.95, 0.02], b: [0.0,  0.02, 0.85], gamma: [0.95, 0.97, 1.0] },
  'cyber-blue':      { r: [0.85, 0.0,  0.05], g: [0.0,  0.92, 0.05], b: [0.05, 0.05, 1.05], gamma: [0.97, 0.97, 0.9] },
  'cool-cinematic':  { r: [0.88, 0.0,  0.05], g: [0.0,  0.95, 0.05], b: [0.05, 0.05, 1.02], gamma: [0.97, 0.97, 0.95] },
  'sea-cool':        { r: [0.80, 0.02, 0.08], g: [0.02, 0.92, 0.08], b: [0.05, 0.05, 1.0],  gamma: [0.97, 0.97, 0.95] },
  'warm-vibrant':    { r: [0.95, 0.10, 0.05], g: [0.05, 0.98, 0.05], b: [0.02, 0.05, 0.85], gamma: [0.95, 0.95, 0.97] },
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
    <!-- darken: gentle bottom-up scrim. Keeps the top 60% of the photo
         bright and only darkens the lower 40% just enough for text. The
         old version was 0.55–0.98 which buried the photo entirely. -->
    <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#06060f" stop-opacity="0.08"/>
      <stop offset="55%" stop-color="#06060f" stop-opacity="0.15"/>
      <stop offset="78%" stop-color="#06060f" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.85"/>
    </linearGradient>
    <!-- textScrim: tight bottom-half scrim used by layouts that need a
         stronger contrast band specifically behind the headline + stat
         block, without darkening the photo's hero zone. -->
    <linearGradient id="textScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#06060f" stop-opacity="0"/>
      <stop offset="40%" stop-color="#06060f" stop-opacity="0.50"/>
      <stop offset="100%" stop-color="#06060f" stop-opacity="0.90"/>
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

    const typeMeta = POST_TYPE_LABELS[picked.plan.type] || POST_TYPE_LABELS.observation;
    manifestPosts.push({
      n,
      slug,
      slot: { day: picked.plan.day, time: picked.plan.slot },
      framework: FRAMEWORK_LABELS[picked.plan.framework] || picked.plan.framework,
      postType: picked.plan.type,
      typeLabel: typeMeta.label,
      typeIcon: typeMeta.icon,
      typeAccent: typeMeta.accent,
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
