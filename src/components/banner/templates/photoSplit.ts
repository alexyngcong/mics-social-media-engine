import type { TemplateFactory } from '../../../types';

/** Photo on right half, content panel on left. Clean split composition. */
export const photoSplit: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(135deg,#080818 0%,#0f1528 100%)`,
  bgColors: ['#080818', '#0c1225', '#0f1528'],
  orbs: [
    { top: '30%', left: '10%', size: 180, color: roomColor, opacity: 0.06 },
  ],
  statColor: '#fff',
  headlineSize: 26,
  accent: roomColor,
  photoLayout: 'split-right',
  photoOverlayOpacity: 0.3,
});
