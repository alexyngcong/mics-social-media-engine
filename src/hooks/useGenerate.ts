import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { generateContent } from '../services/api';
import { validatePost, autoFixPost } from '../services/qaValidator';
import { ROOMS } from '../config/rooms';
import { POST_TYPES } from '../config/postTypes';
import { TEMPLATE_COUNT } from '../components/banner/templates';
import type { HistoryItem, PostTypeId } from '../types';
import { dateFormatted } from '../config/brand';

const LOADING_MSGS = [
  'Scanning live feeds...', 'Checking approved sources...', 'Filtering signals...',
  'Cross-referencing data...', 'Building intelligence...', 'Planting advisory seed...',
];
const DEEP_MSGS = [
  'Deep research initiated...', 'Searching Mondaq, MEED, Lexology...', 'Cross-referencing 5+ sources...',
  'Analyzing regional impact...', 'Finding missed angles...', 'Building brief...', 'Polishing output...',
];
const ENGAGEMENT_MSGS = [
  'Scanning insider channels...', 'Finding the signal...', 'Crafting the hook...',
  'Tuning the tone...', 'Sharpening the edge...', 'Finalizing intel...',
];
const QA_MSGS = [
  'Running quality audit...', 'Verifying source reliability...',
  'Checking content freshness...', 'Validating brand voice...',
];

export function useGenerate(addHistoryItem: (item: HistoryItem) => void) {
  const store = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Rotating loading messages
  useEffect(() => {
    if (!store.loading) return;
    const isEngagement = ['pulse', 'voicenote', 'exclusive'].includes(store.postType || '');
    const pool = store.step === 7 ? DEEP_MSGS : isEngagement ? ENGAGEMENT_MSGS : LOADING_MSGS;
    let i = 0;
    store.setLoadingMessage(pool[0]);
    intervalRef.current = setInterval(() => {
      i = (i + 1) % pool.length;
      store.setLoadingMessage(pool[i]);
    }, 2400);
    return () => clearInterval(intervalRef.current);
  }, [store.loading, store.step]);

  const generate = useCallback(
    async (customTopic?: string) => {
      const { room, postType, platform } = store;
      if (!room) return;

      store.setLoading(true);
      store.setError('');
      store.setResult(null);
      store.setQAReport(null);
      store.setBannerReady(false);
      store.shuffleVariant(TEMPLATE_COUNT);

      const rm = ROOMS.find((r) => r.id === room)!;
      const tp = postType ? POST_TYPES.find((t) => t.id === postType) : POST_TYPES[3];
      const postTypeId: PostTypeId = tp?.id || 'generic';

      try {
        // Step 1: Fetch live news + generate post (no API key needed)
        const parsed = await generateContent(room, postTypeId, customTopic);

        if (!parsed.text && !parsed.headline) {
          store.setError('No content generated. Try a different topic.');
          store.setLoading(false);
          store.setStep(4);
          return;
        }

        // Step 2: QA GATE — Auto-fix then validate
        store.setLoadingMessage(QA_MSGS[0]);
        const { fixed, fixes } = autoFixPost(parsed);
        if (fixes.length > 0) {
          console.log('[QA] Auto-fixed:', fixes);
        }

        store.setLoadingMessage(QA_MSGS[1]);
        const qaReport = validatePost(fixed, {
          platform,
          postTypeId,
        });

        store.setQAReport(qaReport);

        if (qaReport.verdict === 'REJECTED') {
          store.setResult(fixed);
          store.setError(`QA REJECTED (score: ${qaReport.score}): ${qaReport.summary}`);
          addHistoryItem({
            ...fixed,
            id: Date.now(),
            room: rm.short,
            type: tp?.label || 'Custom',
            timestamp: dateFormatted.short,
            mode: 'standard',
            platform,
          });
          store.setStep(4);
        } else {
          store.setResult(fixed);
          addHistoryItem({
            ...fixed,
            id: Date.now(),
            room: rm.short,
            type: tp?.label || 'Custom',
            timestamp: dateFormatted.short,
            mode: 'standard',
            platform,
          });
          store.setStep(4);
        }
      } catch (e) {
        store.setError(e instanceof Error ? e.message : 'Failed to fetch news. Check your connection.');
        store.setStep(4);
      }
      store.setLoading(false);
    },
    [store.room, store.postType, store.platform, addHistoryItem]
  );

  const generateDeep = useCallback(
    async (topic: string) => {
      const { room, platform } = store;
      if (!room || !topic) return;

      store.setLoading(true);
      store.setError('');
      store.setDeepResult(null);
      store.setQAReport(null);
      store.setBannerReady(false);
      store.shuffleVariant(TEMPLATE_COUNT);

      const rm = ROOMS.find((r) => r.id === room)!;

      try {
        // Generate as observation type for deep dives
        const parsed = await generateContent(room, 'observation', topic);

        if (!parsed.text && !parsed.headline) {
          store.setError('No content generated. Try a different topic.');
          store.setLoading(false);
          store.setStep(8);
          return;
        }

        // QA GATE
        store.setLoadingMessage(QA_MSGS[2]);
        const { fixed } = autoFixPost(parsed);

        store.setLoadingMessage(QA_MSGS[3]);
        const qaReport = validatePost(fixed, { platform });

        // Build deep result with brief
        const deepResult = {
          ...fixed,
          post: fixed.text,
          brief: `${fixed.text}\n\n---\n\nSource: ${fixed.source}\nData: ${fixed.stat} ${fixed.statLabel}\nPublished: ${dateFormatted.short}`,
          keyFinding: fixed.subline || fixed.headline,
        };

        store.setQAReport(qaReport);
        store.setDeepResult(deepResult);
        store.setResult(fixed);

        if (qaReport.verdict === 'REJECTED') {
          store.setError(`QA REJECTED (score: ${qaReport.score}): ${qaReport.summary}`);
        }

        addHistoryItem({
          ...fixed,
          id: Date.now(),
          room: rm.short,
          type: 'Deep Dive',
          timestamp: dateFormatted.short,
          mode: 'deep',
          platform,
        });
        store.setStep(8);
      } catch (e) {
        store.setError(e instanceof Error ? e.message : 'Failed to fetch news.');
        store.setStep(8);
      }
      store.setLoading(false);
    },
    [store.room, store.platform, addHistoryItem]
  );

  return { generate, generateDeep };
}
