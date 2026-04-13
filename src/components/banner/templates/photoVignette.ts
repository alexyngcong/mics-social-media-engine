import type { TemplateFactory } from '../../../types';

/** Photo with heavy dark vignette. Content glows through the center. */
export const photoVignette: TemplateFactory = (roomColor, _accentColor) => ({
  bg: `radial-gradient(ellipse at 50% 40%,transparent 20%,rgba(4,4,12,0.85) 70%,rgba(4,4,12,0.98) 100%)`,
  bgColors: ['#060610', '#0a0f20', '#060610'],
  orbs: [],
  statColor: '#fff',
  headlineSize: 30,
  accent: roomColor,
  photoLayout: 'vignette',
  photoOverlayOpacity: 0.5,
});
