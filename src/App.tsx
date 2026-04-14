import { useRef } from 'react';
import { useAppStore } from './store/appStore';
import { useGenerate } from './hooks/useGenerate';
import { useHistory } from './hooks/useHistory';
import { dateFormatted } from './config/brand';

import { CommandCenter } from './components/steps/CommandCenter';
import { PlatformSelect } from './components/steps/PlatformSelect';
import { RoomSelect } from './components/steps/RoomSelect';
import { FormatSelect } from './components/steps/FormatSelect';
import { CustomTopic } from './components/steps/CustomTopic';
import { DeepDive } from './components/steps/DeepDive';
import { LoadingState } from './components/steps/LoadingState';
import { ResultView } from './components/steps/ResultView';
import { CalendarView } from './components/calendar/CalendarView';
import { DayDetail } from './components/calendar/DayDetail';
import { Button } from './components/ui/Button';

function getStepTitle(step: number): string {
  switch (step) {
    case 0: return 'Command Center';
    case 10: return 'Select Platform';
    case 1: return 'Select Room';
    case 2: return 'Choose Format';
    case 3: case 7: return 'Generating...';
    case 4: case 8: return 'Your Post';
    case 5: return 'Custom Topic';
    case 6: return 'AI Deep Dive';
    case 9: return 'Content Calendar';
    default: return '';
  }
}

export default function App() {
  const store = useAppStore();
  const { items: history, addItem } = useHistory();
  const { generate, generateDeep } = useGenerate(addItem);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRetryStandard = () => {
    store.setStep(3);
    setTimeout(() => generate(), 200);
  };

  const handleRetryDeep = () => {
    store.setStep(7);
    setTimeout(() => generateDeep(store.customTopic), 200);
  };

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
        {store.step === 10 && <PlatformSelect />}
        {store.step === 1 && <RoomSelect />}
        {store.step === 2 && <FormatSelect onGenerate={() => generate()} />}
        {store.step === 5 && <CustomTopic onGenerate={(topic) => generate(topic)} />}
        {store.step === 6 && <DeepDive onGenerateDeep={(topic) => generateDeep(topic)} />}

        {[3, 7].includes(store.step) && store.loading && <LoadingState />}

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

        {store.step === 8 && (
          <>
            {store.error && !store.deepResult ? (
              <div className="bg-ink-card border border-signal-red/40 rounded-card p-4 mb-3.5">
                <div className="text-signal-red text-[13px] mb-2.5">{store.error}</div>
                <Button variant="purple" onClick={handleRetryDeep} className="!px-5 !py-2.5 !text-[12px]">
                  Retry Deep Dive
                </Button>
              </div>
            ) : store.deepResult ? (
              <ResultView result={store.deepResult} isDeep={true} deepResult={store.deepResult} onRetry={handleRetryDeep} />
            ) : null}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-ink-border bg-ink flex justify-between text-[10px] text-tx-dim">
        <span>Live Intelligence Engine</span>
        <span className="text-tx-ghost">v5.0 | No API Key Required</span>
      </div>
    </div>
  );
}
