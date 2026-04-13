const today = new Date();

export const brand = {
  name: 'MICS International',
  tagline: 'DIFC Licensed Financial Advisory',
  community: 'CFOs Private Insights Circle',
  communityShort: 'CFOs PRIVATE\nINSIGHTS CIRCLE',
  footer: 'MICS International | DIFC | Peer Intelligence',
  advisorySeeds: [
    'The firms ahead of this are renegotiating [X] now, not waiting',
    'Worth asking: has your current structure been stress-tested against this?',
    "If your [tax/capital/entity] setup hasn't been reviewed since [event], now's the time",
    'Across our advisory conversations, the sharpest CFOs are already [doing X]',
    'Three clients this month asked about [X], that usually means the wave is coming',
    'The window to restructure before [deadline] is narrower than most realize',
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
