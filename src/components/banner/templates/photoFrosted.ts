import type { TemplateFactory } from '../../../types';

/** Blurred photo background with frosted glass content panel. */
export const photoFrosted: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(180deg,rgba(4,4,12,0.4) 0%,rgba(4,4,12,0.6) 100%)`,
  bgColors: ['#0a0a1a', '#0e1428', '#080c18'],
  orbs: [
    { top: '20%', left: '60%', size: 200, color: roomColor, opacity: 0.04 },
  ],
  statColor: '#fff',
  headlineSize: 28,
  accent: roomColor,
  photoLayout: 'frosted',
  photoOverlayOpacity: 0.35,
});
