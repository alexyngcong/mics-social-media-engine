import { useCallback } from 'react';
import { useCalendarStore } from '../store/calendarStore';
import { generateContent } from '../services/api';
import { buildStandardPrompt, buildUserMessage } from '../services/prompts';
import { parseStandardResponse } from '../services/aiResponseParser';
import { PLATFORMS } from '../config/platforms';
import { ROOMS } from '../config/rooms';
import { TEMPLATE_COUNT } from '../components/banner/templates';
import { dateFormatted } from '../config/brand';

const whatsapp = PLATFORMS.find((p) => p.id === 'whatsapp')!;

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
      const system = buildStandardPrompt(whatsapp);

      // Build real-time enforced topic with today's date
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const liveTopicPrefix = `REAL-TIME INTELLIGENCE for ${todayStr}: `;
      const liveTopic = `${liveTopicPrefix}${entry.topic}. Search for the LATEST breaking news, data releases, and market movements from TODAY or the last 48 hours on this topic. Start with "${entry.topic} ${dateFormatted.year} April latest news". This must reflect what is happening RIGHT NOW in ${dateFormatted.year}, not old analysis.`;

      const userMsg = buildUserMessage(
        room.label,
        'Breaking market intelligence, real-time data, current developments',
        [entry.topic],
        liveTopic,
        entry.room === 'world'
      );

      const raw = await generateContent(system, userMsg);
      const result = parseStandardResponse(raw);
      const bannerVariant = Math.floor(Math.random() * TEMPLATE_COUNT);

      store.setEntryResult(dateStr, result, bannerVariant);
    } catch (e) {
      store.setEntryStatus(dateStr, 'planned');
      store.setGenerating(null);
      throw e;
    }
  }, [store.entries]);

  return { generateForDate };
}
