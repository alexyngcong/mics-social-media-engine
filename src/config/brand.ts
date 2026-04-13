const today = new Date();

export const brand = {
  name: 'MICS International',
  tagline: 'DIFC Licensed Financial Advisory',
  community: 'CFOs Private Insights Circle',
  communityShort: 'CFOs PRIVATE\nINSIGHTS CIRCLE',
  footer: 'MICS International | DIFC | Peer Intelligence',
  advisorySeeds: [
    'Most won\'t act on this until it\'s too late. A few already have.',
    'The question isn\'t whether this affects you. It\'s whether you\'re ready.',
    'If you haven\'t stress-tested your structure against this, that\'s your answer.',
    'The smartest CFOs I know are already repositioning. Quietly.',
    'This is the kind of shift that separates prepared from panicked.',
    'By the time this hits mainstream news, the window will be closed.',
    'If this doesn\'t make you question your current setup, you\'re not paying attention.',
    'The ones who moved early on the last cycle? They\'re moving again.',
  ],
  bannedWords: [
    'em dashes', 'semicolons', 'leverage', 'utilize', 'landscape',
    'navigate', 'robust', 'holistic', 'synergy', 'unpack',
  ],
} as const;

export const dateFormatted = {
  full: today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }),
  short: today.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }),
  monthYear: today.toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric',
  }),
  year: String(today.getFullYear()),
};
