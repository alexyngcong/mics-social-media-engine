import type { PostType } from '../types';

export const POST_TYPES: PostType[] = [
  {
    id: 'observation',
    label: 'Market Observation',
    icon: '\u{1F50D}',
    day: 'Monday',
    promptFragment:
      'a sharp market observation with a verified data point that challenges assumptions. End with an advisory seed.',
  },
  {
    id: 'alert',
    label: 'CFO Alert',
    icon: '\u26A1',
    day: 'Tuesday',
    promptFragment:
      'an urgent but measured alert about a development impacting CFO decisions in the next 30 days. End with what they should be reviewing now.',
  },
  {
    id: 'poll',
    label: 'Poll / Discussion',
    icon: '\u{1F4CA}',
    day: 'Thursday',
    promptFragment:
      'a poll or discussion question around a current tension CFOs face. Make readers realize this needs deeper analysis.',
  },
  {
    id: 'generic',
    label: 'Value Post',
    icon: '\u{1F48E}',
    day: 'Any day',
    promptFragment:
      'a standalone insight a CFO would screenshot. End with a forward-looking implication hinting at need for advisory guidance.',
  },
];
