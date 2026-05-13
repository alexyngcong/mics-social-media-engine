import { useEffect, useRef } from 'react';
import { useAppStore } from './store/appStore';
import { readImportFromUrl } from './services/importHandler';

// Build timestamp injected by vite at compile time. If this string in the
// UI footer doesn't match the time you just deployed, your browser is
// serving a cached bundle.
declare const __BUILD_TIME__: string;
const BUILD_TIMESTAMP = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';
import { useGenerate } from './hooks/useGenerate';
import { useHistory } from './hooks/useHistory';
import { dateFormatted } from './config/brand';

import { CommandCenter } from './components/steps/CommandCenter';
import { RoomSelect } from './components/steps/RoomSelect';
import { FormatSelect } from './components/steps/FormatSelect';
import { LoadingState } from './components/steps/LoadingState';
import { ResultView } from './components/steps/ResultView';
import { BriefImport } from './components/steps/BriefImport';
import { AIBriefPaste } from './components/steps/AIBriefPaste';
import { WeeklyKit } from './components/steps/WeeklyKit';
import { BannerEditor } from './components/editor/BannerEditor';
import { ServicePicker } from './components/steps/ServicePicker';
import { Settings } from './components/steps/Settings';
import { CalendarView } from './components/calendar/CalendarView';
import { DayDetail } from './components/calendar/DayDetail';
import { Button } from './components/ui/Button';

function getStepTitle(step: number): string {
  switch (step) {
    case 0: return 'Command Center';
    case 1: return 'Select Room';
    case 2: return 'Choose Format';
    case 3: return 'Generating...';
    case 4: return 'Your Post';
    case 9: return 'Content Calendar';
    case 11: return 'Import Deep Research Brief';
    case 12: return 'Paste AI Brief Response';
    case 13: return 'Weekly Posting Kit';
    case 14: return 'Banner Editor';
    case 15: return 'Generate by Service';
    case 16: return 'Settings';
    default: return '';
  }
}

export default function App() {
  const store = useAppStore();
  const { items: history, addItem } = useHistory();
  const { generate } = useGenerate(addItem);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRetryStandard = () => {
    store.setStep(3);
    setTimeout(() => generate(), 200);
  };

  // Claude.ai bookmarklet ingestion — on mount, check ?import= in the URL.
  // If present, decode + stash on the store + route to AIBriefPaste (step 12)
  // where the auto-fill effect runs the parser.
  useEffect(() => {
    (async () => {
      const payload = await readImportFromUrl();
      if (payload) {
        store.setPendingImportPayload(payload);
        store.setStep(12);
      }
    })();
    // Mount-only — URL params are read once at boot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-ink font-sans text-tx max-w-[480px] mx-auto flex flex-col">
      <textarea ref={fallbackTextareaRef} className="fixed -left-[9999px]" readOnly tabIndex={-1} />

      {/* Header */}
      <div className="px-5 py-4 pb-3.5 border-b border-ink-border bg-ink-mid">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[22px] font-semibold text-tx">
              {getStepTitle(store.step)}
            </h1>
            <div className="text-[10px] text-tx-dim mt-0.5">
              {dateFormatted.short} | Private Intelligence
            </div>
          </div>
          <div className="flex gap-2">
            {store.step > 0 && (
              <Button variant="ghost" onClick={store.reset} className="!px-3.5 !py-1.5 !text-[11px]">
                Home
              </Button>
            )}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-signal-green/10 border border-signal-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse" />
              <span className="text-[9px] text-signal-green font-semibold">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-24">
        {store.step === 0 && <CommandCenter history={history} />}
        {store.step === 9 && (
          <>
            <CalendarView />
            <DayDetail />
          </>
        )}
        {store.step === 1 && <RoomSelect />}
        {store.step === 2 && <FormatSelect onGenerate={() => generate()} />}
        {store.step === 11 && <BriefImport />}
        {store.step === 12 && <AIBriefPaste />}
        {store.step === 13 && <WeeklyKit />}
        {store.step === 14 && <BannerEditor />}
        {store.step === 15 && <ServicePicker onGenerate={() => generate(store.customTopic)} />}
        {store.step === 16 && <Settings />}

        {store.step === 3 && store.loading && <LoadingState />}

        {store.step === 4 && (
          <>
            {store.error && !store.result ? (
              <div className="bg-ink-card border border-signal-red/40 rounded-card p-4 mb-3.5">
                <div className="text-signal-red text-[13px] mb-2.5">{store.error}</div>
                <Button variant="gold" onClick={handleRetryStandard} className="!px-5 !py-2.5 !text-[12px]">
                  Try Again
                </Button>
              </div>
            ) : store.result ? (
              <ResultView result={store.result} isDeep={false} onRetry={handleRetryStandard} />
            ) : null}
          </>
        )}
      </div>

      {/* Footer with build timestamp so cache state is obvious at a glance */}
      <div className="px-5 py-2.5 border-t border-ink-border bg-ink flex justify-between text-[10px] text-tx-dim">
        <span>Live Intelligence Engine</span>
        <span className="text-tx-ghost">
          v5.3 · {BUILD_TIMESTAMP}
        </span>
      </div>
    </div>
  );
}
