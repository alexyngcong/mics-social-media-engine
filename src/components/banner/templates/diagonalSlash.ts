import type { TemplateFactory } from '../../../types';

/** Bold diagonal slash of room color cutting across a dark canvas. */
export const diagonalSlash: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(135deg,transparent 35%,${roomColor}10 36%,${roomColor}08 50%,transparent 51%),linear-gradient(315deg,transparent 60%,${accentColor}06 61%,transparent 75%),linear-gradient(165deg,#060612 0%,#0b1020 40%,#06080f 100%)`,
  bgColors: ['#060612', '#0b1020', '#06080f'],
  orbs: [
    { top: '15%', left: '70%', size: 180, color: roomColor, opacity: 0.07 },
    { top: '70%', left: '20%', size: 220, color: accentColor, opacity: 0.04 },
  ],
  statColor: '#fff',
  headlineSize: 28,
  accent: roomColor,
  photoLayout: 'none' as const,
});
