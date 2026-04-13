import type { TemplateFactory } from '../../../types';

/** Vertical two-tone split with room and accent colors on deep noir. */
export const dualTone: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(90deg,${roomColor}14 0%,transparent 45%),linear-gradient(270deg,${accentColor}10 0%,transparent 45%),radial-gradient(ellipse at 50% 50%,${roomColor}06,transparent 55%),linear-gradient(180deg,#06060e 0%,#0c1022 50%,#06060e 100%)`,
  bgColors: ['#06060e', '#0c1022', '#06060e'],
  orbs: [
    { top: '25%', left: '12%', size: 200, color: roomColor, opacity: 0.06 },
    { top: '65%', left: '85%', size: 200, color: accentColor, opacity: 0.05 },
  ],
  statColor: '#fff',
  headlineSize: 27,
  accent: roomColor,
  photoLayout: 'none' as const,
});
