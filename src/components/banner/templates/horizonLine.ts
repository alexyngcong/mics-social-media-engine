import type { TemplateFactory } from '../../../types';

/** Horizon glow effect - room color light emanating from a horizontal band. */
export const horizonLine: TemplateFactory = (roomColor, accentColor) => ({
  bg: `radial-gradient(ellipse 120% 15% at 50% 48%,${roomColor}22,transparent),radial-gradient(ellipse at 30% 80%,${accentColor}08,transparent 45%),linear-gradient(180deg,#04040d 0%,#080e20 48%,#04040d 100%)`,
  bgColors: ['#04040d', '#080e20', '#04040d'],
  orbs: [
    { top: '43%', left: '50%', size: 600, color: roomColor, opacity: 0.02 },
    { top: '50%', left: '15%', size: 120, color: accentColor, opacity: 0.05 },
  ],
  statColor: '#fff',
  headlineSize: 29,
  accent: roomColor,
  photoLayout: 'none' as const,
});
