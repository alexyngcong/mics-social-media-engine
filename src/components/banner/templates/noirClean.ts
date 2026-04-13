import type { TemplateFactory } from '../../../types';

/** Near-black with barely visible texture. Maximum contrast for text impact. */
export const noirClean: TemplateFactory = (roomColor) => ({
  bg: `radial-gradient(ellipse at 50% 100%,${roomColor}08,transparent 50%),linear-gradient(180deg,#030308 0%,#060610 40%,#030308 100%)`,
  bgColors: ['#030308', '#060610', '#030308'],
  orbs: [],
  statColor: '#fff',
  headlineSize: 30,
  accent: roomColor,
  photoLayout: 'none' as const,
});
