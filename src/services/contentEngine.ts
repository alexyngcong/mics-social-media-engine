/**
 * CONTENT ENGINE — Template-based post generation from live news
 *
 * Takes real news articles + room context + post type template and
 * produces fully formatted GeneratedPost objects. No AI API required.
 *
 * Quality comes from:
 *   - Real data from live news (GDELT, Google News)
 *   - Smart stat/number extraction from article titles
 *   - 15+ hook variants, 12+ body templates, 15+ closings per room
 *   - Advisory seeds from brand.ts
 *   - Post-type-specific assembly strategies
 *   - QA validator runs on output (separate step in hooks)
 */

import type { GeneratedPost, RoomId, PostTypeId, StatDirection } from '../types';
import type { NewsArticle } from './newsFetcher';
import { brand, dateFormatted } from '../config/brand';
import { ROOMS } from '../config/rooms';

// ─── Stat extraction from article text ──────────────────────────

interface ExtractedStat {
  value: string;      // "14.2%", "$7.8B", "AED 48B"
  label: string;      // "YoY Growth", "Sukuk Issuance"
  direction: StatDirection;
}

const STAT_PATTERNS = [
  // Currency amounts
  { regex: /\$(\d[\d,.]*)\s*(B|billion|M|million|T|trillion)/i, fmt: (m: RegExpMatchArray) => `$${m[1]}${m[2].charAt(0).toUpperCase()}` },
  { regex: /AED\s*(\d[\d,.]*)\s*(B|billion|M|million|T|trillion)?/i, fmt: (m: RegExpMatchArray) => `AED ${m[1]}${m[2] ? m[2].charAt(0).toUpperCase() : ''}` },
  { regex: /(\d[\d,.]*)\s*%/, fmt: (m: RegExpMatchArray) => `${m[1]}%` },
  { regex: /(\d[\d,.]*)\s*(billion|million|trillion)/i, fmt: (m: RegExpMatchArray) => `${m[1]}${m[2].charAt(0).toUpperCase()}` },
  // Plain large numbers
  { regex: /(\d{1,3}(?:,\d{3})+)/, fmt: (m: RegExpMatchArray) => m[1] },
];

const UP_SIGNALS = /\b(surge|soar|rise|gain|grow|increase|expand|jump|climb|boost|up|record high|accelerat|outperform|exceed|hit.*high|raise)/i;
const DOWN_SIGNALS = /\b(fall|drop|decline|plunge|shrink|cut|slash|down|low|contract|slump|tumble|decrease|reduce|slow)/i;

function extractStat(title: string, description: string): ExtractedStat | null {
  const text = `${title} ${description}`;

  for (const { regex, fmt } of STAT_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      // Determine direction
      let direction: StatDirection = 'neutral';
      if (UP_SIGNALS.test(text)) direction = 'up';
      else if (DOWN_SIGNALS.test(text)) direction = 'down';

      // Build label from context around the number
      const label = buildStatLabel(title, match[0]);

      return { value: fmt(match), label, direction };
    }
  }

  return null;
}

function buildStatLabel(title: string, statStr: string): string {
  // Take 3-5 words around the stat for context
  const idx = title.indexOf(statStr);
  if (idx === -1) {
    // Use first 4 meaningful words of title
    const words = title.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
    return words.join(' ').toUpperCase().slice(0, 30);
  }

  // Words after the stat
  const after = title.slice(idx + statStr.length).trim().split(/\s+/).filter(w => w.length > 2).slice(0, 3);
  if (after.length >= 2) return after.join(' ').toUpperCase().slice(0, 30);

  // Words before the stat
  const before = title.slice(0, idx).trim().split(/\s+/).filter(w => w.length > 2).slice(-3);
  return before.join(' ').toUpperCase().slice(0, 30);
}

// ─── Headline generator ─────────────────────────────────────────

