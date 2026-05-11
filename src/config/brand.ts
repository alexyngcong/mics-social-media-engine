/**
 * Brand voice + live date helpers.
 *
 * AUDIT-REFRESH POLICY (per posting requirements):
 *   - `dateFormatted` is implemented as getters, NOT a cached object.
 *   - Every property access re-reads the system clock.
 *   - No date string is ever cached past a single tick of consumption.
 *   - This guarantees: if the app sits open across midnight or longer,
 *     the next post stamps the CURRENT real-time date, not the stale
 *     bundle-load date.
 */

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

/**
 * Live date helpers. Every property is a getter — re-reads `new Date()`
 * on each access. There is NO static cached "today" value anywhere.
 */
export const dateFormatted = {
  get full() {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  },
  get short() {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  },
  get monthYear() {
    return new Date().toLocaleDateString('en-GB', {
      month: 'long', year: 'numeric',
    });
  },
  get year() {
    return String(new Date().getFullYear());
  },
  /** Audit timestamps (always live, never cached) */
  get nowMs() { return Date.now(); },
  get nowISO() { return new Date().toISOString(); },
  get nowReadable() {
    return new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
    }) + ' UAE';
  },
};
