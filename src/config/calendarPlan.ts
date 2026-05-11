import type { RoomId, CalendarEntry } from '../types';

/**
 * Open posting schedule — every day is a posting day.
 *
 * There is NO weekly cap and NO "silence" day. Post whenever the signal
 * warrants it. The schedule below is a suggested rotation that distributes
 * the 4 intelligence rooms across the 7 days of the week with sensible
 * times, on a 3-week cycle so the same room doesn't always land on the
 * same day.
 *
 * SUGGESTED DAY ANGLES (for reference, not enforcement):
 *  - Sun  Week Ahead Signal — 8:00 PM UAE
 *  - Mon  Monday Intelligence — 9:00 AM UAE
 *  - Tue  Intelligence Drop — 9:00 AM UAE
 *  - Wed  Midweek Pulse — 1:00 PM UAE
 *  - Thu  Sector Read — 1:30 PM UAE
 *  - Fri  Closing Signal — 11:00 AM UAE
 *  - Sat  Insider Note — 5:00 PM UAE
 *
 * ROOM ROTATION (3-week cycle, then repeats). Each cycle covers all 7 days
 * so every day has a planned room.
 */

// ─── Room rotation by week cycle and day ────────────────────────

type WeekCycle = 'A' | 'B' | 'C';

const ROOM_ROTATION: Record<WeekCycle, Record<number, RoomId>> = {
  // Sun Mon Tue Wed Thu Fri Sat
  A: { 0: 'capital', 1: 'growth',  2: 'risk',    3: 'world',   4: 'growth',  5: 'capital', 6: 'world'  },
  B: { 0: 'growth',  1: 'risk',    2: 'capital', 3: 'world',   4: 'risk',    5: 'growth',  6: 'capital' },
  C: { 0: 'risk',    1: 'capital', 2: 'growth',  3: 'world',   4: 'capital', 5: 'risk',    6: 'growth'  },
};

function getWeekCycle(date: Date): WeekCycle {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekNum = Math.floor(dayOfYear / 7);
  const cycle = weekNum % 3;
  return (['A', 'B', 'C'] as WeekCycle[])[cycle];
}

// ─── Posting times (suggested per day) ──────────────────────────

const POST_TIMES: Record<number, { time: string; label: string }> = {
  0: { time: '20:00', label: '8:00 PM UAE'  }, // Sunday   — Week Ahead Signal
  1: { time: '09:00', label: '9:00 AM UAE'  }, // Monday   — Monday Intelligence
  2: { time: '09:00', label: '9:00 AM UAE'  }, // Tuesday  — Intelligence Drop
  3: { time: '13:00', label: '1:00 PM UAE'  }, // Wednesday — Midweek Pulse
  4: { time: '13:30', label: '1:30 PM UAE'  }, // Thursday — Sector Read
  5: { time: '11:00', label: '11:00 AM UAE' }, // Friday   — Closing Signal
  6: { time: '17:00', label: '5:00 PM UAE'  }, // Saturday — Insider Note
};

// ─── Topic pools ────────────────────────────────────────────────

const GROWTH_TOPICS = [
  'Dubai real estate Q1 2026 — AED 252B transactions, 31% YoY surge',
  'GCC IPO pipeline: 73 listings queued including Etihad, Masdar, EGA',
  'UAE GDP at 5.6% in 2026 — CBUAE defies regional gloom',
  'Dubai FDI: #1 global destination for greenfield projects, 4th straight year',
  'DIFC and ADGM new registrations surge — free zone expansion signals',
  'Abu Dhabi sovereign wealth fund moves — Mubadala and ADQ strategy shifts',
  'UAE non-oil GDP projected at 5.1% — manufacturing and fintech leading',
  'Saudi-UAE trade corridor: bilateral deal flow accelerating in Q2 2026',
  'Dubai off-plan property: 44,000+ transactions in Q1, foreign investment up 26%',
  'UAE AI adoption by enterprises: impact on financial services sector',
  'Binghatti, Majid Al Futtaim IPO prospects — Dubai capital markets deepening',
  'D33 agenda FDI target: AED 60B/year vs current trajectory analysis',
  'Hamdan bin Mohammed launches Dubai private-sector Agentic AI initiative',
  'MoIAT unlocks AED 18B industrial financing at Make it in the Emirates 2026',
];

