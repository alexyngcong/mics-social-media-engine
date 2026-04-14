import { useCallback } from 'react';
import { useCalendarStore } from '../store/calendarStore';
import { generateContent } from '../services/api';
import { validatePost, autoFixPost } from '../services/qaValidator';
import { ROOMS } from '../config/rooms';
import { TEMPLATE_COUNT } from '../components/banner/templates';

export function useCalendarGenerate() {
  const store = useCalendarStore();

  const generateForDate = useCallback(async (dateStr: string) => {
    const entry = store.entries[dateStr];
    if (!entry || entry.status === 'skipped') return;

    const room = ROOMS.find((r) => r.id === entry.room);
    if (!room) return;

    store.setGenerating(dateStr);
    store.setEntryStatus(dateStr, 'generating');

    try {
      // Generate post using live news (no API key needed)
      const parsed = await generateContent(entry.room, 'observation', entry.topic);

      // QA GATE: Auto-fix then validate
      const { fixed } = autoFixPost(parsed);
      const qaReport = validatePost(fixed, { platform: 'whatsapp' });
      const bannerVariant = Math.floor(Math.random() * TEMPLATE_COUNT);

      store.setEntryResult(dateStr, fixed, bannerVariant, qaReport);

      if (qaReport.verdict === 'REJECTED') {
        console.warn('[QA] Calendar post rejected:', qaReport.summary);
      }
    } catch (e) {
      store.setEntryStatus(dateStr, 'planned');
      store.setGenerating(null);
      throw e;
    }
  }, [store.entries]);

  return { generateForDate };
}
