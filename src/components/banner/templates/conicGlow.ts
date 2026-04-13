import type { TemplateFactory } from '../../../types';

export const conicGlow: TemplateFactory = (roomColor, accentColor) => ({
  bg: `radial-gradient(ellipse at 50% 30%,${roomColor}18,transparent 55%),conic-gradient(from 180deg at 50% 50%,${roomColor}06,transparent,${accentColor}04,transparent,${roomColor}06),linear-gradient(180deg,#090914 0%,#0e1428 50%,#080c1a 100%)`,
  bgColors: ['#090914', '#0e1428', '#080c1a'],
  orbs: [
    { top: '25%', left: '70%', size: 220, color: roomColor, opacity: 0.05 },
    { top: '55%', left: '25%', size: 160, color: accentColor, opacity: 0.04 },
  ],
  statColor: '#fff',
  headlineSize: 28,
  accent: roomColor,
  photoLayout: 'none',
});
