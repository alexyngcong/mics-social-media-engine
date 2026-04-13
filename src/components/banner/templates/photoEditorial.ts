import type { TemplateFactory } from '../../../types';

/** Full-bleed photo with dark gradient overlay. Magazine editorial style. */
export const photoEditorial: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(180deg,rgba(4,4,12,0.3) 0%,rgba(4,4,12,0.85) 55%,rgba(4,4,12,0.97) 100%)`,
  bgColors: ['#08081a', '#0c1020', '#060610'],
  orbs: [],
  statColor: '#fff',
  headlineSize: 30,
  accent: roomColor,
  photoLayout: 'fullbleed',
  photoOverlayOpacity: 0.55,
});
