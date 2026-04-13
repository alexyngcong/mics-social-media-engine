import { useAppStore } from '../../store/appStore';
import { PLATFORMS } from '../../config/platforms';
import { Card } from '../ui/Card';
import { StepLabel } from '../ui/Label';

export function PlatformSelect() {
  const { setPlatform, setStep } = useAppStore();

  return (
    <>
      <StepLabel>SELECT PLATFORM</StepLabel>
      <p className="text-tx-mid text-[13px] mb-4 leading-relaxed">
        Choose where you'll publish. Content and graphics adapt to each platform.
      </p>
      {PLATFORMS.map((plat) => (
        <Card
          key={plat.id}
          clickable
          onClick={() => {
            setPlatform(plat.id);
            setStep(1);
          }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[15px] font-semibold" style={{ color: plat.color === '#000000' ? '#fff' : plat.color }}>
                {plat.icon} {plat.name}
              </div>
              <div className="text-tx-dim text-[11px] mt-1">
                {plat.imageDimensions.map((d) => `${d.width}x${d.height}`).join(' | ')}
              </div>
            </div>
            <div className="text-tx-ghost text-[11px]">
              {plat.maxLength < 500 ? `${plat.maxLength} chars` : plat.hashtagSupport ? 'Hashtags' : 'No hashtags'}
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
