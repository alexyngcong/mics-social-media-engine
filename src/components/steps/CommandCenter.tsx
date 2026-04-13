import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label } from '../ui/Label';
import { useClipboard } from '../../hooks/useClipboard';
import type { HistoryItem } from '../../types';

interface CommandCenterProps {
  history: HistoryItem[];
}

export function CommandCenter({ history }: CommandCenterProps) {
  const { setStep, copiedLabel } = useAppStore();
  const { copy } = useClipboard();

  return (
    <>
      {/* Strategy card */}
      <Card className="!bg-gradient-to-br !from-ink-card !to-ink-el !border-bronze/15 !mb-5">
        <div className="text-[10px] font-bold tracking-wider text-bronze mb-2">THE PLAY</div>
        <div className="text-tx-mid text-[13px] leading-relaxed">
          Every post is a <span className="text-tx font-semibold">trust deposit</span>.
          Every closing line creates hunger:{' '}
          <span className="text-bronze italic">
            "I need to talk to someone who understands this."
          </span>{' '}
          You never sell. You make them come to you.
        </div>
      </Card>

      {/* Calendar */}
      <Label>CALENDAR</Label>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => setStep(9)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-6 !border-bronze/30 !text-bronze hover:!bg-bronze/10"
      >
        Content Calendar
      </Button>

      {/* Create actions */}
      <Label>CREATE</Label>
      <Button
        variant="gold"
        fullWidth
        onClick={() => setStep(10)}
        className="!py-4 !text-[14px] !rounded-card-lg !mb-2.5"
      >
        Generate Intelligence Post
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => setStep(5)}
        className="!py-3 !text-[13px] !rounded-card-lg !mb-2.5"
      >
        Custom Topic Post
      </Button>
      <Button
        variant="purple"
        fullWidth
        onClick={() => setStep(6)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-6"
      >
        AI Deep Dive (Research Mode)
      </Button>

      {/* Platform overview */}
      <Label>PLATFORMS</Label>
      <div className="flex gap-2 flex-wrap mb-6">
        {PLATFORMS.map((plat) => (
          <div
            key={plat.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ink-border text-[11px] text-tx-mid"
          >
            <span>{plat.icon}</span>
            <span>{plat.name}</span>
          </div>
        ))}
      </div>

      {/* Rooms overview */}
      <Label>INTELLIGENCE ROOMS</Label>
      {ROOMS.map((rm) => (
        <Card key={rm.id} accentColor={rm.color} className="!mb-2">
          <div className="text-[14px] font-semibold mb-0.5" style={{ color: rm.color }}>
            {rm.icon} {rm.label}
          </div>
          <div className="text-tx-dim text-[11px] leading-snug mb-1">{rm.description}</div>
          <div className="text-bronze text-[10px]">MICS: {rm.micsServices}</div>
        </Card>
      ))}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-ink-border">
          <Label>RECENT POSTS</Label>
          {history.slice(0, 8).map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-card bg-ink-card border border-ink-border mb-1.5"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-[11px] font-semibold truncate text-tx">
                  {h.headline || h.text?.slice(0, 50)}
                </div>
                <div className="text-[9px] text-tx-dim mt-0.5">
                  {h.room} | {h.type} | {h.platform} | {h.timestamp}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => copy(h.text || h.post || '', `h${h.id}`)}
                className="!px-2.5 !py-1 !text-[9px] flex-shrink-0"
              >
                {copiedLabel === `h${h.id}` ? 'Done' : 'Copy'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
