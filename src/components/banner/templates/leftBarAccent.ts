import type { TemplateFactory } from '../../../types';

export const leftBarAccent: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(90deg,${roomColor}14 0%,transparent 6%),radial-gradient(ellipse at 60% 35%,${roomColor}12,transparent 50%),linear-gradient(180deg,#08081a 0%,#0d1428 100%)`,
  bgColors: ['#08081a', '#0d1428', '#08081a'],
  orbs: [
    { top: '30%', left: '85%', size: 160, color: accentColor, opacity: 0.06 },
    { top: '65%', left: '20%', size: 200, color: roomColor, opacity: 0.04 },
  ],
  statColor: roomColor,
  headlineSize: 26,
  accent: accentColor,
  leftBar: true,
  photoLayout: 'none',
});
