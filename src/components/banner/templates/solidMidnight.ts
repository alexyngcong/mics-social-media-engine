import type { TemplateFactory } from '../../../types';

/** Pure deep midnight with a single subtle room-color pulse. Clean and minimal. */
export const solidMidnight: TemplateFactory = (roomColor) => ({
  bg: `radial-gradient(ellipse at 50% 35%,${roomColor}12,transparent 60%),linear-gradient(180deg,#050510 0%,#0a0e1e 50%,#050510 100%)`,
  bgColors: ['#050510', '#0a0e1e', '#050510'],
  orbs: [
    { top: '30%', left: '50%', size: 400, color: roomColor, opacity: 0.03 },
  ],
  statColor: '#fff',
  headlineSize: 30,
  accent: roomColor,
  photoLayout: 'none' as const,
});
