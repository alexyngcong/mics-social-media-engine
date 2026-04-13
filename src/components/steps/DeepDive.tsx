import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { Button } from '../ui/Button';
import { Label, StepLabel } from '../ui/Label';

interface DeepDiveProps {
  onGenerateDeep: (topic: string) => void;
}

export function DeepDive({ onGenerateDeep }: DeepDiveProps) {
  const store = useAppStore();

  const handleLaunch = () => {
    if (!store.room) {
      store.setError('Pick a room');
      return;
    }
    if (!store.customTopic.trim()) {
      store.setError('Describe your research topic');
      return;
    }
    store.setError('');
    store.setStep(7);
    setTimeout(() => onGenerateDeep(store.customTopic), 200);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-signal-purple/10 to-ink-card border border-signal-purple/30 rounded-card-lg p-4 mb-4">
        <div className="text-[20px] mb-2">{'\u{1F52E}'}</div>
        <div className="font-serif text-[18px] font-semibold text-tx-DEFAULT mb-1.5">
          AI Deep Dive
        </div>
        <div className="text-tx-mid text-[12px] leading-relaxed">
          Multiple research passes. Cross-references 5+ sources. Finds angles UAE media missed.
          Outputs: hook post + deep research brief.
        </div>
      </div>

      <Label>PLATFORM</Label>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {PLATFORMS.map((plat) => (
          <button
            key={plat.id}
            onClick={() => store.setPlatform(plat.id)}
            className={`px-3 py-1.5 text-[11px] rounded-full border transition-all font-semibold ${
              store.platform === plat.id
                ? ''
                : 'border-ink-border text-tx-mid bg-transparent hover:border-bronze/30'
            }`}
            style={
              store.platform === plat.id
                ? { background: `${plat.color}18`, borderColor: `${plat.color}50`, color: plat.color === '#000000' ? '#fff' : plat.color }
                : {}
            }
          >
            {plat.icon} {plat.name}
          </button>
        ))}
      </div>

      <Label>ROOM</Label>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {ROOMS.map((rm) => (
          <button
            key={rm.id}
            onClick={() => store.setRoom(rm.id)}
            className={`px-3.5 py-1.5 text-[11px] rounded-full border transition-all font-semibold ${
              store.room === rm.id
                ? ''
                : 'border-ink-border text-tx-mid bg-transparent hover:border-bronze/30'
            }`}
            style={
              store.room === rm.id
                ? { background: `${rm.color}18`, borderColor: `${rm.color}50`, color: rm.color }
                : {}
            }
          >
            {rm.icon} {rm.short}
          </button>
        ))}
      </div>

      <Label>RESEARCH TOPIC</Label>
      <textarea
        value={store.customTopic}
        onChange={(e) => store.setCustomTopic(e.target.value)}
        placeholder="e.g. 'How US tariff escalation reshapes GCC trade corridors'"
        className="w-full min-h-[100px] p-3 rounded-card border border-ink-border bg-ink-card text-tx-DEFAULT text-[13px] leading-relaxed font-sans outline-none resize-y mb-3.5 focus:border-signal-purple/50 transition-colors"
      />

      <Button
        variant="purple"
        fullWidth
        onClick={handleLaunch}
        disabled={!store.room || !store.customTopic.trim()}
        className="py-4 text-[14px] rounded-card-lg"
      >
        Launch Deep Dive
      </Button>

      {store.error && (
        <div className="text-signal-red text-[12px] mt-2">{store.error}</div>
      )}
    </>
  );
}
