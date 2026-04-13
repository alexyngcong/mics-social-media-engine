import type { TemplateFactory } from '../../../types';

/** Full photo with room-colored duotone effect. Modern, branded look. */
export const photoDuotone: TemplateFactory = (roomColor, _accentColor) => ({
  bg: `linear-gradient(180deg,rgba(4,4,12,0.2) 0%,rgba(4,4,12,0.7) 60%,rgba(4,4,12,0.95) 100%)`,
  bgColors: ['#080818', '#0a0f20', '#060610'],
  orbs: [],
  statColor: '#fff',
  headlineSize: 28,
  accent: roomColor,
  photoLayout: 'duotone',
  photoOverlayOpacity: 0.4,
  photoDuotoneColor: roomColor,
});
