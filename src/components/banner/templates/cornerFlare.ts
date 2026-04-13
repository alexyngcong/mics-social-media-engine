import type { TemplateFactory } from '../../../types';

/** Dramatic room-color flare bleeding from bottom-right corner. */
export const cornerFlare: TemplateFactory = (roomColor, accentColor) => ({
  bg: `radial-gradient(ellipse at 90% 90%,${roomColor}28,transparent 50%),radial-gradient(ellipse at 10% 15%,${accentColor}10,transparent 40%),linear-gradient(200deg,#070714 0%,#0a1024 60%,#050812 100%)`,
  bgColors: ['#070714', '#0a1024', '#050812'],
  orbs: [
    { top: '75%', left: '80%', size: 300, color: roomColor, opacity: 0.08 },
    { top: '10%', left: '10%', size: 180, color: accentColor, opacity: 0.03 },
  ],
  statColor: '#fff',
  headlineSize: 28,
  accent: roomColor,
  photoLayout: 'none' as const,
});
