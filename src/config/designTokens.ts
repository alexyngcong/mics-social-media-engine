export const tokens = {
  colors: {
    bronze: '#A8926A',
    bronzeLight: '#C4AD8A',
    bronzeDark: '#8A7656',
    ink: '#060610',
    inkMid: '#0B0B1A',
    inkCard: '#101024',
    inkElement: '#16162E',
    inkBorder: '#1E1E38',
    textPrimary: '#EAE6DE',
    textMuted: '#B0AAB0',
    textDim: '#6A6478',
    textGhost: '#3E3A50',
    signalGreen: '#4ADE80',
    signalAmber: '#F0C050',
    signalRed: '#EF5555',
    signalBlue: '#5B8DEE',
    signalPurple: '#A78BFA',
  },
  fonts: {
    serif: "'Cormorant Garamond', Georgia, serif",
    sans: "'Figtree', 'Segoe UI', system-ui, sans-serif",
  },
  radii: {
    base: '10px',
    large: '14px',
  },
} as const;

export const fontImportUrl =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Figtree:wght@300;400;500;600;700;800&display=swap';
