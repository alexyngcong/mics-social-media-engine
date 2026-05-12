/**
 * SHARED CONTENT POOLS — single source of truth for both the React app
 * (calendar / in-app generation) AND the Node-side weekly kit builder.
 *
 * This module exists because the calendar's generation flow and the
 * weekly kit's generation flow MUST produce identical-feeling content
 * for the same article. Previously they used two completely separate
 * paragraph pools (room-keyed vs theme-keyed) and the user saw inconsistent
 * results between the two surfaces.
 *
 * Everything below is plain ESM and intentionally avoids React /
 * TypeScript-only syntax in the data so the Node builder can also import
 * it (via a tiny compatibility shim in build-weekly-kit.mjs).
 */
import type { RoomId } from '../types';

// ─── THEME taxonomy ─────────────────────────────────────────────
// 8 themes drive paragraph pool selection. Detection is regex-based
// against the article's title + description + topic field.

export type ThemeKey =
  | 'oil_energy'
  | 'compliance_risk'
  | 'treasury_capital'
  | 'ai_tech'
  | 'geopolitics'
  | 'shipping_logistics'
  | 'growth_expansion'
  | 'real_estate'
  | 'default';

interface ThemeDef {
  test: RegExp;
  label: string;
}

const THEME_DEFS: Record<Exclude<ThemeKey, 'default'>, ThemeDef> = {
  oil_energy: { test: /\b(oil|brent|wti|crude|petroleum|opec|gas|pipeline|hormuz|refin|barrel)\b/i, label: 'ENERGY' },
  compliance_risk: { test: /\b(penalty|fine|sanction|enforce|aml|compliance|tax|audit|deadline|breach|violation|prosecution|einvoic|emiratisation)\b/i, label: 'REGULATORY' },
  treasury_capital: { test: /\b(bond|sukuk|yield|rate|treasury|capital|liquidity|hedge|reserve|currency|fx|coupon|spread)\b/i, label: 'TREASURY' },
  ai_tech: { test: /\b(ai|artificial intelligence|machine learning|gpu|chip|semiconductor|data center|datacenter|capex|cloud|llm)\b/i, label: 'TECH' },
  geopolitics: { test: /\b(tariff|trade war|export control|geopolit|brics|alliance|conflict|war|nato|asean|opec)\b/i, label: 'GEOPOLITICS' },
  shipping_logistics: { test: /\b(shipping|port|cargo|freight|logistic|supply chain|container|maritime|jebel ali|adnoc)\b/i, label: 'LOGISTICS' },
  growth_expansion: { test: /\b(ipo|listing|funding|investment|expand|growth|family office|allocate|deploy|venture|series|round)\b/i, label: 'GROWTH' },
  real_estate: { test: /\b(real estate|property|mortgage|construction|infrastructure|reit|residential|commercial)\b/i, label: 'REAL ESTATE' },
};

const ROOM_FALLBACK: Record<RoomId, ThemeKey> = {
  growth: 'growth_expansion',
  capital: 'treasury_capital',
  risk: 'compliance_risk',
  world: 'geopolitics',
};

export interface DetectedTheme {
  key: ThemeKey;
  label: string;
}

export function detectTheme(
  text: string | undefined,
  room: RoomId,
): DetectedTheme {
  const haystack = String(text || '');
  for (const [key, def] of Object.entries(THEME_DEFS) as Array<[Exclude<ThemeKey, 'default'>, ThemeDef]>) {
    if (def.test.test(haystack)) return { key, label: def.label };
  }
  const fallback = ROOM_FALLBACK[room] || 'geopolitics';
  return { key: fallback, label: THEME_DEFS[fallback as Exclude<ThemeKey, 'default'>].label };
}

// ─── PARAGRAPH POOLS ────────────────────────────────────────────
// Mirrors the build-weekly-kit.mjs pools exactly. Any change here
// must be reflected there (until they import this module directly).

