import { useAppStore } from '../../store/appStore';
import { Spinner } from '../ui/Spinner';

export function LoadingState() {
  const { loadingMessage, step } = useAppStore();
  const isDeep = step === 7;

  return (
    <div className="text-center pt-12">
      <div className="flex justify-center mb-5">
        <Spinner color={isDeep ? '#A78BFA' : '#A8926A'} />
      </div>
      <div className="text-tx-mid text-[14px] mb-1.5">{loadingMessage}</div>
      {isDeep && (
        <div className="mt-4 inline-block px-4 py-2.5 bg-signal-purple/10 border border-signal-purple/30 rounded-card">
          <div className="text-signal-purple text-[10px] animate-pulse">
            AI Deep Research in progress...
          </div>
        </div>
      )}
    </div>
  );
}
