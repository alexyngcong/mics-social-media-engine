import type { PostType } from '../types';

export const POST_TYPES: PostType[] = [
  // ── Core Strategy (aligned to PDF weekly rhythm) ──
  {
    id: 'observation',
    label: 'Market Observation',
    icon: '🔍',
    day: 'Monday',
    category: 'core',
    description: 'Sharp data point that challenges assumptions',
    promptFragment:
      'a sharp market observation with a verified data point that challenges assumptions. The closing line must create an information gap that makes the reader feel they need to speak to someone who understands this deeper. End with an advisory seed that subtly hints at the room\'s service area without naming any company.',
  },
  {
    id: 'alert',
    label: 'CFO Alert',
    icon: '⚡',
    day: 'Tuesday',
    category: 'core',
    description: 'Urgent development impacting CFO decisions',
    promptFragment:
      'an urgent but measured alert about a development impacting CFO decisions in the next 30 days. Frame it as intelligence that arrived through insider channels. End with what they should be reviewing NOW, making them feel they need specialized guidance to act on it.',
  },
  {
    id: 'poll',
    label: 'Poll / Discussion',
    icon: '📊',
    day: 'Thursday',
    category: 'core',
    description: 'Tension point CFOs face, with a poll question',
    promptFragment:
      'a poll or discussion question around a current tension CFOs face. Frame the question so that each answer option reveals a strategic gap. Make readers realize this needs deeper analysis than they can do alone. The poll should surface a need for advisory without naming any service.',
  },
  {
    id: 'generic',
    label: 'Value Post',
    icon: '💎',
    day: 'Any day',
    category: 'core',
    description: 'Standalone insight a CFO would screenshot',
    promptFragment:
      'a standalone insight a CFO would screenshot and forward to their board. End with a forward-looking implication that creates a genuine sense of "I need to talk to someone who understands this." The closing must hint at the room\'s advisory area without naming any firm or service.',
  },

  // ── Engagement Tactics (from campaign plan) ──
  {
    id: 'pulse',
    label: 'Pulse Signal',
    icon: '🎯',
    day: 'Any day',
    category: 'engagement',
    description: 'Sharp micro-insight that makes CFOs check their numbers',
    noBanner: true,
    promptFragment:
      'a sharp micro-insight in 40-60 words MAXIMUM. One powerful observation that makes a CFO immediately check their own numbers or question their current position. No preamble, no setup. Just the signal. Write it as a single punchy paragraph that feels like a private tip from a well-connected insider. The brevity IS the power. End with one line that creates urgency to act.',
  },
  {
    id: 'voicenote',
    label: 'Insider Note',
    icon: '💬',
    day: 'Any day',
    category: 'engagement',
    description: 'Personal, casual message — feels like a DM, not a broadcast',
    noBanner: true,
    promptFragment:
      'a short, personal, casual message written as if you are typing a quick personal note directly to the group. 80-120 words. First person. Conversational. Start with something like "Quick thought before the week starts..." or "Something I keep hearing from people I trust..." Use WhatsApp formatting *bold* for one key number only. NO formal structure, NO paragraphs headers. Just a natural, warm, insightful message from someone who cares about this group. Include one specific data point that surprises. End with something personal and forward-looking like "Hope that helps. Have a good week everyone." or "Thought this was worth flagging. Talk soon." The power is in how DIFFERENT this feels from the structured intelligence posts.',
  },
  {
    id: 'exclusive',
    label: 'Exclusive Intel',
    icon: '🔒',
    day: 'Mid-week',
    category: 'engagement',
    description: 'Insider intelligence drop that creates scarcity',
    promptFragment:
      'an exclusive intelligence drop that feels like privileged, insider information shared only with this private circle. Open with a subtle signal of exclusivity (e.g., "Something worth flagging before it hits the wires..." or "Picking up signals from inside circles that..."). 80-120 words. Create the feeling that being in this group means getting information first. The intelligence must be real and verified but framed as early access. End with an advisory seed that makes the reader feel they need to act before the mainstream catches on.',
  },
];

/** Get only core strategy types */
export const CORE_TYPES = POST_TYPES.filter(t => t.category === 'core');

/** Get only engagement types */
export const ENGAGEMENT_TYPES = POST_TYPES.filter(t => t.category === 'engagement');
