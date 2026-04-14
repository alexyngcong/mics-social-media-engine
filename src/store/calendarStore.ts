import { create } from 'zustand';
import type { CalendarEntry, CalendarDayStatus, GeneratedPost, QAReport } from '../types';
import { generateMonthPlan } from '../config/calendarPlan';

/**
 * Bump this version whenever calendarPlan.ts changes rhythm / rooms / topics.
 * Old localStorage entries under a different version are automatically discarded.
 */
const CALENDAR_VERSION = 2; // v1 = old 6-day rhythm, v2 = 3-day rhythm
const STORAGE_KEY = 'mics_calendar';

interface CalendarState {
  year: number;
  month: number; // 0-based
  entries: Record<string, CalendarEntry>;
  selectedDate: string | null;
  generatingDate: string | null;

  initMonth: (year: number, month: number) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  selectDate: (date: string | null) => void;
  setGenerating: (date: string | null) => void;
  setEntryStatus: (date: string, status: CalendarDayStatus) => void;
  setEntryResult: (date: string, result: GeneratedPost, bannerVariant: number, qaReport?: QAReport) => void;
}

function storageKey(year: number, month: number) {
  return `${STORAGE_KEY}_v${CALENDAR_VERSION}_${year}_${month}`;
}

function loadFromStorage(year: number, month: number): Record<string, CalendarEntry> | null {
  try {
    const raw = localStorage.getItem(storageKey(year, month));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveToStorage(year: number, month: number, entries: Record<string, CalendarEntry>) {
  try {
    localStorage.setItem(storageKey(year, month), JSON.stringify(entries));
  } catch { /* quota exceeded */ }
}

/** Remove stale calendar caches from previous versions */
function purgeOldCaches() {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_KEY) && !key.includes(`_v${CALENDAR_VERSION}_`)) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* ignore */ }
}

// Run once on module load
purgeOldCaches();

const now = new Date();
const initYear = now.getFullYear();
const initMonth = now.getMonth();
const initEntries = loadFromStorage(initYear, initMonth) || generateMonthPlan(initYear, initMonth);

export const useCalendarStore = create<CalendarState>((set, get) => ({
  year: initYear,
  month: initMonth,
  entries: initEntries,
  selectedDate: null,
  generatingDate: null,

  initMonth: (year, month) => {
    const cached = loadFromStorage(year, month);
    const entries = cached || generateMonthPlan(year, month);
    if (!cached) saveToStorage(year, month, entries);
    set({ year, month, entries, selectedDate: null });
  },

  prevMonth: () => {
    const { year, month } = get();
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    get().initMonth(newYear, newMonth);
  },

  nextMonth: () => {
    const { year, month } = get();
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    get().initMonth(newYear, newMonth);
  },

  selectDate: (date) => set({ selectedDate: date }),

  setGenerating: (date) => set({ generatingDate: date }),

  setEntryStatus: (date, status) => {
    const { entries, year, month } = get();
    const entry = entries[date];
    if (!entry) return;
    const updated = { ...entries, [date]: { ...entry, status } };
    saveToStorage(year, month, updated);
    set({ entries: updated });
  },

  setEntryResult: (date, result, bannerVariant, qaReport?) => {
    const { entries, year, month } = get();
    const entry = entries[date];
    if (!entry) return;
    const updated = {
      ...entries,
      [date]: { ...entry, status: 'generated' as const, result, bannerVariant, qaReport },
    };
    saveToStorage(year, month, updated);
    set({ entries: updated, generatingDate: null });
  },
}));
