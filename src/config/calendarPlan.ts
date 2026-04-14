import type { RoomId, CalendarEntry } from '../types';

/**
 * Optimized CFO engagement rhythm — 3 posts per week ONLY.
 *
 * WHY 3 NOT 5:
 * - Less = more exclusive. Each post gets full attention.
 * - Silence builds anticipation. CFOs notice when you DON'T post.
 * - Quality over frequency. Every post must earn its spot.
 *
 * POSTING DAYS (UAE time):
 * - Sunday   8:00 PM — "Week Ahead Signal" (CFOs winding down, thinking ahead)
 * - Tuesday  9:00 AM — "Intelligence Drop" (Monday backlog cleared, strategic mode)
 * - Thursday 1:30 PM — "Closing Signal" (end-of-week, creates weekend DMs)
 *
 * SILENCE DAYS: Monday, Wednesday, Friday, Saturday
 * Silence is a feature, not a gap.
 *
 * ROOM ROTATION (3-week cycle, then repeats):
 * Week A: Growth (Tue) → Risk (Thu) → Capital (Sun)
 * Week B: Risk (Tue) → Capital (Thu) → Growth (Sun)
 * Week C: Capital (Tue) → Growth (Thu) → Risk (Sun)
 */

// ─── Room rotation by week cycle and day ────────────────────────

type WeekCycle = 'A' | 'B' | 'C';

const ROOM_ROTATION: Record<WeekCycle, Record<number, RoomId>> = {
  A: { 0: 'capital', 2: 'growth', 4: 'risk' },    // Sun=Capital, Tue=Growth, Thu=Risk
  B: { 0: 'growth', 2: 'risk', 4: 'capital' },     // Sun=Growth, Tue=Risk, Thu=Capital
  C: { 0: 'risk', 2: 'capital', 4: 'growth' },     // Sun=Risk, Tue=Capital, Thu=Growth
};

function getWeekCycle(date: Date): WeekCycle {
  // Determine which week of the rotation we're in based on ISO week number
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekNum = Math.floor(dayOfYear / 7);
  const cycle = weekNum % 3;
  return (['A', 'B', 'C'] as WeekCycle[])[cycle];
}

// ─── Posting times ──────────────────────────────────────────────

const POST_TIMES: Record<number, { time: string; label: string }> = {
  0: { time: '20:00', label: '8:00 PM UAE' },   // Sunday evening
  2: { time: '09:00', label: '9:00 AM UAE' },   // Tuesday morning
  4: { time: '13:30', label: '1:30 PM UAE' },   // Thursday afternoon
};

// ─── Topic pools (enriched with April 2026 data) ────────────────

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

/** Only post on Sunday, Tuesday, Thursday */
export function isPostingDay(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4;
}

export function generateMonthPlan(year: number, month: number): Record<string, CalendarEntry> {
  const entries: Record<string, CalendarEntry> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dow = date.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (!isPostingDay(dow)) {
      entries[dateStr] = {
        date: dateStr,
        room: 'growth',
        topic: '',
        postTime: '',
        postTimeLabel: dow === 5 || dow === 6 ? 'Weekend' : 'Strategic Silence',
        status: 'skipped',
      };
      continue;
    }

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
