import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { Card } from '../ui/Card';
import { StepLabel } from '../ui/Label';

export function RoomSelect() {
  const { setRoom, setStep } = useAppStore();

  return (
    <>
      <StepLabel>STEP 1 OF 3 &mdash; SELECT ROOM</StepLabel>
      {ROOMS.map((rm) => (
        <Card
          key={rm.id}
          clickable
          accentColor={rm.color}
          onClick={() => {
            setRoom(rm.id);
            setStep(2);
          }}
        >
          <div className="text-[15px] font-semibold mb-1" style={{ color: rm.color }}>
            {rm.icon} {rm.label}
          </div>
          <div className="text-tx-dim text-[12px] leading-snug mb-1">{rm.description}</div>
          <div className="text-bronze text-[10px]">MICS: {rm.micsServices}</div>
        </Card>
      ))}
    </>
  );
}