function generateHeadline(title: string): string {
  // Extract key noun phrases from the title, 4-6 words, ALL CAPS
  const words = title
    .replace(/['"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^(the|and|for|but|with|from|into|that|this|has|have|been|was|were|are|its|a|an|or|in|on|at|to|by|of|as|is)$/i.test(w));

  const headline = words.slice(0, 5).join(' ').toUpperCase();
  return headline.length > 5 ? headline : title.split(/\s+/).slice(0, 5).join(' ').toUpperCase();
}

// ─── Hook templates (opening lines) ─────────────────────────────

const HOOKS_CONTRARIAN = [
  (topic: string) => `Everyone's watching the headlines. They're missing what just happened underneath: ${topic}.`,
  (topic: string) => `The consensus says this market is stable. ${topic} suggests otherwise.`,
  (topic: string) => `While most CFOs are focused on the obvious, ${topic} is the real story nobody's talking about.`,
  (topic: string) => `Here's what the mainstream analysis got wrong about ${topic}.`,
  (topic: string) => `The comfortable narrative around ${topic} just broke. Quietly.`,
];

const HOOKS_REVELATION = [
  (topic: string, source: string) => `${source} just published something most CFOs won't notice for weeks. ${topic}.`,
  (topic: string) => `Something shifted in the data this week. ${topic}, and the implications are bigger than the headline suggests.`,
  (topic: string) => `A quiet development that deserves more attention: ${topic}.`,
  (topic: string, source: string) => `${source} confirms what insiders suspected: ${topic}.`,
  (topic: string) => `This didn't make the front pages, but it should have: ${topic}.`,
];

const HOOKS_QUANTIFIED = [
  (stat: string, context: string) => `*${stat}*. That's the number that just landed. ${context}.`,
  (stat: string, context: string) => `*${stat}*. Read that again. ${context}, and the trajectory matters more than the number.`,
  (stat: string, context: string) => `The latest data: *${stat}*. ${context}. The signal is clear.`,
  (stat: string, context: string) => `*${stat}*. If that number doesn't recalibrate your outlook, the next one will. ${context}.`,
  (stat: string, context: string) => `When *${stat}* hits the wire, smart operators pay attention. ${context}.`,
];

// ─── Body templates (per room) ──────────────────────────────────

const ROOM_BODY: Record<RoomId, ((article: NewsArticle) => string)[]> = {
  growth: [
    (a) => `The expansion signals keep stacking. ${a.title.split(',')[0]}. For CFOs mapping their next move, this reshapes the competitive landscape in the region.\n\nThe question isn't whether to position, it's where and how fast.`,
    (a) => `What this means for growth-stage planning: the regulatory tailwinds and capital flows are aligning in ways we haven't seen since 2021.\n\n${a.title.split('.')[0]}. The early movers are already adjusting their structures.`,
    (a) => `The data tells a story the headlines don't. ${a.title.split(',')[0]}.\n\nFor anyone running feasibility on new markets or structures, this changes the math significantly.`,
  ],
  capital: [
    (a) => `The treasury implications here are immediate. ${a.title.split(',')[0]}.\n\nIf you're managing significant cash positions, the yield curve just sent a signal worth paying attention to.`,
    (a) => `Capital deployment decisions just got more complex. ${a.title.split('.')[0]}.\n\nThe spread between what's available and what most are doing with their reserves is widening.`,
    (a) => `For those managing liquidity across multiple entities, this changes the playbook. ${a.title.split(',')[0]}.\n\nThe window for optimal structuring doesn't stay open long.`,
  ],
  risk: [
    (a) => `Compliance just got a new wrinkle. ${a.title.split(',')[0]}.\n\nThe gap between "technically compliant" and "actually prepared" is where the real exposure sits. Most won't see this until audit season.`,
    (a) => `This is the kind of regulatory shift that catches people mid-cycle. ${a.title.split('.')[0]}.\n\nThe enforcement pattern suggests this isn't a warning shot. It's the new baseline.`,
    (a) => `If your governance framework hasn't been stress-tested against this, that's worth flagging internally. ${a.title.split(',')[0]}.\n\nThe cost of retroactive compliance always exceeds the cost of preparation.`,
  ],
  world: [
    (a) => `The global signal that UAE CFOs should be tracking: ${a.title.split(',')[0]}.\n\nWhat happens internationally doesn't stay international. The transmission mechanisms to the Gulf are faster than most assume.`,
    (a) => `This isn't just a global headline. The second-order effects hit the region within quarters, not years. ${a.title.split('.')[0]}.\n\nThe strategic repositioning has already started for those paying attention.`,
    (a) => `When this kind of shift happens at the macro level, the question isn't whether it reaches the GCC. It's how fast and through which channels. ${a.title.split(',')[0]}.`,
  ],
};

// ─── Closing lines (advisory seeds from brand.ts + room-specific) ──

function pickAdvisorySeed(): string {
  return brand.advisorySeeds[Math.floor(Math.random() * brand.advisorySeeds.length)];
}

const ROOM_CLOSINGS: Record<RoomId, string[]> = {
  growth: [
    'The ones who mapped their expansion before the crowd? They\'re not mapping anymore. They\'re executing.',
    'By the time this becomes common knowledge, the first-mover advantage will be gone.',
    'The question isn\'t whether growth is coming. It\'s whether your structure is built to capture it.',
  ],
  capital: [
    'The smartest treasurers I know restructured their positions six months ago. They\'re sleeping fine.',
    'Cash sitting idle in the wrong structure is the most expensive risk nobody talks about.',
    'The yield environment is speaking. The question is who\'s listening and who\'s hoping.',
  ],
  risk: [
    'The gap between "we\'ll handle it when it comes" and "we\'re already covered" is about to cost someone real money.',
    'Every compliance wave has two groups: those who prepared and those who paid. This wave is no different.',
    'If your risk framework was built for last year\'s rules, it wasn\'t built for this year\'s enforcement.',
  ],
  world: [
    'Global shifts don\'t send calendar invites. They reward the positioned and punish the complacent.',
    'The ones tracking this early aren\'t just informed. They\'re structurally ready for what comes next.',
    'When the global rules change, the advantage goes to those who adapted their regional setup first.',
  ],
};

// ─── Post-type-specific assembly ────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function assembleObservation(article: NewsArticle, room: RoomId, stat: ExtractedStat | null): string {
  const hook = stat
    ? pickRandom(HOOKS_QUANTIFIED)(stat.value, article.title.split(',')[0].trim())
    : pickRandom(HOOKS_CONTRARIAN)(article.title.split(',')[0].trim());

  const body = pickRandom(ROOM_BODY[room])(article);
  const closing = pickRandom([pickAdvisorySeed(), ...ROOM_CLOSINGS[room]]);

  return `${hook}\n\n${body}\n\n_${closing}_`;
}

function assembleAlert(article: NewsArticle, room: RoomId, stat: ExtractedStat | null): string {
  const hook = pickRandom(HOOKS_REVELATION)(article.title.split(',')[0].trim(), article.source);
  const body = pickRandom(ROOM_BODY[room])(article);
  const urgency = stat
    ? `The data point: *${stat.value}*. Review your current position against this.`
    : 'The next 30 days will separate those who saw this coming from those who didn\'t.';
  const closing = pickRandom(ROOM_CLOSINGS[room]);

  return `${hook}\n\n${body}\n\n${urgency}\n\n_${closing}_`;
}

function assemblePoll(article: NewsArticle, room: RoomId): string {
  const roomObj = ROOMS.find(r => r.id === room);
  const question = roomObj?.cfoQuestion || 'What\'s your next move?';
  const topicShort = article.title.split(',')[0].split('.')[0].trim();

  const options = getPollOptions(room);

  return `*${topicShort}*\n\n${question}\n\nHow are you positioned?\n\n${options.map((o, i) => `${['A', 'B', 'C', 'D'][i]}. ${o}`).join('\n')}\n\n_Drop your letter below. The pattern in the answers will be telling._`;
}

function getPollOptions(room: RoomId): string[] {
  const options: Record<RoomId, string[]> = {
    growth: ['Actively expanding into new markets', 'Evaluating but waiting for clarity', 'Focused on consolidating current positions', 'Haven\'t reviewed our growth strategy this quarter'],
    capital: ['Restructured our reserves in the last 6 months', 'Reviewing but haven\'t moved yet', 'Comfortable with our current allocation', 'Didn\'t know we needed to act on this'],
    risk: ['Already compliant with the new requirements', 'In the process of updating our framework', 'Aware but haven\'t started yet', 'Hearing about this for the first time'],
    world: ['Already adjusted our regional strategy', 'Monitoring closely, ready to pivot', 'Still assessing the impact', 'Don\'t see how this affects the GCC'],
  };
  return options[room] || options.growth;
}

function assembleGeneric(article: NewsArticle, room: RoomId, stat: ExtractedStat | null): string {
  const hookPool = [...HOOKS_CONTRARIAN, ...HOOKS_REVELATION];
  const hookFn = pickRandom(hookPool);
  const hook = hookFn(article.title.split(',')[0].trim(), article.source);

  const body = pickRandom(ROOM_BODY[room])(article);
  const statLine = stat ? `\nThe number: *${stat.value}*.\n` : '';
  const closing = pickAdvisorySeed();

  return `${hook}\n\n${body}${statLine}\n_${closing}_`;
}

function assemblePulse(article: NewsArticle, stat: ExtractedStat | null): string {
  const statStr = stat ? `*${stat.value}*` : '';
  const topicShort = article.title.split(',')[0].split('.')[0].trim();

  const templates = [
    `${statStr ? `${statStr}. ` : ''}${topicShort}. The signal is clear and the window is narrowing. Worth checking your numbers against this one.`,
    `Quick flag: ${topicShort}${statStr ? ` (${statStr})` : ''}. If you haven't reviewed your position on this, today's a good day.`,
    `${topicShort}.${statStr ? ` The data: ${statStr}.` : ''} The smart money is already repositioning. Quietly.`,
    `Signal worth noting: ${topicShort}${statStr ? `, ${statStr}` : ''}. The second-order effects will matter more than the headline.`,
  ];

  return pickRandom(templates);
}

function assembleInsiderNote(article: NewsArticle, room: RoomId, stat: ExtractedStat | null): string {
  const topicShort = article.title.split(',')[0].split('.')[0].trim();

  const openers = [
    'Quick thought before the week gets busy.',
    'Something caught my eye this morning.',
    'Been thinking about this since it crossed my desk.',
    'Wanted to share this before it gets buried in the news cycle.',
    'Not making a big deal of this publicly, but worth flagging here.',
  ];

  const opener = pickRandom(openers);
  const statLine = stat ? ` The data point that stood out: *${stat.value}*.` : '';
  const closing = pickRandom([
    'Hope that helps. Happy to discuss privately.',
    'Worth keeping an eye on. Let me know if you want more context.',
    'Thought this group would appreciate the heads up.',
    'Just a signal, not advice. But the pattern is worth watching.',
  ]);

  return `${opener}\n\n${topicShort}${statLine} ${pickRandom(ROOM_BODY[room])(article).split('\n')[0]}\n\n${closing}`;
}

function assembleExclusive(article: NewsArticle, room: RoomId, stat: ExtractedStat | null): string {
  const openers = [
    'Before this hits the wires more broadly.',
    'This hasn\'t gotten the attention it deserves yet.',
    'Sharing this here first.',
    'Intelligence that\'s still ahead of the mainstream.',
  ];

  const opener = pickRandom(openers);
  const body = pickRandom(ROOM_BODY[room])(article);
  const statLine = stat ? `\nKey data: *${stat.value}*.\n` : '';
  const closing = pickRandom(ROOM_CLOSINGS[room]);

  return `${opener}\n\n${body}${statLine}\n_${closing}_`;
}

// ─── Main engine ────────────────────────────────────────────────

export function generatePost(
  articles: NewsArticle[],
  room: RoomId,
  postTypeId: PostTypeId,
  customTopic?: string,
): GeneratedPost {
  // Select the best article (first one is most recent from approved source)
  const article = articles[0] || {
    title: customTopic || 'UAE financial markets signal shift',
    url: '',
    source: 'Market Intelligence',
    date: dateFormatted.short,
    description: '',
  };

  // Extract stat from article
  const stat = extractStat(article.title, article.description);

  // Generate headline
  const headline = generateHeadline(article.title);

  // Build subline
  const subline = `${article.source} | ${dateFormatted.monthYear}${stat ? ` | ${stat.value}` : ''}`;

  // Assemble post text based on post type
  let text: string;
  switch (postTypeId) {
    case 'observation':
      text = assembleObservation(article, room, stat);
      break;
    case 'alert':
      text = assembleAlert(article, room, stat);
      break;
    case 'poll':
      text = assemblePoll(article, room);
      break;
    case 'pulse':
      text = assemblePulse(article, stat);
      break;
    case 'voicenote':
      text = assembleInsiderNote(article, room, stat);
      break;
    case 'exclusive':
      text = assembleExclusive(article, room, stat);
      break;
    case 'generic':
    default:
      text = assembleGeneric(article, room, stat);
      break;
  }

  return {
    text,
    headline,
    subline,
    stat: stat?.value || '',
    statLabel: stat?.label || headline.split(/\s+/).slice(0, 3).join(' '),
    statDirection: stat?.direction || 'neutral',
    source: article.source,
    sourceUrl: article.url,
  };
}
