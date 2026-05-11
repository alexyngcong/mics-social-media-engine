import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { Card } from '../ui/Card';
import { StepLabel } from '../ui/Label';
import { Button } from '../ui/Button';
import { useRoomNewsStatus } from '../../hooks/useRoomNewsStatus';
import { NewsStatusBadge } from '../qa/NewsStatusBadge';

export function RoomSelect() {
  const { setRoom, setStep } = useAppStore();
  const { statuses, probe, isProbing, anyFresh, totalFreshCount } = useRoomNewsStatus();

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <StepLabel>STEP 1 OF 3 &mdash; SELECT ROOM</StepLabel>
        <Button
          variant="ghost"
          onClick={probe}
          disabled={isProbing}
          className="!px-2.5 !py-1 !text-[10px]"
        >
          {isProbing ? 'Checking...' : 'Refresh'}
        </Button>
      </div>

      {/* Aggregate banner — quick read on the room landscape */}
      <div className={`
        mb-3 px-3.5 py-2 rounded-card border text-[11px]
        ${anyFresh
          ? 'bg-signal-green/5 border-signal-green/20 text-signal-green'
          : 'bg-signal-amber/5 border-signal-amber/20 text-signal-amber'
        }
      `}>
        {isProbing ? (
          <span>Checking all rooms for verified news in the last 24h...</span>
        ) : anyFresh ? (
          <span>
            <b>{totalFreshCount} fresh article{totalFreshCount === 1 ? '' : 's'}</b> available
            across the rooms marked <b>Fresh</b> below.
          </span>
        ) : (
          <span>
            No verified news in the last 24h across any room. The engine is
            blocking posts rather than serving stale content. Try Refresh in a few minutes.
          </span>
        )}
      </div>

      {ROOMS.map((rm) => {
        const st = statuses[rm.id];
        const isEmpty = st?.status === 'empty';
        return (
          <Card
            key={rm.id}
            clickable
            accentColor={rm.color}
            onClick={() => {
              setRoom(rm.id);
              setStep(2);
            }}
            className={isEmpty ? 'opacity-60' : ''}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-[15px] font-semibold" style={{ color: rm.color }}>
                {rm.icon} {rm.label}
              </div>
              {st && <NewsStatusBadge status={st.status} count={st.count} />}
            </div>
            <div className="text-tx-dim text-[12px] leading-snug mb-1">{rm.description}</div>
            <div className="text-bronze text-[10px]">MICS: {rm.micsServices}</div>
          </Card>
        );
      })}
    </>
  );
}