export const THEME_BRIDGES: Record<ThemeKey, string> = {
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

export const THEME_IMPLICATIONS: Record<ThemeKey, string[]> = {
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

export const THEME_STRATEGIC_CALLS: Record<ThemeKey, string[]> = {
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

export const CROSS_CYCLE_TRUTHS: Record<ThemeKey, string[]> = {
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

export const CLOSERS: string[] = [
  "Let's stay close to this one.",
  "Filing this and watching.",
  "On the watchlist from here.",
  "One to keep on the radar.",
  "More to come as the picture fills in.",
  "Let's see how the next read lands.",
  "Picture should sharpen in the coming weeks.",
  "Keeping eyes on the next signal.",
];

// Optional extra paragraphs — included only when the post is in LONG mode.
// Each one is a tactical follow-through that deepens the strategic call
// without restating it. Theme-keyed so the extra content reads on-topic.
export const THEME_EXTRAS: Record<ThemeKey, string[]> = {
  oil_energy: [
    "Two transmission paths worth tracking specifically. First, hedge counterparty risk: at sustained current pricing the back-of-book trades stop being theoretical and start showing up as margin calls. Second, freight-rate stickiness: spot rates have moved but contract rates lag, and that gap shows up in landed cost over the next 60 days.",
    "The historical playbook says one thing, the structure of this disruption says another. Closed-strait scenarios used to mean a 4-6 week premium that decayed; the current pattern suggests a structural floor 30-40% above pre-disruption baseline, which is a different cash-flow problem to model against.",
    "Inside the GCC, the divergence is already visible. Producers with vertically-integrated logistics absorb the shock; net importers carry it. UAE corporates running mixed exposure should be modelling both sides of that split, not just the headline price.",
  ],
  compliance_risk: [
    "Two follow-through items belong on next week's audit-committee agenda. First, the documentation review: every workpaper that touches the affected control area should be re-examined under the new posture, not just the ones that prompted the change. Second, the third-party perimeter: vendor agreements that reference the prior framework need a formal update before the next renewal cycle.",
    "Voluntary disclosure timing is its own decision tree. The window typically narrows fastest in the four weeks after the supervisory communication lands; firms moving early stand inside it cleanly, firms moving late find the calculus shifts in the regulator's favour. The cost-of-action math is sharpest in the first thirty days.",
    "Cross-border groups face an extra layer here. The same control matrix that satisfies one jurisdiction can fail in another after a regulatory shift like this. The firms running a single global control matrix with jurisdiction-specific overlays are positioned better than the ones running parallel matrices that haven't been reconciled in two cycles.",
  ],
  treasury_capital: [
    "The duration question deserves a separate working session. Issuance windows for both AED and USD paper are opening at unusual angles right now, and the firms running comprehensive maturity-stack modelling are picking up basis points the desks are missing. The trade is real; the work is finding the slot.",
    "Two operational tweaks pay for themselves quickly here. First, weekly cash-flow forecasts in place of monthly — the volatility profile rewards the shorter cadence. Second, a quarterly board-pack treasury section that explicitly maps issuance windows to capex pacing, not just to refinancing pipeline. The decision-cadence catches the cycle.",
    "Family offices with private-credit exposure have a parallel set of questions. The same dynamic that's pushing public-market sukuk spreads tighter is opening private deal margins wider for borrowers who shopped early. Allocators with capacity in mandates with 60-day-or-less funding windows are seeing the cleanest cuts.",
  ],
  ai_tech: [
    "Two structural items belong in the next capex board pack. First, the refinancing path for any tranche maturing inside the next 24 months — the cost-of-capital math shifts more than the issuance discussion typically acknowledges. Second, the cross-currency funding question: groups that can issue in two or three currencies have an optionality the single-currency issuers don't.",
    "Data-centre infrastructure cost curves are running ahead of the capex models built two quarters ago. The firms refreshing total-cost-of-ownership numbers against current grid pricing — not against indexed assumptions — are the ones whose capex committee discussions actually move decisions forward.",
  ],
  geopolitics: [
    "Three transmission channels worth modelling explicitly. Rates: the policy reaction precedes the price reaction by 30-60 days. Trade: corridor reshaping is faster than tariff coverage suggests. Energy: regional differentials matter more than headline price. CFOs aligning planning around all three see the inflection sooner than CFOs tracking just one.",
    "Capital-flow shifts tell the cleanest story here. The dollar volume rotating across regions in the four weeks after a policy turn typically forecasts the operational impact a quarter ahead of policy implementation. The firms reading the flow signal — not just the announcement — get the timing right.",
    "GCC-Asia and GCC-Europe corridors deserve separate scenario tracks now. The trade math, the funding math, and the regulatory math are all moving at different speeds, and the firms running a single 'rest-of-world' scenario are pricing the wrong risk.",
  ],
  shipping_logistics: [
    "The procurement-treasury operating-rhythm question is doing more work than it usually does in this environment. Weekly working-capital reviews instead of monthly catch the timing of supplier repricing cycles. The CFOs aligning the two functions on a single calendar are the ones absorbing the shock without surprise.",
    "Contract structure carries more weight than spot pricing right now. Firms with rolling short-cycle PO frameworks are absorbing the move at near-current rates; firms locked into annual price commitments are carrying margin compression for two to three quarters. The right structure varies by category — there's no single answer.",
  ],
  growth_expansion: [
    "Two operational rhythm shifts make the difference between mapped and executing. First, weekly partner-pipeline reviews instead of quarterly — the deal flow signals are tighter than legacy cadence catches. Second, a 30-day commitment window for the GP bench, with a fast pass-through to operating-team capacity. The firms running this rhythm convert more of the funnel.",
    "Side-letter negotiating leverage is its own asset class now. The funds that compress launch cycles can grant terms that previously required scarcity premium. Allocators with capacity sized for the faster cycle pick up the best terms before they normalise across the market.",
  ],
  real_estate: [
    "Two stress-tests belong on the next development-committee agenda. First, dividend cover under sustained higher rates, modelled across an 18-month window. Second, refinancing scenarios that assume the supervisory benchmark — not the historical curve — is the relevant data point. Both arrive at the same conclusion faster than legacy assumptions suggest.",
  ],
  default: [
    "Two operational follow-throughs deserve dedicated attention this cycle. First, the timing-window question — most strategic responses to this kind of signal have a 30-60 day optimal window, and the cost of acting late is consistently higher than the cost of moving early. Second, the cross-functional alignment piece — finance, ops, and risk should be working from the same scenario assumptions, not parallel ones.",
    "The transmission timeline is faster than the framework assumes. The firms operating against the current-cycle baseline — not the prior-cycle one — are picking up advantage that compounds across the next two quarterly board cycles.",
  ],
};

// LENGTH MODES drive how many paragraphs the composer emits. Seeded per
// article so the same article always renders at the same length, but
// across a week the kit produces a mix of ~500ch (short), ~800ch (medium),
// and ~1100ch (long) posts for natural variation.
export type LengthMode = 'short' | 'medium' | 'long';

export function pickLengthMode(seedString: string): LengthMode {
  const h = hashString(seedString + '::length');
  const bucket = h % 100;
  if (bucket < 30) return 'short';   // 30% short
  if (bucket < 70) return 'medium';  // 40% medium
  return 'long';                      // 30% long
}

// ─── HASH + SEEDED RNG (deterministic per-article output) ────────

export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return Math.abs(h) >>> 0;
}

export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSeeded<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── TITLE + FACT BUILDERS ──────────────────────────────────────

export function cleanArticleTitle(title: string): string {
  return String(title || '')
    // Strip "Title:" / "Headline:" / "Breaking:" label prefixes
    .replace(/^(title|headline|breaking|update|news)\s*[:\-]\s*/gi, '')
    // Strip trailing news-outlet attribution
    .replace(/\s*[-|–—]\s*(Reuters|Bloomberg|CNBC|FT|WSJ|Forbes|Al Jazeera|The National|Gulf News|Khaleej Times|Arabian Business|Zawya|AGBI|MEED|Mondaq|Lexology|BBC|Guardian|Associated Press|AP|Economy Middle East|Gulf Business|Argaam)\s*$/i, '')
    .replace(/\s*\([^)]{1,40}\)\s*$/, '')
    .trim();
}

/**
 * Build the WhatsApp-bold post title that appears at the top of every
 * generated caption. Kept under 95 characters so it doesn't wrap awkwardly
 * in WhatsApp preview.
 */
export function buildPostTitle(item: { title?: string } | null | undefined): string {
  if (!item || !item.title) return '';
  let t = cleanArticleTitle(item.title);
  if (t.length > 95) {
    const cut = t.slice(0, 92);
    const lastSpace = cut.lastIndexOf(' ');
    t = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + '…';
  }
  return `*${t}*`;
}

/**
 * Score article-description sentences and return the one most likely to be
 * useful as the fact paragraph. Prefers sentences with numbers, UAE/GCC
 * references, or named regulators / orgs.
 */
export function buildFactParagraph(item: { title?: string; description?: string }): string {
  const fact = cleanArticleTitle(item.title || '');
  const description = String(item.description || '')
    .replace(/&#8230;|&hellip;|…/g, '')
    .slice(0, 500)
    .trim();

  let factPara = fact;
  if (description.length > 60) {
    const sentences = description.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && s.length < 320);
    if (sentences.length > 0) {
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

  factPara = factPara
    .replace(/\b(reuters|bloomberg|cnbc|ft\.com|wall street journal|wsj|forbes|al jazeera|the national|gulf news|khaleej times|arabian business|zawya|agbi|meed|mondaq|lexology|bbc|guardian|associated press|\bap\b|economymiddleeast|gulf business)\b\s*[:,—–]?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:]+/, '')
    .trim();
  if (factPara && !/[.!?]$/.test(factPara)) factPara += '.';
  return factPara;
}

// ─── DATE HELPERS ───────────────────────────────────────────────

export function todayLongEN(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── 6-PARAGRAPH STRUCTURED POST COMPOSER ───────────────────────
// The canonical Claude-style structure used by BOTH the calendar's
// in-app generation and the weekly kit's server-side generation.
// Output is identical for the same article.

export interface ComposeContext {
  item: { title?: string; description?: string; url?: string };
  room: RoomId;
  postTypeId?: string;  // used only to vary seed slightly per type
}

export function composeStructuredPost(ctx: ComposeContext): string {
  const { item, room, postTypeId = 'observation' } = ctx;
  const theme = detectTheme(`${item.title || ''} ${item.description || ''}`, room);

  const seedString = `${item.url || ''}::${item.title || ''}::${room}::${postTypeId}`;
  const seed = hashString(seedString);
  const rng = seededRng(seed);

  const date = todayLongEN();
  const factPara = buildFactParagraph(item);
  const bridge = THEME_BRIDGES[theme.key];
  const implication = pickSeeded(THEME_IMPLICATIONS[theme.key], rng);
  const strategicCall = pickSeeded(THEME_STRATEGIC_CALLS[theme.key], rng);
  const crossCycleTruth = pickSeeded(CROSS_CYCLE_TRUTHS[theme.key], rng);
  const closer = pickSeeded(CLOSERS, rng);
  // The card UI already shows the title separately as the card heading.
  void buildPostTitle;

  // LENGTH MODE — seeded per article so the same article always renders
  // at the same length, but across a week the kit shows variety:
  //   short:  ~500 ch, 4 paragraphs (no cross-cycle truth, no extras)
  //   medium: ~800 ch, 5 paragraphs (current baseline)
  //   long:   ~1100 ch, 6 paragraphs (adds a tactical follow-through extra)
  const mode = pickLengthMode(seedString);
  const extra = pickSeeded(THEME_EXTRAS[theme.key] || THEME_EXTRAS.default, rng);

  if (mode === 'short') {
    return `${date}.

${factPara}

${bridge}, the strategic read lands ahead of where headline coverage catches it. ${implication}

${strategicCall}

${closer}
`;
  }

  if (mode === 'long') {
    return `${date}.

${factPara}

${bridge}, the strategic read lands ahead of where headline coverage catches it. ${implication}

${strategicCall}

${extra}

${crossCycleTruth}

${closer}
`;
  }

  // medium (default)
  return `${date}.

${factPara}

${bridge}, the strategic read lands ahead of where headline coverage catches it. ${implication}

${strategicCall}

${crossCycleTruth}

${closer}
`;
}
