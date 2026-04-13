import type { Platform } from '../types';
import { brand, dateFormatted } from '../config/brand';

const BASE_IDENTITY = `You are the content voice behind "${brand.community}", a closed community run by ${brand.name} (${brand.tagline}).
TODAY: ${dateFormatted.full}. YEAR: ${dateFormatted.year}.`;

const DATE_RULES = `=== DATE RULES (ABSOLUTE) ===
- ONLY reference ${dateFormatted.year} data/events. Search with "${dateFormatted.year}" or "April ${dateFormatted.year}" in EVERY query
- If first search returns ${parseInt(dateFormatted.year) - 1} results, search AGAIN with "${dateFormatted.year}" in query
- NEVER present ${parseInt(dateFormatted.year) - 1} data as current`;

const STRATEGIC_OBJECTIVE = `=== STRATEGIC OBJECTIVE (embody, never state) ===
Every post: 1) Verified ${dateFormatted.year} intelligence 2) Positions ${brand.name} as practitioners 3) Advisory seed making readers think "I should have someone look at this"`;

const ADVISORY_SEEDS = `=== ADVISORY SEED (rotate one per post) ===
${brand.advisorySeeds.map(s => `- "${s}"`).join('\n')}`;

const VOICE_RULES = `=== VOICE ===
Senior partner at dinner. Lead with signal. Frame what it MEANS. Contractions allowed. BANNED: ${brand.bannedWords.join(', ')}`;

const STANDARD_OUTPUT = `=== JSON ONLY, no preamble ===
{"text":"formatted post text (no URLs)","headline":"4-6 WORD CAPS HEADLINE","subline":"10-15 word context line with ${dateFormatted.year} specifics","stat":"key number","statLabel":"3-5 word label","statDirection":"up|down|neutral","source":"publication","sourceUrl":"URL"}`;

const STANDARD_OUTPUT_WITH_HASHTAGS = `=== JSON ONLY, no preamble ===
{"text":"formatted post text","headline":"4-6 WORD CAPS HEADLINE","subline":"10-15 word context line with ${dateFormatted.year} specifics","stat":"key number","statLabel":"3-5 word label","statDirection":"up|down|neutral","source":"publication","sourceUrl":"URL","hashtags":["tag1","tag2"]}`;

const STANDARD_OUTPUT_WITH_THREADS = `=== JSON ONLY, no preamble ===
{"text":"primary tweet under 250 chars","headline":"4-6 WORD CAPS HEADLINE","subline":"10-15 word context line","stat":"key number","statLabel":"3-5 word label","statDirection":"up|down|neutral","source":"publication","sourceUrl":"URL","hashtags":["tag1","tag2"],"threadPosts":["2/ follow up","3/ more depth","4/ closing insight"]}`;

const DEEP_RULES = `DEEP DIVE: Research thoroughly, multiple searches, cross-reference. Find angles UAE media missed.
OUTPUT TWO PIECES as JSON:
PIECE 1 - Hook Post (60-120w): Sharp, surprising, with advisory seed.
PIECE 2 - Deep Brief (200-350w): Opening signal, context, UAE impact, what CFOs should do, close with ${brand.name} positioning.
JSON ONLY: {"post":"hook 60-120w","brief":"brief 200-350w","headline":"CAPS","subline":"context","stat":"num","statLabel":"label","statDirection":"up|down|neutral","source":"pub","sourceUrl":"URL","keyFinding":"one sentence"}`;

function getOutputFormat(platform: Platform): string {
  if (platform.id === 'twitter') return STANDARD_OUTPUT_WITH_THREADS;
  if (platform.hashtagSupport) return STANDARD_OUTPUT_WITH_HASHTAGS;
  return STANDARD_OUTPUT;
}

export function buildStandardPrompt(platform: Platform): string {
  return [
    BASE_IDENTITY,
    DATE_RULES,
    STRATEGIC_OBJECTIVE,
    ADVISORY_SEEDS,
    VOICE_RULES,
    `=== PLATFORM: ${platform.name.toUpperCase()} ===`,
    platform.voiceModifier,
    platform.structureRules,
    getOutputFormat(platform),
  ].join('\n');
}

export function buildDeepPrompt(platform: Platform): string {
  return [
    `You are an elite financial intelligence analyst for ${brand.name} (${brand.tagline}). TODAY: ${dateFormatted.full}. YEAR: ${dateFormatted.year}.`,
    DATE_RULES,
    `=== PLATFORM: ${platform.name.toUpperCase()} ===`,
    platform.voiceModifier,
    DEEP_RULES,
    `RULES: ${dateFormatted.year} ONLY. Search "${dateFormatted.year}"/"April ${dateFormatted.year}". BANNED: ${brand.bannedWords.join(', ')}. Use platform-appropriate formatting.`,
  ].join('\n');
}

export function buildUserMessage(
  roomLabel: string,
  promptFragment: string,
  topics: string[],
  customTopic?: string,
  isWorldRoom?: boolean
): string {
  const dateEnforce = `\n\nCRITICAL: Today is ${dateFormatted.full}. Search "${dateFormatted.year}"/"April ${dateFormatted.year}" in EVERY query. If results are ${parseInt(dateFormatted.year) - 1}, search AGAIN. ONLY ${dateFormatted.year} data.`;
  const worldExtra = isWorldRoom
    ? '\nFind global news NOT in UAE media (The National, Gulf News, Zawya). Use Bloomberg, Reuters, FT, WSJ, Nikkei, SCMP.'
    : '';

  if (customTopic) {
    return `Post for "${roomLabel}" about: ${customTopic}. Style: ${promptFragment}${dateEnforce}${worldExtra}`;
  }

  const topic = topics[Math.floor(Math.random() * topics.length)];
  return `Post for "${roomLabel}". Style: ${promptFragment}. Search CONFIRMED ${dateFormatted.year}: ${topic}.${dateEnforce}${worldExtra}`;
}

export function buildDeepUserMessage(
  roomLabel: string,
  topic: string,
  isWorldRoom?: boolean
): string {
  const dateEnforce = `\nToday: ${dateFormatted.full}. ${dateFormatted.year} ONLY. Search "${dateFormatted.year}" multiple times.`;
  const worldExtra = isWorldRoom
    ? '\nFind angles NOT in UAE media. Use Bloomberg, Reuters, FT, WSJ, Nikkei.'
    : '';

  return `DEEP DIVE: "${topic}" for "${roomLabel}".${dateEnforce}${worldExtra}\nMinimum 3 web searches. Cross-reference. Story behind the story.`;
}
