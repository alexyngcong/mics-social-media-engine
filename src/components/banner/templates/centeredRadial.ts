import type { TemplateFactory } from '../../../types';

export const centeredRadial: TemplateFactory = (roomColor, accentColor) => ({
  bg: `radial-gradient(ellipse at 50% 40%,${roomColor}20,transparent 55%),linear-gradient(180deg,#0a0a1a 0%,#0e1428 35%,#080c18 100%)`,
  bgColors: ['#0a0a1a', '#0e1428', '#080c18'],
  orbs: [
    { top: '10%', left: '80%', size: 240, color: roomColor, opacity: 0.07 },
    { top: '70%', left: '15%', size: 200, color: roomColor, opacity: 0.04 },
    { top: '40%', left: '50%', size: 320, color: accentColor, opacity: 0.03 },
  ],
  statColor: '#fff',
  headlineSize: 30,
  accent: roomColor,
  photoLayout: 'none',
});
