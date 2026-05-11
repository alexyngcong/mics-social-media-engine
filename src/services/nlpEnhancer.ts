/**
 * NLP ENHANCER — Browser-side NLP layer for richer content generation
 *
 * Wraps compromise.js (free, MIT, ~80KB gzipped) to give the content engine
 * sharper raw material than regex alone can extract:
 *
 *   - Organizations: detects "Ministry of Finance" as a single entity, not 3 words
 *   - Money: parses "AED 18 billion" / "USD 4.9 billion" / "$3.2B" cleanly
 *   - Dates: detects "effective April 1, 2026" → tags as a deadline candidate
 *   - Sentences: real sentence boundaries (regex .split() misses abbreviations)
 *
 * Failure mode: every function falls back to a safe default if compromise
 * throws, so this never breaks the generation pipeline.
 *
 * ZERO API CALLS — runs entirely client-side.
 */

import nlp from 'compromise';

export interface ExtractedFacts {
  organizations: string[];
  people: string[];
  places: string[];
  dates: string[];
  money: string[];
  percentages: string[];
  numbers: string[];
  topSentence: string;
  /** True if the text contains effective-date / deadline language */
  hasDeadlineLanguage: boolean;
}

const EMPTY: ExtractedFacts = {
  organizations: [],
  people: [],
  places: [],
  dates: [],
  money: [],
  percentages: [],
  numbers: [],
  topSentence: '',
  hasDeadlineLanguage: false,
};

const DEADLINE_RE = /\b(effective|deadline|comes into force|enters into force|by\s+\w+\s+\d|from\s+\w+\s+\d|due\s+\w+\s+\d|expires?\s+\w+\s+\d)/i;

/**
 * Extract a structured set of facts from a block of text.
 * Returns empty arrays on parse failure (never throws).
 */
export function extractFacts(text: string): ExtractedFacts {
  if (!text || typeof text !== 'string') return EMPTY;
  try {
    const doc = nlp(text);
    return {
      organizations: doc.organizations().out('array') as string[],
      people: doc.people().out('array') as string[],
      places: doc.places().out('array') as string[],
      dates: doc.dates().out('array') as string[],
      money: doc.money().out('array') as string[],
      percentages: doc.match('#Percent').out('array') as string[],
      numbers: doc.numbers().out('array') as string[],
      topSentence: (doc.sentences().first().out('text') as string) || text.slice(0, 200),
      hasDeadlineLanguage: DEADLINE_RE.test(text),
    };
  } catch {
    return { ...EMPTY, topSentence: text.slice(0, 200) };
  }
}

/**
 * Find the most "headline-worthy" monetary token in text.
 * Prefers large values (longest token tends to be most specific).
 */
export function findHeadlineMoney(text: string): string | null {
  if (!text) return null;
  try {
    const money = nlp(text).money().out('array') as string[];
    if (money.length === 0) return null;
    // Heuristic: longest token = most specific (e.g., "AED 18 billion" beats "AED 18")
    return money.sort((a, b) => b.length - a.length)[0].trim();
  } catch {
    return null;
  }
}

/**
 * Find the most "headline-worthy" percentage in text.
 */
export function findHeadlinePercent(text: string): string | null {
  if (!text) return null;
  try {
    const pcts = nlp(text).match('#Percent').out('array') as string[];
    if (pcts.length === 0) return null;
    return pcts[0].trim();
  } catch {
    return null;
  }
}

/**
 * Detect the primary UAE regulator/organization mentioned in text.
 * Uses compromise's organization() detection plus a UAE-specific
 * normalisation layer (since compromise doesn't know about FTA, MoHRE, etc.).
 */
export function detectPrimaryOrg(text: string): string | null {
  if (!text) return null;
  const blob = text.toLowerCase();

  // UAE-specific entities (compromise won't recognise these as orgs)
  const UAE_ORGS: Array<{ aliases: RegExp; canonical: string }> = [
    { aliases: /\b(ministry of finance|mof)\b/, canonical: 'Ministry of Finance' },
    { aliases: /\b(federal tax authority|fta)\b/, canonical: 'Federal Tax Authority' },
    { aliases: /\bdfsa\b/, canonical: 'DFSA' },
    { aliases: /\badgm\b/, canonical: 'ADGM' },
    { aliases: /\bdifc\b/, canonical: 'DIFC' },
    { aliases: /\b(cbuae|central bank of the uae)\b/, canonical: 'CBUAE' },
    { aliases: /\b(mohre|ministry of human resources|emiratisation)\b/, canonical: 'MoHRE' },
    { aliases: /\b(moiat|ministry of industry)\b/, canonical: 'MoIAT' },
    { aliases: /\b(sca|securities and commodities authority)\b/, canonical: 'SCA' },
    { aliases: /\bwam\b/, canonical: 'WAM' },
  ];

  for (const { aliases, canonical } of UAE_ORGS) {
    if (aliases.test(blob)) return canonical;
  }

  // Fall back to compromise's generic org detection
  try {
    const orgs = nlp(text).organizations().out('array') as string[];
    if (orgs.length > 0) return orgs[0];
  } catch { /* ignore */ }

  return null;
}

/**
 * Smart sentence boundary detection — beats regex `.split(/[.!?]/)` because
 * it understands abbreviations ("Mr.", "U.S.", "etc.") and decimal numbers.
 */
export function smartFirstSentence(text: string, maxLen = 200): string {
  if (!text) return '';
  try {
    const first = nlp(text).sentences().first().out('text') as string;
    if (first && first.length > 0 && first.length <= maxLen * 1.5) return first;
  } catch { /* fall through */ }
  // Fallback: take up to first .!? or maxLen
  const stop = text.search(/[.!?]\s/);
  return stop > 20 ? text.slice(0, stop + 1) : text.slice(0, maxLen);
}

/**
 * Build a "key facts" line for an article — short comma-separated list of
 * the most important entities. Useful as a sub-paragraph in executive briefs.
 *
 * Example output: "Ministry of Finance, AED 18 billion, April 2026"
 */
export function buildFactStrip(text: string): string {
  if (!text) return '';
  const facts = extractFacts(text);
  const tokens: string[] = [];

  // Primary org first (most informative)
  if (facts.organizations.length > 0) tokens.push(facts.organizations[0]);

  // Top money/percent
  if (facts.money.length > 0) tokens.push(facts.money[0]);
  else if (facts.percentages.length > 0) tokens.push(facts.percentages[0]);

  // First date if it looks like an effective date
  if (facts.dates.length > 0 && facts.hasDeadlineLanguage) {
    tokens.push(facts.dates[0]);
  }

  return tokens.filter(Boolean).slice(0, 3).join(', ');
}
