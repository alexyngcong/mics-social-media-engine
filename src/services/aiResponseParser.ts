import type { GeneratedPost, DeepDivePost, StatDirection, AIBrief } from '../types';

const STANDARD_KEYS: (keyof GeneratedPost)[] = [
  'text', 'headline', 'subline', 'stat', 'statLabel', 'source', 'sourceUrl', 'statDirection',
];

const DEEP_KEYS: (keyof DeepDivePost)[] = [
  'post', 'brief', 'headline', 'subline', 'stat', 'statLabel', 'source', 'sourceUrl', 'statDirection', 'keyFinding',
];

function cleanText(value: string): string {
  return value
    .replace(/<cite[^>]*>.*?<\/cite>/gi, '')  // Strip <cite> tags and contents
    .replace(/<\/?cite[^>]*>/gi, '')           // Strip unclosed cite tags
    .replace(/<[^>]+>/g, '')                   // Strip any remaining HTML tags
    .replace(/\u2014/g, ', ')                  // Em dash to comma
    .replace(/\u2013/g, ', ')                  // En dash to comma
    .replace(/\s{2,}/g, ' ')                   // Collapse multiple spaces
    .trim();
}

function isValidDirection(value: string): value is StatDirection {
  return value === 'up' || value === 'down' || value === 'neutral';
}

export function parseStandardResponse(raw: string): GeneratedPost {
  const result: GeneratedPost = {
    text: '', headline: '', subline: '', stat: '', statLabel: '',
    statDirection: 'neutral', source: '', sourceUrl: '',
  };

  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      for (const key of STANDARD_KEYS) {
        if (parsed[key]) {
          (result as unknown as Record<string, string>)[key] = cleanText(String(parsed[key]));
        }
      }
      if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
        result.hashtags = parsed.hashtags.map(String);
      }
      if (parsed.threadPosts && Array.isArray(parsed.threadPosts)) {
        result.threadPosts = parsed.threadPosts.map(String);
      }
    }
  } catch {
    // Regex fallback for malformed JSON
    for (const key of STANDARD_KEYS) {
      const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*?)"`);
      const match = raw.match(regex);
      if (match) {
        (result as unknown as Record<string, string>)[key] = cleanText(match[1]);
      }
    }
  }

  if (!isValidDirection(result.statDirection)) {
    result.statDirection = 'neutral';
  }

  return result;
}

