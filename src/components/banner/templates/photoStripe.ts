import type { TemplateFactory } from '../../../types';

/** Photo strip in upper portion, dark content area below. Clean separation. */
export const photoStripe: TemplateFactory = (roomColor, accentColor) => ({
  bg: `linear-gradient(180deg,transparent 0%,transparent 38%,#080818 38%,#0c1225 100%)`,
  bgColors: ['#080818', '#0c1225', '#080818'],
  orbs: [
    { top: '55%', left: '70%', size: 160, color: roomColor, opacity: 0.05 },
  ],
  statColor: '#fff',
  headlineSize: 27,
  accent: roomColor,
  photoLayout: 'fullbleed',
  photoOverlayOpacity: 0.25,
});
