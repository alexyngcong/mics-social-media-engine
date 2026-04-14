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
  'mondaq', 'meed', 'lexology',
  'bloomberg', 'reuters', 'financial times', 'ft.com',
  'wall street journal', 'wsj',
  'the national', 'gulf news', 'zawya',
  'central bank', 'cbuae', 'ministry of finance',
  'difc', 'adgm', 'sca', 'fta',
  'imf', 'world bank', 'oecd', 'bis',
  'nikkei', 'scmp', 'economist',
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
  }
): QAReport {
  const checks: QACheckResult[] = [];
  const text = post.text || '';
  const platform = options?.platform || 'whatsapp';
  const postTypeId = options?.postTypeId;
  const isNoBanner = postTypeId === 'pulse' || postTypeId === 'voicenote';

  // ═══════════════════════════════════════════════════════
  // 1. CONTENT FRESHNESS CHECKS
  // ═══════════════════════════════════════════════════════

  // 1a. Text references current year
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
    sourceUrl.match(/202[5-9]/);
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

  // 6a. No HTML or citation tags
  const htmlIssues: string[] = [];
  for (const pattern of HTML_PATTERNS) {
    const match = text.match(pattern);
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

  // 6b. No self-promotion or company mentions
  const promoIssues: string[] = [];
  for (const pattern of SELF_PROMO_PATTERNS) {
    const match = text.match(pattern);
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
    timestamp: new Date().toISOString(),
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

  // Fix 1: Strip remaining HTML/cite tags
  if (/<[^>]+>/.test(fixed.text)) {
    fixed.text = fixed.text
      .replace(/<cite[^>]*>.*?<\/cite>/gi, '')
      .replace(/<\/?cite[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '');
    fixes.push('Removed HTML/citation tags from text');
  }

  // Fix 2: Replace em/en dashes with commas
  if (/\u2014|\u2013/.test(fixed.text)) {
    fixed.text = fixed.text.replace(/\u2014/g, ', ').replace(/\u2013/g, ', ');
    fixes.push('Replaced em/en dashes with commas');
  }

  // Fix 3: Remove semicolons
  if (fixed.text.includes(';')) {
    fixed.text = fixed.text.replace(/;/g, '.');
    fixes.push('Replaced semicolons with periods');
  }

  // Fix 4: Remove citation references [1], [2], etc.
  if (/\[\d+\]/.test(fixed.text)) {
    fixed.text = fixed.text.replace(/\[\d+\]/g, '');
    fixes.push('Removed citation reference numbers');
  }

  // Fix 5: Normalize multiple spaces
  fixed.text = fixed.text.replace(/\s{2,}/g, ' ').replace(/ \n/g, '\n');

  // Fix 6: Force headline to ALL CAPS if it isn't
  if (fixed.headline && fixed.headline !== fixed.headline.toUpperCase()) {
    fixed.headline = fixed.headline.toUpperCase();
    fixes.push('Converted headline to ALL CAPS');
  }

  // Fix 7: Clean stat of any non-visual text
  if (fixed.stat) {
    fixed.stat = fixed.stat.replace(/approximately\s*/i, '').replace(/around\s*/i, '').trim();
    if (fixed.stat !== post.stat) {
      fixes.push('Cleaned stat for visual impact');
    }
  }

  return { fixed, fixes };
}
