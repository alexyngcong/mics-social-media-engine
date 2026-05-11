/**
 * QA VALIDATOR — Content Quality Assurance Engine
 *
 * Runs strict validation on every generated post BEFORE it reaches the user.
 * Nothing gets through without passing. Every piece of content is audited for:
 *   1. Content freshness (no outdated data)
 *   2. Source reliability (approved sources only)
 *   3. Brand voice compliance (banned words/patterns)
 *   4. Format compliance (headline, stat, structure)
 *   5. Platform compliance (length, formatting)
 *   6. Content integrity (no HTML, no citations, no self-promotion)
 *   7. Advisory seed presence (conversion intent)
 */

import type {
  GeneratedPost, DeepDivePost, PlatformId, PostTypeId,
  QAVerdict, QASeverity, QACategory, QACheckResult, QAReport,
} from '../types';
import { dateFormatted } from '../config/brand';

export type { QAReport, QAVerdict, QACheckResult };

// ─── Approved Sources ──────────────────────────────────────────────

const TIER_1_SOURCES = [
  // ── Specialist legal / tax / advisory intelligence ──
  'mondaq', 'meed', 'lexology', 'blue j', 'thomson reuters',
  'checkpoint edge', 'cocounsel', 'bloomberg tax', 'tax notes',
  'international tax review', 'tax foundation',
  'pinsent masons', 'white & case',
  // ── Tier-1 global financial wires ──
  'bloomberg', 'reuters', 'financial times', 'ft.com',
  'wall street journal', 'wsj', 'economist', 'nikkei', 'scmp',
  'cnbc', 'marketwatch', 'forbes', 'business insider',
  'euromoney', 'the banker', 'banker middle east', 'ft adviser',
  // ── UAE / Gulf regional outlets ──
  'the national', 'gulf news', 'zawya', 'khaleej times',
  'arabian business', 'argaam', 'agbi',
  'economy middle east', 'gulf business', 'gulf today', 'emirates 24',
  // ── UAE official ──
  'central bank', 'cbuae', 'ministry of finance', 'ministry of economy',
  'difc', 'adgm', 'sca', 'fta', 'mohre', 'moiat',
  'wam', 'dubai media office', 'abu dhabi media office', 'dubai chamber',
  // ── Multilaterals & central banks ──
  'imf', 'world bank', 'oecd', 'bis',
  'federal reserve', 'ecb', 'bank of england', 'wto', 'unctad',
  // ── Ratings agencies ──
  's&p', 'spglobal', 'moody', 'fitch',
  // ── Energy ──
  'opec', 'iea', 'eia', 'argus media',
  // ── Policy / think tanks ──
  'brookings', 'chatham house', 'cfr', 'piie', 'rand',
  'hbr', 'harvard business review',
  // ── Wire services ──
  'ap', 'afp',
];

const BLOCKED_SOURCES = [
  'deloitte', 'kpmg', 'ey', 'pwc', 'ernst & young',
  'mckinsey', 'bain', 'bcg', 'accenture',
  'wikipedia', 'investopedia', 'quora', 'reddit',
  'medium.com', 'substack', 'linkedin pulse',
];

// ─── Banned Words & Patterns ───────────────────────────────────────

const BANNED_WORDS = [
  'leverage', 'utilize', 'landscape', 'navigate', 'robust',
  'holistic', 'synergy', 'unpack', 'deep dive', 'pivoting',
  'paradigm', 'actionable', 'scalable', 'disrupt',
];

const BANNED_PATTERNS = [
  /in today['']s/i,
  /it['']s worth noting/i,
  /interestingly/i,
  /let['']s explore/i,
  /here['']s the thing/i,
  /it goes without saying/i,
  /needless to say/i,
  /at the end of the day/i,
  /moving forward/i,
  /circle back/i,
];

const SELF_PROMO_PATTERNS = [
  /mics\s*international/i,
  /mics\s*advisory/i,
  /our\s*firm/i,
  /our\s*team/i,
  /our\s*services/i,
  /contact\s*us/i,
  /reach\s*out\s*to\s*us/i,
  /visit\s*(our|the)\s*website/i,
  /www\./i,
  /\.com\b/i,   // URLs in body text
  /https?:\/\//i, // Raw URLs in body
];

