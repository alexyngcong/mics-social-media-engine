import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { POST_TYPES } from '../../config/postTypes';
import { PLATFORMS } from '../../config/platforms';
import { Button } from '../ui/Button';
import { Label, StepLabel } from '../ui/Label';

interface CustomTopicProps {
  onGenerate: (topic: string) => void;
}

export function CustomTopic({ onGenerate }: CustomTopicProps) {
  const store = useAppStore();

  const handleGenerate = () => {
    if (!store.room) {
      store.setError('Pick a room');
      return;
    }
    if (!store.customTopic.trim()) {
      store.setError('Enter a topic');
      return;
    }
    store.setError('');
    store.setStep(3);
    setTimeout(() => onGenerate(store.customTopic), 200);
  };

  return (
    <>
      <StepLabel>CUSTOM TOPIC</StepLabel>
      <p className="text-tx-mid text-[13px] mb-4 leading-relaxed">
        Paste a headline or describe a topic. The engine finds verified data and crafts your post.
      </p>

      <Label>PLATFORM</Label>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {PLATFORMS.map((plat) => (
          <button
            key={plat.id}
            onClick={() => store.setPlatform(plat.id)}
            className={`px-3 py-1.5 text-[11px] rounded-full border transition-all font-semibold ${
              store.platform === plat.id
                ? 'border-opacity-50 bg-opacity-20'
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

      <Label>FORMAT</Label>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {POST_TYPES.map((tp) => (
          <button
            key={tp.id}
            onClick={() => store.setPostType(tp.id)}
            className={`px-3 py-1.5 text-[11px] rounded-full border transition-all font-semibold ${
              store.postType === tp.id
                ? 'bg-bronze/10 border-bronze/50 text-bronze'
                : 'border-ink-border text-tx-mid bg-transparent hover:border-bronze/30'
            }`}
          >
            {tp.icon} {tp.label}
          </button>
        ))}
      </div>

      <Label>TOPIC</Label>
      <textarea
        value={store.customTopic}
        onChange={(e) => store.setCustomTopic(e.target.value)}
        placeholder="e.g. 'CBUAE Q2 2026 rate hold impact on Dubai real estate'"
        className="w-full min-h-[90px] p-3 rounded-card border border-ink-border bg-ink-card text-tx-DEFAULT text-[13px] leading-relaxed font-sans outline-none resize-y mb-3.5 focus:border-bronze/50 transition-colors"
      />

      <Button
        variant="gold"
        fullWidth
        onClick={handleGenerate}
        disabled={!store.room || !store.customTopic.trim()}
        className="py-3.5 text-[14px] rounded-card-lg"
      >
        Generate Post
      </Button>

      {store.error && (
        <div className="text-signal-red text-[12px] mt-2">{store.error}</div>
      )}
    </>
  );
}
