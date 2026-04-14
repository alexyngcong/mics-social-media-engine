import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { generateContent } from '../services/api';
import { parseStandardResponse, parseDeepResponse } from '../services/aiResponseParser';
import { buildStandardPrompt, buildDeepPrompt, buildUserMessage, buildDeepUserMessage } from '../services/prompts';
import { validatePost, autoFixPost } from '../services/qaValidator';
import { ROOMS } from '../config/rooms';
import { POST_TYPES } from '../config/postTypes';
import { PLATFORMS } from '../config/platforms';
import { TEMPLATE_COUNT } from '../components/banner/templates';
import type { HistoryItem } from '../types';
import { dateFormatted } from '../config/brand';

const LOADING_MSGS = [
  'Scanning feeds...', 'Cross-referencing sources...', 'Filtering signals...',
  'Verifying data...', 'Crafting intelligence...', 'Planting advisory seed...',
];
const DEEP_MSGS = [
  'Deep research initiated...', 'Searching global wires...', 'Cross-referencing 5+ sources...',
  'Analyzing impact...', 'Finding missed angles...', 'Building brief...', 'Polishing output...',
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
      store.setBannerReady(false);
      store.shuffleVariant(TEMPLATE_COUNT);

      const rm = ROOMS.find((r) => r.id === room)!;
      const tp = postType ? POST_TYPES.find((t) => t.id === postType) : POST_TYPES[3];
      const plat = PLATFORMS.find((p) => p.id === platform)!;

      // Pass room context and postTypeId to the prompt builder
      const systemPrompt = buildStandardPrompt(plat, tp?.id, rm);
      const userMsg = buildUserMessage(
        rm.label, tp!.promptFragment, rm.topics, customTopic, room === 'world'
      );

      try {
        const raw = await generateContent(systemPrompt, userMsg);
        const parsed = parseStandardResponse(raw);

        if (!parsed.text && !parsed.headline) {
          store.setError('Empty response. Try again.');
          store.setLoading(false);
          store.setStep(4);
          return;
        }

        // ═══ QA GATE: Auto-fix → Validate → Verdict ═══
        store.setLoadingMessage(QA_MSGS[0]);
        const { fixed, fixes } = autoFixPost(parsed);
        if (fixes.length > 0) {
          console.log('[QA] Auto-fixed:', fixes);
        }

        store.setLoadingMessage(QA_MSGS[1]);
        const qaReport = validatePost(fixed, {
          platform,
          postTypeId: tp?.id,
        });

        store.setQAReport(qaReport);

        if (qaReport.verdict === 'REJECTED') {
          // Show content anyway so user can see what failed, but flag it
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
        store.setError(e instanceof Error ? e.message : 'Connection error');
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
      store.setBannerReady(false);
      store.shuffleVariant(TEMPLATE_COUNT);

      const rm = ROOMS.find((r) => r.id === room)!;
      const plat = PLATFORMS.find((p) => p.id === platform)!;

      // Pass room context to deep prompt builder
      const systemPrompt = buildDeepPrompt(plat, rm);
      const userMsg = buildDeepUserMessage(rm.label, topic, room === 'world');

      try {
        const raw = await generateContent(systemPrompt, userMsg, { maxTokens: 2500 });
        const parsed = parseDeepResponse(raw);

        if (!parsed.post && !parsed.brief) {
          store.setError('Empty response. Try again.');
          store.setLoading(false);
          store.setStep(8);
          return;
        }

        // ═══ QA GATE: Auto-fix → Validate → Verdict ═══
        store.setLoadingMessage(QA_MSGS[2]);
        const { fixed } = autoFixPost(parsed);

        store.setLoadingMessage(QA_MSGS[3]);
        const qaReport = validatePost(fixed, {
          platform,
          isDeep: true,
          deepResult: { ...parsed, ...fixed },
        });

        store.setQAReport(qaReport);
        store.setDeepResult({ ...parsed, ...fixed });
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
        store.setError(e instanceof Error ? e.message : 'Connection error');
        store.setStep(8);
      }
      store.setLoading(false);
    },
    [store.room, store.platform, addHistoryItem]
  );

  return { generate, generateDeep };
}
