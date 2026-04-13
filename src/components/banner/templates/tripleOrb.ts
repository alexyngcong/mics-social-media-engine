import type { TemplateFactory } from '../../../types';

export const tripleOrb: TemplateFactory = (roomColor, accentColor) => ({
  bg: `radial-gradient(circle at 15% 25%,${roomColor}22,transparent 35%),radial-gradient(circle at 85% 65%,${accentColor}16,transparent 35%),radial-gradient(circle at 50% 85%,${roomColor}10,transparent 30%),linear-gradient(180deg,#070712 0%,#0c1020 100%)`,
  bgColors: ['#070712', '#0c1020', '#070712'],
  orbs: [
    { top: '18%', left: '8%', size: 140, color: roomColor, opacity: 0.1 },
    { top: '58%', left: '78%', size: 180, color: accentColor, opacity: 0.06 },
    { top: '80%', left: '40%', size: 100, color: roomColor, opacity: 0.05 },
  ],
  statColor: '#fff',
  headlineSize: 27,
  accent: roomColor,
});
