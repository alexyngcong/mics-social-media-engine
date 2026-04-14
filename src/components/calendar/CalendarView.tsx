import { useCalendarStore } from '../../store/calendarStore';
import { ROOMS } from '../../config/rooms';
import type { CalendarEntry } from '../../types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function StatusDot({ status }: { status: CalendarEntry['status'] }) {
  const colors: Record<string, string> = {
    planned: 'bg-bronze/50',
    generating: 'bg-signal-amber animate-pulse',
    generated: 'bg-signal-green',
    copied: 'bg-signal-blue',
    skipped: 'bg-tx-ghost/30',
  };
  return <div className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-tx-ghost/30'}`} />;
}

export function CalendarView() {
  const { year, month, entries, selectedDate, prevMonth, nextMonth, selectDate } = useCalendarStore();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (CalendarEntry | null)[] = [];
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push(null);
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(entries[dateStr] || null);
  }

  // Stats
  const allEntries = Object.values(entries);
  const planned = allEntries.filter((e) => e.status === 'planned').length;
  const generated = allEntries.filter((e) => e.status === 'generated' || e.status === 'copied').length;
  const total = allEntries.filter((e) => e.status !== 'skipped').length;
  const silenceDays = allEntries.filter((e) => e.status === 'skipped').length;

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-full border border-ink-border text-tx-mid hover:border-bronze/50 hover:text-tx flex items-center justify-center text-[14px] transition-colors"
        >
          &lsaquo;
        </button>
        <div className="text-center">
          <div className="font-serif text-[18px] font-semibold text-tx">
            {MONTH_NAMES[month]} {year}
          </div>
          <div className="text-[10px] text-tx-dim mt-0.5">
            {generated}/{total} posts ready &middot; {planned} pending
          </div>
        </div>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-full border border-ink-border text-tx-mid hover:border-bronze/50 hover:text-tx flex items-center justify-center text-[14px] transition-colors"
        >
          &rsaquo;
        </button>
      </div>

      {/* Rhythm summary */}
      <div className="bg-ink-el/50 border border-ink-border rounded-lg px-3 py-2 mb-3 text-center">
        <div className="text-[10px] text-tx-dim">
          <span className="text-bronze font-semibold">{total} posts</span> this month
          <span className="mx-1.5">&middot;</span>
          <span className="text-tx-ghost">{silenceDays} silence days</span>
          <span className="mx-1.5">&middot;</span>
          Sun &bull; Tue &bull; Thu only
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3 justify-center">
        {[
          { label: 'Planned', color: 'bg-bronze/50' },
          { label: 'Ready', color: 'bg-signal-green' },
          { label: 'Copied', color: 'bg-signal-blue' },
          { label: 'Silence', color: 'bg-tx-ghost/30' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[9px] text-tx-dim">
            <div className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[9px] text-tx-ghost font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((entry, i) => {
          if (!entry) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dayNum = parseInt(entry.date.split('-')[2]);
          const room = ROOMS.find((r) => r.id === entry.room);
          const isToday = entry.date === todayStr;
          const isSelected = entry.date === selectedDate;
          const isSkipped = entry.status === 'skipped';

          return (
            <button
              key={entry.date}
              onClick={() => !isSkipped && selectDate(isSelected ? null : entry.date)}
              disabled={isSkipped}
              className={`
                aspect-square rounded-lg p-1 flex flex-col items-center justify-center gap-0.5
                transition-all duration-150 relative
                ${isSkipped
                  ? 'opacity-25 cursor-default'
                  : isSelected
                    ? 'bg-bronze/15 border border-bronze/40 ring-1 ring-bronze/20'
                    : isToday
                      ? 'bg-ink-el border border-bronze/25'
                      : 'bg-ink-card border border-ink-border hover:border-bronze/30 cursor-pointer'
                }
              `}
            >
              {/* Day number */}
              <span className={`text-[12px] font-semibold leading-none ${isToday ? 'text-bronze' : 'text-tx-mid'}`}>
                {dayNum}
              </span>

              {/* Room icon */}
              {!isSkipped && room && (
                <span className="text-[8px] leading-none" style={{ color: room.color }}>
                  {room.icon}
                </span>
              )}

              {/* Status dot */}
              {!isSkipped && <StatusDot status={entry.status} />}

              {/* Today indicator */}
              {isToday && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-bronze" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
