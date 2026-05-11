/**
 * MARKETING GURU — Topic-aware framework selector
 *
 * Encodes proven copywriting frameworks that real social-media marketers
 * apply when choosing how to write a post. Research consistently shows
 * posts using these patterns get 2–3× higher engagement than unstructured
 * content (Buffer, Hootsuite, Thrive copy data, 2024–2026).
 *
 * The guru INSPECTS the article + UAE context + post type and recommends
 * the framework most likely to resonate with the target audience (UAE
 * C-suite). The recommendation drives layout selection in contentEngine.
 *
 * Frameworks supported:
 *
 *   AIDA  (Attention, Interest, Desire, Action)
 *         → best for: growth signals, new opportunities, fresh stats
 *
 *   PAS   (Problem, Agitate, Solution)
 *         → best for: regulatory deadlines, compliance risks, penalties
 *
 *   BAB   (Before, After, Bridge)
 *         → best for: regulatory changes (old rule vs new rule), shifts
 *
 *   HSO   (Hook, Story, Offer)
 *         → best for: insider observations, exclusive intelligence
 *
 *   SCQA  (Situation, Complication, Question, Answer)
 *         → best for: macro/world news with UAE transmission
 *
 *   DATA  (Stat, Context, Implication)
 *         → best for: posts where the number IS the story
 *
 * ZERO API CALLS — pure rule engine, runs instantly.
 */

import type { NewsArticle } from './newsFetcher';
import type { RoomId, PostTypeId } from '../types';
import { extractFacts } from './nlpEnhancer';

export type Framework = 'AIDA' | 'PAS' | 'BAB' | 'HSO' | 'SCQA' | 'DATA';

export interface FrameworkRecommendation {
  framework: Framework;
  /** Human-readable rationale for telemetry / debugging */
  rationale: string;
  /** Confidence 0..1 (heuristic) */
  confidence: number;
}

/**
 * Recommend the best copywriting framework for an article + post type.
 *
 * Decision logic priority (top → bottom):
 *   1. Stat-heavy article + observation/alert → DATA
 *   2. Regulatory + deadline language → PAS
 *   3. Regulatory + comparison signal → BAB
 *   4. Macro/World room with UAE-transmission → SCQA
 *   5. Exclusive / insider post type → HSO
 *   6. Default → AIDA
 */
export function recommendFramework(
  article: NewsArticle,
  room: RoomId,
  postType: PostTypeId,
): FrameworkRecommendation {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const facts = extractFacts(text);

  const hasMoney = facts.money.length > 0;
  const hasPercent = facts.percentages.length > 0;
  const hasDeadline = facts.hasDeadlineLanguage;
  const hasComparison = /\b(from|to|previously|now|before|after|amended|replaces?|updated)\b/.test(text);
  const isUaeRegulatory = room === 'risk' || /\b(fta|mof|dfsa|adgm|cbuae|mohre|moiat)\b/.test(text);
  const isMacro = room === 'world' || /\b(opec|fed|oecd|brics|imf|world bank|pillar two|carbon)\b/.test(text);
  const isInsiderFormat = postType === 'voicenote' || postType === 'exclusive';

  // 1. STAT-FIRST — number IS the story
  if ((hasMoney || hasPercent) && (postType === 'observation' || postType === 'alert')) {
    return {
      framework: 'DATA',
      rationale: `Stat detected (${hasMoney ? facts.money[0] : facts.percentages[0]}); lead with the number.`,
      confidence: 0.85,
    };
  }

  // 2. REGULATORY DEADLINE — Problem/Agitate/Solution drives compliance urgency
  if (isUaeRegulatory && hasDeadline) {
    return {
      framework: 'PAS',
      rationale: 'Regulatory item with deadline language; PAS creates compliance urgency.',
      confidence: 0.9,
    };
  }

  // 3. REGULATORY CHANGE/AMENDMENT — Before/After/Bridge makes the change concrete
  if (isUaeRegulatory && hasComparison) {
    return {
      framework: 'BAB',
      rationale: 'Regulatory amendment or comparison signal; BAB makes the change concrete.',
      confidence: 0.8,
    };
  }

  // 4. MACRO / WORLD ROOM — Situation/Complication/Question/Answer frames transmission
  if (isMacro) {
    return {
      framework: 'SCQA',
      rationale: 'Macro / global topic; SCQA frames regional transmission as a Q&A.',
      confidence: 0.8,
    };
  }

  // 5. INSIDER / EXCLUSIVE formats — Hook/Story/Offer matches the personal aside register
  if (isInsiderFormat) {
    return {
      framework: 'HSO',
      rationale: 'Insider / exclusive post type; HSO matches the personal-aside register.',
      confidence: 0.85,
    };
  }

  // 6. GROWTH / OPPORTUNITY signals — AIDA's funnel structure is the gold standard
  if (room === 'growth' || room === 'capital') {
    return {
      framework: 'AIDA',
      rationale: 'Growth or capital signal; AIDA funnel is the gold standard for opportunity posts.',
      confidence: 0.75,
    };
  }

  // Default — AIDA is the safest general-purpose framework
  return {
    framework: 'AIDA',
    rationale: 'Default — AIDA is the safest general-purpose marketing framework.',
    confidence: 0.5,
  };
}

/**
 * Map a framework to the layout-ID it prefers in the content engine.
 * Used by the layout selector to bias toward the recommended structure.
 */
export const FRAMEWORK_TO_LAYOUT: Record<Framework, string> = {
  AIDA: 'aida-funnel',
  PAS: 'pas-problem',
  BAB: 'bab-bridge',
  HSO: 'hso-story',
  SCQA: 'scqa-frame',
  DATA: 'stat-reveal',
};

/**
 * Structural prompts for each framework — used inside the layout assembler
 * to make sure the post actually follows the framework's pattern.
 */
export const FRAMEWORK_STRUCTURE: Record<Framework, {
  attentionLine: (topic: string) => string;
  contextLabel: string;
  resolutionLabel: string;
}> = {
  AIDA: {
    attentionLine: (t) => `${t}.`,
    contextLabel: 'What this means',
    resolutionLabel: 'What to watch',
  },
  PAS: {
    attentionLine: (t) => `${t}.`,
    contextLabel: 'The pressure point',
    resolutionLabel: 'The route through',
  },
  BAB: {
    attentionLine: (t) => `${t}.`,
    contextLabel: 'Before',
    resolutionLabel: 'After',
  },
  HSO: {
    attentionLine: (t) => `${t}.`,
    contextLabel: 'The thread',
    resolutionLabel: 'The angle',
  },
  SCQA: {
    attentionLine: (t) => `${t}.`,
    contextLabel: 'The wrinkle',
    resolutionLabel: 'The read',
  },
  DATA: {
    attentionLine: (t) => `${t}.`,
    contextLabel: 'Behind the print',
    resolutionLabel: 'Where this lands',
  },
};