export function parseDeepResponse(raw: string): DeepDivePost {
  const result: DeepDivePost = {
    text: '', headline: '', subline: '', stat: '', statLabel: '',
    statDirection: 'neutral', source: '', sourceUrl: '',
    post: '', brief: '', keyFinding: '',
  };

  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      for (const key of DEEP_KEYS) {
        if (parsed[key]) {
          (result as unknown as Record<string, string>)[key] = cleanText(String(parsed[key]));
        }
      }
    }
  } catch {
    for (const key of DEEP_KEYS) {
      const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*?)"`);
      const match = raw.match(regex);
      if (match) {
        (result as unknown as Record<string, string>)[key] = cleanText(match[1]);
      }
    }
  }

  if (!isValidDirection(result.statDirection)) {
    result.statDirection = 'neutral';
  }

  // Populate text from post for consistency
  if (result.post && !result.text) {
    result.text = result.post;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// AI BRIEF PARSER — for the One-Click AI Brief workflow
// ═══════════════════════════════════════════════════════════════════
// Takes a Claude (or other LLM) response generated from the prompt in
// promptBuilder.ts and splits it into the 17 structured AIBrief fields.
// Tolerant of minor formatting variation across LLMs.

const AI_BRIEF_SECTION_TO_FIELD: Record<string, keyof AIBrief> = {
  'executive summary': 'executiveSummary',
  'why it matters': 'whyItMatters',
  'why it matters to uae/gcc businesses': 'whyItMatters',
  'why it matters to uae gcc businesses': 'whyItMatters',
  'cfo angle': 'cfoAngle',
  'founder angle': 'founderAngle',
  'investor angle': 'investorAngle',
  'risk & opportunity': 'riskOpportunity',
  'risk and opportunity': 'riskOpportunity',
  'risk-opportunity': 'riskOpportunity',
  'linkedin post': 'linkedinPost',
  'whatsapp update': 'whatsappUpdate',
  'whatsapp community update': 'whatsappUpdate',
  'hashtags': 'hashtags',
  'suggested hashtags': 'hashtags',
  'content hook': 'contentHook',
  'suggested content hook': 'contentHook',
  'visual idea': 'visualIdea',
  'suggested visual idea': 'visualIdea',
  'suggested visual/graphic idea': 'visualIdea',
  'cta': 'cta',
  'suggested cta': 'cta',
  'call to action': 'cta',
  'advisory angle': 'advisoryAngle',
  'suggested advisory angle': 'advisoryAngle',
  'suggested advisory/service angle': 'advisoryAngle',
  'viral headlines': 'viralHeadlines',
  'viral headline variations': 'viralHeadlines',
  'headline variations': 'viralHeadlines',
  'carousel outline': 'carouselOutline',
  'short-form carousel outline': 'carouselOutline',
  'poll idea': 'pollIdea',
  'poll/post idea': 'pollIdea',
  'newsletter summary': 'newsletterSummary',
};

/**
 * Parse a Claude/LLM response into an AIBrief.
 * Accepts headings in several flavours: `## TITLE`, `# TITLE`,
 * `**TITLE**`, or ALL-CAPS on its own line.
 */
export function parseAIBriefResponse(raw: string): AIBrief & { _unmatched: string[]; _rawLength: number } {
  const brief: AIBrief & { _unmatched: string[]; _rawLength: number } = {
    _unmatched: [],
    _rawLength: raw?.length || 0,
    generatedAt: Date.now(),
  };

  if (!raw || raw.trim().length < 50) return brief;

  const lines = raw.split(/\r?\n/);
  const sections: Array<{ name: string; bodyLines: string[] }> = [];
  let current: { name: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    let headingName: string | null = null;

    const mdHeading = trimmed.match(/^#{1,3}\s+(.+?)\s*$/);
    if (mdHeading) headingName = mdHeading[1];

    if (!headingName) {
      const boldHeading = trimmed.match(/^\*\*([^*]+?)\*\*:?$/);
      if (boldHeading) headingName = boldHeading[1];
    }

    if (!headingName && trimmed.length > 3 && trimmed.length < 60 &&
        trimmed === trimmed.toUpperCase() &&
        /^[A-Z][A-Z0-9 &/\-+]+:?$/.test(trimmed)) {
      headingName = trimmed.replace(/:$/, '');
    }

    if (headingName) {
      if (current) sections.push(current);
      current = { name: headingName, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) sections.push(current);

  for (const sec of sections) {
    const key = sec.name.toLowerCase().replace(/[^a-z0-9 /&-]/g, '').trim();
    const field = AI_BRIEF_SECTION_TO_FIELD[key];
    const body = sec.bodyLines.join('\n').trim();
    if (!body) continue;

    if (!field) {
      brief._unmatched.push(sec.name);
      continue;
    }

    if (field === 'hashtags') {
      brief.hashtags = body
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(t => t.startsWith('#') && t.length > 1);
    } else if (field === 'viralHeadlines') {
      brief.viralHeadlines = body
        .split(/\n/)
        .map(l => l.replace(/^\s*[\d\-•*]+\.?\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 10);
    } else {
      (brief as Record<string, unknown>)[field as string] = body;
    }
  }

  return brief;
}

/** Check if a parsed brief has minimum viable content for posting. */
export function isUsableBrief(brief: AIBrief): boolean {
  return !!(brief.whatsappUpdate || brief.linkedinPost || brief.executiveSummary);
}

/** Count how many of the 17 expected outputs were successfully parsed. */
export function getBriefCompleteness(brief: AIBrief): { found: number; total: number } {
  const fields: Array<keyof AIBrief> = [
    'executiveSummary', 'whyItMatters', 'cfoAngle', 'founderAngle',
    'investorAngle', 'riskOpportunity', 'linkedinPost', 'whatsappUpdate',
    'hashtags', 'contentHook', 'visualIdea', 'cta', 'advisoryAngle',
    'viralHeadlines', 'carouselOutline', 'pollIdea', 'newsletterSummary',
  ];
  let found = 0;
  for (const f of fields) {
    const v = brief[f];
    if (Array.isArray(v) ? v.length > 0 : !!v) found++;
  }
  return { found, total: fields.length };
}
