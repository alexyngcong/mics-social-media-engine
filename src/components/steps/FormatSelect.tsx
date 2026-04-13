import { useAppStore } from '../../store/appStore';
import { POST_TYPES } from '../../config/postTypes';
import { Card } from '../ui/Card';
import { StepLabel } from '../ui/Label';

interface FormatSelectProps {
  onGenerate: () => void;
}

export function FormatSelect({ onGenerate }: FormatSelectProps) {
  const { setPostType, setStep } = useAppStore();

  return (
    <>
      <StepLabel>STEP 2 OF 3 &mdash; CHOOSE FORMAT</StepLabel>
      {POST_TYPES.map((tp) => (
        <Card
          key={tp.id}
          clickable
          onClick={() => {
            setPostType(tp.id);
            setStep(3);
            setTimeout(onGenerate, 200);
          }}
        >
          <div className="flex justify-between items-center">
            <span className="text-[14px] font-semibold text-tx">
              {tp.icon} {tp.label}
            </span>
            <span className="text-[10px] text-tx-dim bg-ink-el px-2.5 py-0.5 rounded-full">
              {tp.day}
            </span>
          </div>
        </Card>
      ))}
    </>
  );
}