const CAPITAL_TOPICS = [
  'CBUAE holds at 3.65% — dirham peg implications as Fed signals "higher for longer"',
  'UAE banking assets hit AED 5.34T — sector ROE approaching 19%',
  'OPEC+ raising output 206kb/d in April — UAE wins higher quota fight',
  'GCC private credit boom — alternative lending as rate environment shifts',
  'Corporate cash management in 3.65% rate environment — optimize or lose',
  'UAE sukuk market 2026 — Islamic finance issuance trends and yields',
  'Dubai REIT performance vs direct property — capital allocation decision',
  'Treasury optimization: working capital efficiency in UAE corporate sector',
  'Profit repatriation structuring under new corporate tax regime',
  'UAE bank lending growth trends — Q1 2026 credit expansion signals',
  'GCC family office asset allocation shifts — regional vs global',
  'Cross-border capital flows: UAE as global remittance and treasury hub',
  'DFSA Islamic finance consultation — DIFC framework enhancement May 2026',
  'ADX and DFM weekly flows — foreign participation drivers',
];

const RISK_TOPICS = [
  'New tax penalty framework effective April 14, 2026 — Cabinet Decision 129',
  'UAE e-invoicing mandate: July 2026 deadline for AED 50M+ businesses',
  'OECD Pillar Two DMTT — penalty-free period closing, MNEs need to prepare',
  'US 10% tariff on GCC: aluminum/steel at 25% — indirect oil price risk',
  'SPV and holding structure transparency tightening — AML obligations up',
  'UAE corporate tax: first filing season lessons and FTA audit signals',
  'FATF mutual evaluation — UAE AML compliance pressure increasing',
  'Transfer pricing documentation: new requirements for UAE group structures',
  'ESG reporting for UAE listed companies — governance compliance shift',
  'UBO register requirements — beneficial ownership disclosure expanding',
  'DIFC and ADGM regulatory enforcement — recent actions and implications',
  'Voluntary disclosure window before new penalty framework — strategic timing',
  'MoHRE Emiratisation deadline 30 June 2026 — financial contributions from July',
  'Tax Procedures Executive Regulation amendments effective April 1, 2026',
];

const WORLD_TOPICS = [
  'US tariffs 10% on GCC — aluminum 25% — what CFOs should watch',
  'Fed "higher for longer" signal — impact on dirham-pegged economies',
  'EU CBAM carbon border tax hitting GCC aluminum and steel exporters',
  'China Belt & Road GCC investments — strategic capital flow shifts',
  'Global AI regulation: cross-border implications for UAE financial sector',
  'BRICS expansion and de-dollarization signals — GCC positioning',
  'India-Middle East economic corridor progress and trade implications',
  'Global energy transition investment — GCC diversification signals',
  'US-China tech decoupling: where UAE and GCC sit in the middle',
  'Emerging market currency moves — capital flow shifts toward GCC safe havens',
  'Central bank digital currencies — GCC CBDC pilots and implications',
  'Global PE dry powder at historic levels — GCC deal flow attractiveness',
  'ECB outlook update — euro area services inflation and GCC trade flow',
  'OECD Pillar Two administrative guidance — UAE in-scope group impact',
];

const TOPIC_POOLS: Record<RoomId, string[]> = {
  growth: GROWTH_TOPICS,
  capital: CAPITAL_TOPICS,
  risk: RISK_TOPICS,
  world: WORLD_TOPICS,
};

function getTopicForDate(room: RoomId, date: Date): string {
  const pool = TOPIC_POOLS[room];
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}

// ─── Calendar generation ────────────────────────────────────────

/**
 * Every day is a posting day under the open schedule. Function retained for
 * compatibility with any caller that still asks the question.
 */
export function isPostingDay(_dayOfWeek: number): boolean {
  void _dayOfWeek;
  return true;
}

export function generateMonthPlan(year: number, month: number): Record<string, CalendarEntry> {
  const entries: Record<string, CalendarEntry> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dow = date.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const cycle = getWeekCycle(date);
    const room = ROOM_ROTATION[cycle][dow] || 'growth';
    const postTime = POST_TIMES[dow] || POST_TIMES[2];
    const topic = getTopicForDate(room, date);

    entries[dateStr] = {
      date: dateStr,
      room,
      topic,
      postTime: postTime.time,
      postTimeLabel: postTime.label,
      status: 'planned',
    };
  }

  return entries;
}

export function getRoomForDay(dayOfWeek: number): RoomId {
  const today = new Date();
  const cycle = getWeekCycle(today);
  return ROOM_ROTATION[cycle][dayOfWeek] || 'growth';
}
