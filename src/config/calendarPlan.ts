import type { RoomId, CalendarEntry } from '../types';

/**
 * UAE-centric posting schedule and topic engine.
 *
 * UAE work week: Mon-Fri. Weekend: Sat-Sun.
 * Room rotation by weekday:
 *   Sunday  -> Growth (week-ahead preview)
 *   Monday  -> Capital (financial markets open)
 *   Tuesday -> Risk (mid-week compliance)
 *   Wednesday -> World (global intelligence)
 *   Thursday -> Growth (week wrap-up / momentum)
 *   Friday  -> Capital (treasury / cash flow)
 *   Saturday -> skip (weekend)
 */

const WEEKDAY_ROOM: Record<number, RoomId> = {
  0: 'growth',   // Sunday
  1: 'capital',  // Monday
  2: 'risk',     // Tuesday
  3: 'world',    // Wednesday
  4: 'growth',   // Thursday
  5: 'capital',  // Friday
  6: 'growth',   // Saturday (skip, but fallback)
};

/** Best WhatsApp engagement times (UAE, GMT+4) */
const POST_TIMES: { time: string; label: string }[] = [
  { time: '08:30', label: '8:30 AM UAE' },
  { time: '12:30', label: '12:30 PM UAE' },
  { time: '18:00', label: '6:00 PM UAE' },
];

function getPostTime(dayOfWeek: number): { time: string; label: string } {
  // Morning for Sun-Tue, midday for Wed-Thu, evening for Fri
  if (dayOfWeek <= 2) return POST_TIMES[0];
  if (dayOfWeek <= 4) return POST_TIMES[1];
  return POST_TIMES[2];
}

// ─── UAE market topic pools (rotated by week-of-month) ──────────

const GROWTH_TOPICS = [
  'UAE GDP growth forecast and non-oil sector performance',
  'Dubai FDI inflows and new business registrations',
  'DIFC and ADGM new company registrations this month',
  'UAE startup funding rounds and venture capital deals',
  'GCC IPO pipeline and capital markets activity',
  'Dubai real estate transaction volume and off-plan sales',
  'Abu Dhabi sovereign wealth fund investment moves',
  'UAE free zone expansions and new sector licenses',
  'Saudi-UAE trade corridor growth and bilateral deals',
  'UAE tech sector growth and AI adoption by enterprises',
  'Dubai tourism revenue and hospitality sector performance',
  'UAE manufacturing PMI and industrial zone activity',
];

const CAPITAL_TOPICS = [
  'CBUAE interest rate decision and monetary policy outlook',
  'UAE bond market yields and fixed income activity',
  'GCC private credit and alternative lending growth',
  'UAE bank earnings and lending growth trends',
  'Corporate cash management strategies in high-rate environment',
  'UAE sukuk issuance and Islamic finance trends',
  'Dirham peg implications and USD strength impact on GCC',
  'Treasury optimization and working capital efficiency',
  'UAE REIT performance and dividend yields',
  'GCC family office asset allocation shifts',
  'Cross-border payment flows and UAE as a remittance hub',
  'UAE corporate bond spreads and credit market signals',
];

const RISK_TOPICS = [
  'UAE corporate tax compliance deadlines and FTA updates',
  'FATF mutual evaluation progress and AML requirements',
  'UAE VAT enforcement actions and audit trends',
  'OECD Pillar Two DMTT impact on UAE free zone companies',
  'Economic substance regulations and compliance reviews',
  'UAE beneficial ownership register and UBO requirements',
  'Transfer pricing documentation requirements for UAE groups',
  'ESG reporting requirements for UAE listed companies',
  'Data protection law PDPL compliance for UAE businesses',
  'DIFC and ADGM regulatory updates and enforcement actions',
  'UAE whistleblower protection and corporate governance',
  'Sanctions compliance and trade control updates for GCC',
];

const WORLD_TOPICS = [
  'US Federal Reserve policy impact on GCC economies',
  'China economic signals affecting global trade and commodities',
  'EU CBAM carbon border tax impact on GCC exporters',
  'Global AI regulation developments affecting cross-border business',
  'Emerging market currency moves and capital flow shifts',
  'Global supply chain restructuring and nearshoring trends',
  'Central bank digital currency pilots and implications for GCC',
  'Global commercial real estate repricing and investment shifts',
  'India-Middle East economic corridor developments',
  'Global energy transition investment and GCC diversification',
  'US-China tech decoupling impact on Middle East trade',
  'Global private equity dry powder and GCC deal flow',
];

const TOPIC_POOLS: Record<RoomId, string[]> = {
  growth: GROWTH_TOPICS,
  capital: CAPITAL_TOPICS,
  risk: RISK_TOPICS,
  world: WORLD_TOPICS,
};

function getTopicForDate(room: RoomId, date: Date): string {
  const pool = TOPIC_POOLS[room];
  // Deterministic but varied: use day-of-year to rotate through pool
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}

// ─── Calendar generation ────────────────────────────────────────

export function isPostingDay(dayOfWeek: number): boolean {
  return dayOfWeek !== 6; // Skip Saturday only
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
        postTimeLabel: 'Weekend',
        status: 'skipped',
      };
      continue;
    }

    const room = WEEKDAY_ROOM[dow];
    const { time, label } = getPostTime(dow);
    const topic = getTopicForDate(room, date);

    entries[dateStr] = {
      date: dateStr,
      room,
      topic,
      postTime: time,
      postTimeLabel: label,
      status: 'planned',
    };
  }

  return entries;
}

export function getRoomForDay(dayOfWeek: number): RoomId {
  return WEEKDAY_ROOM[dayOfWeek] || 'growth';
}
