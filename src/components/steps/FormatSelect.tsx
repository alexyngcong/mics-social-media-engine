import { useAppStore } from '../../store/appStore';
import { CORE_TYPES, ENGAGEMENT_TYPES } from '../../config/postTypes';
import { Card } from '../ui/Card';
import { StepLabel, Label } from '../ui/Label';
import type { PostType } from '../../types';

interface FormatSelectProps {
  onGenerate: () => void;
}

function TypeCard({ tp, onClick }: { tp: PostType; onClick: () => void }) {
  const isEngagement = tp.category === 'engagement';
  return (
    <Card clickable onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-tx">
              {tp.icon} {tp.label}
            </span>
            {tp.noBanner && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-ink-el text-tx-dim border border-ink-border">
                TEXT ONLY
              </span>
            )}
          </div>
          {tp.description && (
            <div className="text-[11px] text-tx-dim mt-0.5 leading-snug">{tp.description}</div>
          )}
        </div>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
          isEngagement
            ? 'bg-signal-purple/10 text-signal-purple border border-signal-purple/20'
            : 'bg-ink-el text-tx-dim'
        }`}>
          {tp.day}
        </span>
      </div>
    </Card>
  );
}

export function FormatSelect({ onGenerate }: FormatSelectProps) {
  const { setPostType, setStep } = useAppStore();

  const handleSelect = (tp: PostType) => {
    setPostType(tp.id);
    setStep(3);
    setTimeout(onGenerate, 200);
  };

  return (
    <>
      <StepLabel>STEP 2 OF 3 &mdash; CHOOSE FORMAT</StepLabel>

      {/* Core Strategy Types */}
      <Label>WEEKLY STRATEGY</Label>
      <div className="text-[11px] text-tx-dim mb-2 -mt-1 px-0.5">
        Aligned to the posting rhythm: Mon → Tue → Thu → Any
      </div>
      {CORE_TYPES.map((tp) => (
        <TypeCard key={tp.id} tp={tp} onClick={() => handleSelect(tp)} />
      ))}

      {/* Engagement Tactics */}
      <div className="mt-4">
        <Label color="#A78BFA">ENGAGEMENT TACTICS</Label>
        <div className="text-[11px] text-tx-dim mb-2 -mt-1 px-0.5">
          Designed to trigger private outreach and build trust faster
        </div>
        {ENGAGEMENT_TYPES.map((tp) => (
          <TypeCard key={tp.id} tp={tp} onClick={() => handleSelect(tp)} />
        ))}
      </div>
    </>
  );
}