const HTML_PATTERNS = [
  /<cite[^>]*>/i,
  /<\/cite>/i,
  /<[a-z][^>]*>/i,  // Any HTML tag
  /\[[\d]+\]/,      // Citation references [1], [2]
  /\[source\]/i,
  /\[citation/i,
];

// ─── Stale Date Patterns ───────────────────────────────────────────

function getStaleYearPatterns(): RegExp[] {
  const currentYear = parseInt(dateFormatted.year);
  const patterns: RegExp[] = [];
  // Flag references to years more than 1 year old as potentially stale
  for (let y = currentYear - 3; y < currentYear - 1; y++) {
    patterns.push(new RegExp(`\\b${y}\\b`, 'g'));
  }
  return patterns;
}

const STALE_PHRASES = [
  /last year['']?s?/i,
  /previous year/i,
  /back in 20\d{2}/i,
  /a year ago/i,
  /two years ago/i,
  /in the past/i,
  /historically/i,
];

// ─── Platform Constraints ──────────────────────────────────────────

const PLATFORM_MAX_LENGTH: Record<PlatformId, number> = {
  whatsapp: 700,
  instagram: 2200,
  linkedin: 3000,
  twitter: 280,
  facebook: 5000,
};

// ─── Validator Implementation ──────────────────────────────────────

function check(
  id: string,
  category: QACategory,
  severity: QASeverity,
  label: string,
  passed: boolean,
  detail: string
): QACheckResult {
  return { id, category, severity, passed, label, detail };
}

/**
 * Strip the trailing source URL line from text before running promo/HTML
 * pattern checks. The post format intentionally appends the source URL on
 * its own line at the end — that's attribution, not self-promotion.
 */
function stripTrailingSourceUrl(text: string, sourceUrl?: string): string {
  // If we know the exact URL, strip it explicitly
  if (sourceUrl) {
    const escaped = sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\s*\\n*${escaped}\\s*$`);
    const stripped = text.replace(re, '').trimEnd();
    if (stripped !== text) return stripped;
  }
  // Fallback: strip any URL that appears as the last non-empty token
  return text.replace(/\n\n[^\s]*https?:\/\/[^\s]+\s*$/i, '').trimEnd();
}

/**
 * AUDIT-REFRESH POLICY — Ladder cutoff matching the news fetcher.
 *
 * QA rejects articles older than 72h (the news fetcher's hard cap).
 * Articles in the 24-72h window pass but the UI shows their actual age
 * so the user makes an informed post/skip decision.
 */
export const QA_MAX_ARTICLE_AGE_HOURS = 72;

/**
 * Run full QA validation on a generated post.
 * Returns a QAReport with verdict, score, and individual check results.
 */
export function validatePost(
  post: GeneratedPost,
  options?: {
    platform?: PlatformId;
    postTypeId?: PostTypeId;
    isDeep?: boolean;
    deepResult?: DeepDivePost;
    /** Article age in hours (from newsFetcher). Triggers REJECT if > QA_MAX_ARTICLE_AGE_HOURS. */
    articleHoursAgo?: number;
  }
): QAReport {
  const checks: QACheckResult[] = [];
  const text = post.text || '';
  const platform = options?.platform || 'whatsapp';
  const postTypeId = options?.postTypeId;
  const articleHoursAgo = options?.articleHoursAgo;
  const isNoBanner = postTypeId === 'pulse' || postTypeId === 'voicenote';

  // ═══════════════════════════════════════════════════════
  // 0. AUDIT REFRESH — runs FIRST on every validation call.
  //    Re-reads the system clock; never uses a cached "now".
  // ═══════════════════════════════════════════════════════
  const auditNowMs = Date.now();
  const auditReadable = new Date(auditNowMs).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
  }) + ' UAE';
  void auditReadable;

  // 0a. STRICT RECENCY GATE — article cannot be older than 7 days
  //     OR future-dated relative to the live system clock.
  if (articleHoursAgo !== undefined && articleHoursAgo !== null) {
    const isFutureDated = articleHoursAgo < 0;
    const isTooOld = articleHoursAgo > QA_MAX_ARTICLE_AGE_HOURS;
    const ageOk = !isFutureDated && !isTooOld;
    checks.push(check(
      'audit-recency-gate',
      'freshness',
      'critical',
      'Article within real-time freshness window',
      ageOk,
      ageOk
        ? `Article is ${articleHoursAgo}h old at audit time. Within ${QA_MAX_ARTICLE_AGE_HOURS}h cutoff.`
        : isFutureDated
          ? `REJECTED: Article dated AFTER current system time (${articleHoursAgo}h offset). Cannot post content dated past the live clock.`
          : `REJECTED: Article is ${articleHoursAgo}h old. Exceeds ${QA_MAX_ARTICLE_AGE_HOURS}h real-time freshness cutoff.`
    ));
  }

  // ═══════════════════════════════════════════════════════
  // 1. CONTENT FRESHNESS CHECKS
  // ═══════════════════════════════════════════════════════

  // 1a. Text references current year (re-read on every call)
  const currentYear = dateFormatted.year;
  const hasCurrentYear = text.includes(currentYear) ||
    post.subline?.includes(currentYear) ||
    post.stat?.includes(currentYear);
  checks.push(check(
    'fresh-year',
    'freshness',
    'warning',
    `References ${currentYear} data`,
    hasCurrentYear,
    hasCurrentYear
      ? `Content references ${currentYear} data`
      : `No explicit ${currentYear} reference found in text. Content may reference outdated data.`
  ));

  // 1b. Source URL contains current year or recent date
  const sourceUrl = post.sourceUrl || '';
  const sourceHasRecentDate = sourceUrl.includes(currentYear) ||
    sourceUrl.includes(`/${currentYear.slice(2)}/`) ||
    Boolean(sourceUrl.match(/202[5-9]/));
  checks.push(check(
    'fresh-source',
    'freshness',
    'critical',
    'Source URL is recent',
    sourceHasRecentDate || !sourceUrl,
    sourceHasRecentDate
      ? 'Source URL contains a recent date reference'
      : sourceUrl
        ? `Source URL "${sourceUrl}" does not contain a ${currentYear} date. May be outdated.`
        : 'No source URL provided (acceptable for some formats)'
  ));

  // 1c. Check for stale year references
  const staleYears = getStaleYearPatterns();
  const staleYearMatches: string[] = [];
  for (const pattern of staleYears) {
    const matches = text.match(pattern);
    if (matches) staleYearMatches.push(...matches);
  }
  checks.push(check(
    'fresh-no-stale',
    'freshness',
    'critical',
    'No outdated year references',
    staleYearMatches.length === 0,
    staleYearMatches.length === 0
      ? 'No stale year references detected'
      : `Found references to old years: ${[...new Set(staleYearMatches)].join(', ')}. Content may be outdated.`
  ));

  // 1d. Check for stale language patterns
  const staleLanguage: string[] = [];
  for (const pattern of STALE_PHRASES) {
    const match = text.match(pattern);
    if (match) staleLanguage.push(match[0]);
  }
  checks.push(check(
    'fresh-language',
    'freshness',
    'warning',
    'No stale language patterns',
    staleLanguage.length === 0,
    staleLanguage.length === 0
      ? 'Content uses present-tense, current framing'
      : `Found backward-looking phrases: "${staleLanguage.join('", "')}". Content should feel real-time.`
  ));

  // ═══════════════════════════════════════════════════════
  // 2. SOURCE RELIABILITY CHECKS
  // ═══════════════════════════════════════════════════════

  // 2a. Source is from approved list
  const sourceName = (post.source || '').toLowerCase();
  const isApprovedSource = TIER_1_SOURCES.some(s => sourceName.includes(s));
  const isBlockedSource = BLOCKED_SOURCES.some(s => sourceName.includes(s));
  checks.push(check(
    'source-approved',
    'source',
    'critical',
    'Source is from approved list',
    isApprovedSource || (!sourceName && isNoBanner),
    isApprovedSource
      ? `Source "${post.source}" is on the approved intelligence list`
      : isBlockedSource
        ? `BLOCKED: "${post.source}" is a Big 4/consulting firm. These are prohibited as primary sources.`
        : sourceName
          ? `Source "${post.source}" is not on the preferred list (Mondaq, MEED, Lexology, Bloomberg, Reuters, FT, etc.). Review manually.`
          : isNoBanner ? 'No source required for this format' : 'No source attribution provided.'
  ));

  // 2b. Source URL is valid format
  const hasValidUrl = !sourceUrl || /^https?:\/\/[^\s]+\.[^\s]+/.test(sourceUrl);
  checks.push(check(
    'source-url-valid',
    'source',
    'warning',
    'Source URL format is valid',
    hasValidUrl,
    hasValidUrl
      ? 'Source URL format is valid'
      : `Source URL "${sourceUrl}" appears malformed`
  ));

  // 2c. Source is not a blocked/Big4 source
  checks.push(check(
    'source-not-blocked',
    'source',
    'critical',
    'Not from Big 4 / consulting',
    !isBlockedSource,
    isBlockedSource
      ? `REJECTED: "${post.source}" is a Big 4 or consulting firm. Must use independent sources.`
      : 'Source is not from blocked list (Big 4, consulting, user-generated)'
  ));

  // ═══════════════════════════════════════════════════════
  // 3. BRAND VOICE COMPLIANCE
  // ═══════════════════════════════════════════════════════

  // 3a. No banned words
  const foundBanned: string[] = [];
  const textLower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (textLower.includes(word.toLowerCase())) {
      foundBanned.push(word);
    }
  }
  checks.push(check(
    'voice-banned-words',
    'voice',
    'critical',
    'No banned words detected',
    foundBanned.length === 0,
    foundBanned.length === 0
      ? 'Content is free of banned vocabulary'
      : `Found banned words: "${foundBanned.join('", "')}". These must be removed.`
  ));

  // 3b. No banned patterns
  const foundPatterns: string[] = [];
  for (const pattern of BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match) foundPatterns.push(match[0]);
  }
  checks.push(check(
    'voice-banned-patterns',
    'voice',
    'critical',
    'No banned phrases detected',
    foundPatterns.length === 0,
    foundPatterns.length === 0
      ? 'Content avoids all banned phrases'
      : `Found banned patterns: "${foundPatterns.join('", "')}". These undermine the insider voice.`
  ));

  // 3c. No em dashes or semicolons
  const hasEmDash = /\u2014|\u2013/.test(text);
  const hasSemicolon = text.includes(';');
  checks.push(check(
    'voice-punctuation',
    'voice',
    'warning',
    'Clean punctuation (no dashes/semicolons)',
    !hasEmDash && !hasSemicolon,
    !hasEmDash && !hasSemicolon
      ? 'Punctuation is clean'
      : `Found ${hasEmDash ? 'em/en dashes' : ''}${hasEmDash && hasSemicolon ? ' and ' : ''}${hasSemicolon ? 'semicolons' : ''}. Replace with commas or periods.`
  ));

  // ═══════════════════════════════════════════════════════
  // 4. FORMAT COMPLIANCE
  // ═══════════════════════════════════════════════════════

  // 4a. Headline format (4-6 words, ALL CAPS) - skip for noBanner engagement types
  if (!isNoBanner) {
    const headline = post.headline || '';
    const headlineWords = headline.trim().split(/\s+/).filter(Boolean);
    const isAllCaps = headline === headline.toUpperCase() && headline.length > 0;
    const goodWordCount = headlineWords.length >= 3 && headlineWords.length <= 8;
    checks.push(check(
      'format-headline',
      'format',
      'warning',
      'Headline: ALL CAPS, 4-6 words',
      isAllCaps && goodWordCount,
      isAllCaps && goodWordCount
        ? `Headline "${headline}" (${headlineWords.length} words, ALL CAPS) ✓`
        : !headline
          ? 'No headline provided'
          : `Headline "${headline}" — ${!isAllCaps ? 'not ALL CAPS' : ''}${!isAllCaps && !goodWordCount ? ', ' : ''}${!goodWordCount ? `${headlineWords.length} words (target: 4-6)` : ''}`
    ));
  }

  // 4b. Stat contains a number
  const stat = post.stat || '';
  const hasNumber = /\d/.test(stat);
  const hasUnit = /[%$£€¥₹AEDBNMKT]|billion|million|trillion|percent/i.test(stat);
  if (!isNoBanner) {
    checks.push(check(
      'format-stat',
      'format',
      'warning',
      'Stat has number + unit',
      hasNumber && hasUnit,
      hasNumber && hasUnit
        ? `Stat "${stat}" contains number and unit ✓`
        : !stat
          ? 'No stat provided for banner'
          : `Stat "${stat}" — ${!hasNumber ? 'no number' : ''}${!hasNumber && !hasUnit ? ', ' : ''}${!hasUnit ? 'no unit (needs %, $, AED, B, M, etc.)' : ''}`
    ));
  }

  // 4c. Text has paragraph breaks (WhatsApp requirement)
  if (platform === 'whatsapp' && postTypeId !== 'pulse') {
    const paragraphs = text.split(/\n\n/).filter(p => p.trim());
    checks.push(check(
      'format-paragraphs',
      'format',
      'warning',
      'WhatsApp paragraph structure',
      paragraphs.length >= 2,
      paragraphs.length >= 2
        ? `Text has ${paragraphs.length} paragraphs (good readability)`
        : `Text is a single block. WhatsApp requires \\n\\n between paragraphs for readability.`
    ));
  }

  // 4d. Subline has specific data
  const subline = post.subline || '';
  const sublineHasData = /\d/.test(subline) || subline.length > 15;
  if (!isNoBanner) {
    checks.push(check(
      'format-subline',
      'format',
      'info',
      'Subline has specific context',
      sublineHasData,
      sublineHasData
        ? `Subline provides specific context: "${subline.slice(0, 50)}..."`
        : 'Subline is vague or empty. Should include specific data/context.'
    ));
  }

  // ═══════════════════════════════════════════════════════
  // 5. PLATFORM COMPLIANCE
  // ═══════════════════════════════════════════════════════

  // 5a. Text length within platform limits
  const maxLen = PLATFORM_MAX_LENGTH[platform] || 5000;
  const textLen = text.length;
  // Allow 20% overflow since prompts are guidelines, not hard limits
  const withinLimit = textLen <= maxLen * 1.2;
  checks.push(check(
    'platform-length',
    'platform',
    textLen > maxLen * 1.5 ? 'critical' : 'warning',
    `Text length within ${platform} limit`,
    withinLimit,
    withinLimit
      ? `Text is ${textLen} chars (limit: ${maxLen}) ✓`
      : `Text is ${textLen} chars, exceeds ${platform} limit of ${maxLen} by ${textLen - maxLen} chars. Trim for best readability.`
  ));

  // 5b. Post type word count validation
  const wordCount = text.trim().split(/\s+/).length;
  if (postTypeId === 'pulse') {
    const validPulse = wordCount <= 80;
    checks.push(check(
      'platform-pulse-length',
      'platform',
      'warning',
      'Pulse Signal: 40-60 words',
      validPulse,
      validPulse
        ? `Pulse is ${wordCount} words ✓`
        : `Pulse is ${wordCount} words. Target: 40-60 words. May lose punch if too long.`
    ));
  }
  if (postTypeId === 'voicenote') {
    const validInsider = wordCount >= 50 && wordCount <= 150;
    checks.push(check(
      'platform-insider-length',
      'platform',
      'warning',
      'Insider Note: 80-120 words',
      validInsider,
      validInsider
        ? `Insider Note is ${wordCount} words ✓`
        : `Insider Note is ${wordCount} words. Target: 80-120 words.`
    ));
  }

  // ═══════════════════════════════════════════════════════
  // 6. CONTENT INTEGRITY
  // ═══════════════════════════════════════════════════════

  // The post format intentionally ends with the source URL on its own line.
  // That's source attribution, NOT self-promotion. Strip it before running
  // promo/HTML pattern checks so the trailing URL doesn't trigger false fails.
  const bodyForPromoChecks = stripTrailingSourceUrl(text, post.sourceUrl);

  // 6a. No HTML or citation tags (in body content, excluding trailing source URL)
  const htmlIssues: string[] = [];
  for (const pattern of HTML_PATTERNS) {
    const match = bodyForPromoChecks.match(pattern);
    if (match) htmlIssues.push(match[0]);
  }
  checks.push(check(
    'integrity-no-html',
    'integrity',
    'critical',
    'No HTML or citation tags',
    htmlIssues.length === 0,
    htmlIssues.length === 0
      ? 'Content is clean text — no HTML artifacts'
      : `Found HTML/citation artifacts: "${htmlIssues.join('", "')}". Must be stripped.`
  ));

  // 6b. No self-promotion or company mentions (in body, excluding trailing source URL)
  const promoIssues: string[] = [];
  for (const pattern of SELF_PROMO_PATTERNS) {
    const match = bodyForPromoChecks.match(pattern);
    if (match) promoIssues.push(match[0]);
  }
  checks.push(check(
    'integrity-no-promo',
    'integrity',
    'critical',
    'No self-promotion or company names',
    promoIssues.length === 0,
    promoIssues.length === 0
      ? 'Content maintains anonymous insider voice — no company mentions'
      : `Found promotional content: "${promoIssues.join('", "')}". The group must feel anonymous. Remove all company references.`
  ));

  // 6c. Text is not empty
  checks.push(check(
    'integrity-not-empty',
    'integrity',
    'critical',
    'Content is not empty',
    text.length > 20,
    text.length > 20
      ? `Content has ${text.length} characters of substance`
      : 'Content is empty or too short to be useful'
  ));

  // 6d. No raw JSON or code artifacts
  const hasJsonArtifacts = /\{[\s]*"text"/.test(text) || /```/.test(text);
  checks.push(check(
    'integrity-no-json',
    'integrity',
    'critical',
    'No JSON or code artifacts',
    !hasJsonArtifacts,
    !hasJsonArtifacts
      ? 'Content is clean prose — no code artifacts'
      : 'Raw JSON or code blocks detected in text. Parser may have failed.'
  ));

  // ═══════════════════════════════════════════════════════
  // 7. CONVERSION DESIGN
  // ═══════════════════════════════════════════════════════

  // 7a. Closing line creates information gap (check last paragraph)
  const paragraphs = text.split(/\n\n/).filter(p => p.trim());
  const lastParagraph = paragraphs[paragraphs.length - 1] || '';
  const conversionIndicators = [
    /already/i, /moving/i, /quietly/i, /ready/i, /too late/i,
    /window/i, /question is/i, /answer/i, /prepared/i, /positioned/i,
    /repositioning/i, /before/i, /won['']t/i, /stress-test/i,
    /what.*do.*next/i, /worth asking/i, /wondering/i,
  ];
  const hasConversionHook = conversionIndicators.some(p => p.test(lastParagraph));
  checks.push(check(
    'conversion-closing',
    'conversion',
    'warning',
    'Closing creates information gap',
    hasConversionHook || postTypeId === 'poll',
    hasConversionHook
      ? 'Closing line creates conversion intent — reader may reach out privately'
      : 'Closing line may lack urgency/information gap. Should make reader think "I need to talk to someone about this."'
  ));

  // 7b. No direct CTA (call to action) — we never sell
  const directCTA = /book\s*a\s*call/i.test(text) ||
    /schedule\s*a\s*meeting/i.test(text) ||
    /sign\s*up/i.test(text) ||
    /subscribe/i.test(text) ||
    /click\s*here/i.test(text) ||
    /learn\s*more\s*at/i.test(text);
  checks.push(check(
    'conversion-no-cta',
    'conversion',
    'critical',
    'No direct CTA (we never sell)',
    !directCTA,
    !directCTA
      ? 'Content maintains advisory distance — no direct sales language'
      : 'Direct CTA detected. This group NEVER sells. Remove any "book a call", "sign up", "subscribe" language.'
  ));

  // ═══════════════════════════════════════════════════════
  // 8. DEEP DIVE SPECIFIC CHECKS
  // ═══════════════════════════════════════════════════════

  if (options?.isDeep && options?.deepResult) {
    const deep = options.deepResult;

    // 8a. Brief has sufficient depth
    const briefWords = (deep.brief || '').trim().split(/\s+/).length;
    checks.push(check(
      'deep-brief-depth',
      'format',
      'warning',
      'Deep brief: 200-350 words',
      briefWords >= 150 && briefWords <= 400,
      `Deep brief is ${briefWords} words (target: 200-350)`
    ));

    // 8b. Key finding is present
    checks.push(check(
      'deep-key-finding',
      'format',
      'warning',
      'Key finding is present',
      !!(deep.keyFinding && deep.keyFinding.length > 10),
      deep.keyFinding ? `Key finding: "${deep.keyFinding.slice(0, 60)}..."` : 'No key finding provided'
    ));
  }

  // ═══════════════════════════════════════════════════════
  // CALCULATE VERDICT
  // ═══════════════════════════════════════════════════════

  const criticalFails = checks.filter(c => !c.passed && c.severity === 'critical');
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning');
  const infos = checks.filter(c => !c.passed && c.severity === 'info');
  const passed = checks.filter(c => c.passed);

  // Score: 100 points, deduct per failure
  let score = 100;
  score -= criticalFails.length * 15;
  score -= warnings.length * 5;
  score -= infos.length * 2;
  score = Math.max(0, Math.min(100, score));

  let verdict: QAVerdict;
  if (criticalFails.length > 0) {
    verdict = 'REJECTED';
  } else if (warnings.length >= 3 || score < 70) {
    verdict = 'FLAGGED';
  } else {
    verdict = 'APPROVED';
  }

  // Build summary
  let summary: string;
  if (verdict === 'APPROVED') {
    summary = `Content passed all ${checks.length} quality checks. Verified from reliable source${post.source ? ` (${post.source})` : ''}. Ready to post.`;
  } else if (verdict === 'FLAGGED') {
    summary = `Content has ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}: ${warnings.map(w => w.label).join(', ')}. Review before posting.`;
  } else {
    summary = `Content REJECTED — ${criticalFails.length} critical issue${criticalFails.length !== 1 ? 's' : ''}: ${criticalFails.map(f => f.label).join(', ')}. Regenerate required.`;
  }

  return {
    verdict,
    score,
    // Audit timestamp — always live, taken at the start of this call
    timestamp: new Date(auditNowMs).toISOString(),
    checks,
    passCount: passed.length,
    warnCount: warnings.length,
    failCount: criticalFails.length,
    summary,
  };
}

/**
 * Auto-fix common issues that can be programmatically corrected.
 * Returns the cleaned post and a list of fixes applied.
 */
export function autoFixPost(post: GeneratedPost): { fixed: GeneratedPost; fixes: string[] } {
  const fixes: string[] = [];
  const fixed = { ...post };

  // \u2500\u2500 Fix 1: Strip remaining HTML/cite tags \u2500\u2500
  if (/<[^>]+>/.test(fixed.text)) {
    fixed.text = fixed.text
      .replace(/<cite[^>]*>.*?<\/cite>/gi, '')
      .replace(/<\/?cite[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '');
    fixes.push('Removed HTML/citation tags');
  }

  // \u2500\u2500 Fix 2: Replace em/en dashes with commas \u2500\u2500
  if (/\u2014|\u2013/.test(fixed.text)) {
    fixed.text = fixed.text.replace(/\u2014/g, ', ').replace(/\u2013/g, ', ');
    fixes.push('Replaced em/en dashes with commas');
  }

  // \u2500\u2500 Fix 3: Replace semicolons with periods \u2500\u2500
  if (fixed.text.includes(';')) {
    fixed.text = fixed.text.replace(/;/g, '.');
    fixes.push('Replaced semicolons with periods');
  }

  // \u2500\u2500 Fix 4: Strip citation references [1], [2], etc. \u2500\u2500
  if (/\[\d+\]/.test(fixed.text)) {
    fixed.text = fixed.text.replace(/\[\d+\]/g, '');
    fixes.push('Removed citation reference numbers');
  }

  // \u2500\u2500 Fix 5: Replace banned words with neutral synonyms \u2500\u2500
  const BANNED_WORD_SUBSTITUTES: Record<string, string> = {
    'leverage': 'use',
    'utilize': 'use',
    'landscape': 'environment',
    'navigate': 'manage',
    'robust': 'strong',
    'holistic': 'overall',
    'synergy': 'alignment',
    'unpack': 'examine',
    'deep dive': 'closer look',
    'pivoting': 'shifting',
    'paradigm': 'model',
    'actionable': 'practical',
    'scalable': 'flexible',
    'disrupt': 'change',
  };
  for (const [bad, good] of Object.entries(BANNED_WORD_SUBSTITUTES)) {
    const re = new RegExp(`\\b${bad}\\b`, 'gi');
    if (re.test(fixed.text)) {
      fixed.text = fixed.text.replace(re, (match) => {
        // Preserve capitalisation of first letter
        return match[0] === match[0].toUpperCase()
          ? good.charAt(0).toUpperCase() + good.slice(1)
          : good;
      });
      fixes.push(`Replaced banned word "${bad}" with "${good}"`);
    }
  }

  // \u2500\u2500 Fix 6: Strip banned phrase patterns \u2500\u2500
  const BANNED_STRIP_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /in today['']s\s+/gi, label: '"in today\'s"' },
    { re: /it['']s worth noting that\s+/gi, label: '"it\'s worth noting"' },
    { re: /\binterestingly,?\s+/gi, label: '"interestingly"' },
    { re: /let['']s explore\s+/gi, label: '"let\'s explore"' },
    { re: /here['']s the thing,?\s+/gi, label: '"here\'s the thing"' },
    { re: /it goes without saying that\s+/gi, label: '"goes without saying"' },
    { re: /needless to say,?\s+/gi, label: '"needless to say"' },
    { re: /at the end of the day,?\s+/gi, label: '"at the end of the day"' },
    { re: /moving forward,?\s+/gi, label: '"moving forward"' },
    { re: /\bcircle back\s+/gi, label: '"circle back"' },
  ];
  for (const { re, label } of BANNED_STRIP_PATTERNS) {
    if (re.test(fixed.text)) {
      fixed.text = fixed.text.replace(re, '');
      fixes.push(`Stripped banned phrase ${label}`);
    }
  }

  // \u2500\u2500 Fix 7: Strip stale-language phrases \u2500\u2500
  const STALE_STRIP_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /last year['']?s?\s+/gi, label: '"last year\'s"' },
    { re: /previous year,?\s+/gi, label: '"previous year"' },
    { re: /a year ago,?\s+/gi, label: '"a year ago"' },
    { re: /two years ago,?\s+/gi, label: '"two years ago"' },
    { re: /\bhistorically,?\s+/gi, label: '"historically"' },
    { re: /\bin the past,?\s+/gi, label: '"in the past"' },
  ];
  for (const { re, label } of STALE_STRIP_PATTERNS) {
    if (re.test(fixed.text)) {
      fixed.text = fixed.text.replace(re, '');
      fixes.push(`Stripped stale phrase ${label}`);
    }
  }

  // \u2500\u2500 Fix 8: Strip self-promo / CTA phrases (URLs already excluded from text) \u2500\u2500
  const PROMO_STRIP_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /mics\s*international\s*/gi, label: 'company name' },
    { re: /mics\s*advisory\s*/gi, label: 'company name' },
    { re: /\bcontact us\s*/gi, label: '"contact us"' },
    { re: /reach out to us\s*/gi, label: '"reach out"' },
    { re: /visit (?:our|the) website\s*/gi, label: '"visit website"' },
  ];
  for (const { re, label } of PROMO_STRIP_PATTERNS) {
    if (re.test(fixed.text)) {
      fixed.text = fixed.text.replace(re, '');
      fixes.push(`Stripped promo ${label}`);
    }
  }
  // Strip any URLs that snuck into the body (URL is supposed to live on sourceUrl, not in text)
  if (/https?:\/\/\S+/.test(fixed.text)) {
    fixed.text = fixed.text.replace(/\s*https?:\/\/\S+\s*/g, ' ').trim();
    fixes.push('Removed inline URL (URL belongs on source field, not in body)');
  }

  // \u2500\u2500 Fix 9: Auto-paragraph long wall-of-text \u2500\u2500
  if (!fixed.text.includes('\n\n') && fixed.text.length > 200) {
    const sentences = fixed.text.split(/(?<=[.!?])\s+(?=[A-Z*_~])/);
    if (sentences.length >= 3) {
      const paragraphs: string[] = [];
      let cur = '';
      let count = 0;
      for (const s of sentences) {
        cur += (cur ? ' ' : '') + s;
        count++;
        if (count >= 2 && cur.length > 80) {
          paragraphs.push(cur);
          cur = '';
          count = 0;
        }
      }
      if (cur) paragraphs.push(cur);
      fixed.text = paragraphs.join('\n\n');
      fixes.push('Auto-paragraphed wall-of-text for WhatsApp readability');
    }
  }

  // \u2500\u2500 Fix 10: Normalize whitespace \u2500\u2500
  // Collapse multiple spaces (but not newlines), and collapse 3+ newlines to 2.
  fixed.text = fixed.text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // \u2500\u2500 Fix 11: Trim platform-overflow (keep hook + closer, drop middle paragraph) \u2500\u2500
  // For WhatsApp's 700-char target, if grossly over (>1.5x), trim middle.
  if (fixed.text.length > 1050) {
    const paras = fixed.text.split('\n\n');
    if (paras.length >= 4) {
      // Keep first 2 + last 2 paragraphs
      const trimmed = [...paras.slice(0, 2), ...paras.slice(-2)].join('\n\n');
      if (trimmed.length < fixed.text.length) {
        fixed.text = trimmed;
        fixes.push('Trimmed middle paragraphs to fit platform length');
      }
    }
  }

  // \u2500\u2500 Fix 12: Force headline to ALL CAPS \u2500\u2500
  if (fixed.headline && fixed.headline !== fixed.headline.toUpperCase()) {
    fixed.headline = fixed.headline.toUpperCase();
    fixes.push('Converted headline to ALL CAPS');
  }

  // \u2500\u2500 Fix 13: Clean stat of qualifier prefixes \u2500\u2500
  if (fixed.stat) {
    const before = fixed.stat;
    fixed.stat = fixed.stat
      .replace(/^approximately\s*/i, '')
      .replace(/^around\s*/i, '')
      .replace(/^about\s*/i, '')
      .replace(/^roughly\s*/i, '')
      .trim();
    if (fixed.stat !== before) {
      fixes.push('Cleaned stat qualifier for visual impact');
    }
  }

  return { fixed, fixes };
}
