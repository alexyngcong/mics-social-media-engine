import type { TemplateFactory } from '../../../types';

export const accentGlow: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(135deg,${roomColor}18 0%,transparent 40%),linear-gradient(315deg,${accentColor}14 0%,transparent 40%),linear-gradient(180deg,#06060f 0%,#0d1225 50%,#080c18 100%)`,
  bgColors: ['#06060f', '#0d1225', '#080c18'],
  orbs: [
    { top: '20%', left: '75%', size: 200, color: roomColor, opacity: 0.08 },
    { top: '60%', left: '5%', size: 150, color: accentColor, opacity: 0.04 },
  ],
  statColor: roomColor,
  headlineSize: 26,
  accent: accentColor,
  photoLayout: 'none',
});
