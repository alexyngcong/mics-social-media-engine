import type { TemplateFactory } from '../../../types';

export const classicDark: TemplateFactory = (roomColor, accentColor) => ({
  bg: `radial-gradient(ellipse at 30% 20%,${roomColor}22,transparent 50%),radial-gradient(ellipse at 70% 80%,${accentColor}18,transparent 50%),linear-gradient(160deg,#080818 0%,#0f1528 40%,#0a0f20 100%)`,
  bgColors: ['#080818', '#0f1528', '#0a0f20'],
  orbs: [
    { top: '15%', left: '60%', size: 280, color: roomColor, opacity: 0.06 },
    { top: '55%', left: '10%', size: 180, color: accentColor, opacity: 0.05 },
    { top: '75%', left: '70%', size: 120, color: roomColor, opacity: 0.04 },
  ],
  statColor: '#fff',
  headlineSize: 28,
  accent: roomColor,
  photoLayout: 'none',
});
