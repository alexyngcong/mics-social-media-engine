import { useState } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { useCalendarGenerate } from '../../hooks/useCalendarGenerate';
import { useClipboard } from '../../hooks/useClipboard';
import { useBannerExport } from '../../hooks/useBannerExport';
import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { BannerPreview } from '../banner/BannerPreview';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DayDetail() {
  const { selectedDate, entries, generatingDate, selectDate } = useCalendarStore();
  const setEntryStatus = useCalendarStore((s) => s.setEntryStatus);
  const { generateForDate } = useCalendarGenerate();
  const { copy } = useClipboard();
  const appStore = useAppStore();
  const { saveBanner } = useBannerExport();

  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [imgSaved, setImgSaved] = useState(false);

  if (!selectedDate) return null;
  const entry = entries[selectedDate];
  if (!entry || entry.status === 'skipped') return null;

  const room = ROOMS.find((r) => r.id === entry.room);
  if (!room) return null;

  const date = new Date(entry.date + 'T00:00:00');
  const dayName = WEEKDAY_NAMES[date.getDay()];
  const dayLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const isGenerating = generatingDate === selectedDate;
  const hasResult = !!entry.result;

  const whatsapp = PLATFORMS.find((p) => p.id === 'whatsapp')!;
  const dim = whatsapp.imageDimensions[0];
  const previewScale = Math.min(440 / dim.width, 0.38);

  const handleGenerate = async () => {
    setError('');
    try {
      await generateForDate(selectedDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
  };

  const handleCopy = (text: string, label: string) => {
    copy(text, label);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2500);
    if (entry.status === 'generated') {
      setEntryStatus(selectedDate, 'copied');
    }
  };

  const handleSaveBanner = async () => {
    if (!entry.result) return;
    // Temporarily set app store state for the banner export hook
    appStore.setResult(entry.result);
    appStore.setRoom(entry.room);
    appStore.setPlatform('whatsapp');
    if (entry.bannerVariant !== undefined) {
      appStore.setBannerReady(true);
    }
    const ok = await saveBanner();
    if (ok) {
      setImgSaved(true);
      setTimeout(() => setImgSaved(false), 3000);
    }
  };

  return (
    <div className="mt-4 bg-ink-card border border-ink-border rounded-card-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ink-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px]"
            style={{ background: `${room.color}18`, border: `1px solid ${room.color}30` }}
          >
            {room.icon}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-tx">
              {dayName}, {dayLabel}
            </div>
            <div className="text-[10px] text-tx-dim flex items-center gap-2">
              <span style={{ color: room.color }}>{room.short}</span>
              <span>&middot;</span>
              <span>{entry.postTimeLabel}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => selectDate(null)}
          className="text-tx-dim hover:text-tx text-[18px] leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Topic */}
      <div className="px-4 py-3 border-b border-ink-border/50">
        <div className="text-[9px] font-bold text-tx-ghost tracking-wider mb-1">TODAY'S TOPIC</div>
        <div className="text-[12px] text-tx-mid leading-relaxed">{entry.topic}</div>
      </div>

      {/* Content area */}
      <div className="px-4 py-3">
        {/* Not yet generated */}
        {!hasResult && !isGenerating && (
          <div className="text-center py-4">
            <div className="text-[11px] text-tx-dim mb-3">
              Post not yet generated for this day
            </div>
            <Button variant="gold" onClick={handleGenerate} className="!px-8 !py-2.5 !text-[12px]">
              Generate Post
            </Button>
            {error && (
              <div className="mt-3 text-[11px] text-signal-red">{error}</div>
            )}
          </div>
        )}

        {/* Generating */}
        {isGenerating && (
          <div className="flex flex-col items-center py-6 gap-3">
            <Spinner />
            <div className="text-[11px] text-tx-dim">Researching &amp; writing...</div>
          </div>
        )}

        {/* Generated result */}
        {hasResult && entry.result && (
          <div className="space-y-3">
            {/* Posting instructions */}
            <div className="bg-ink-el/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="text-[10px] text-bronze font-bold">POST AT</div>
              <div className="text-[13px] text-tx font-semibold">{entry.postTimeLabel}</div>
              <div className="text-[10px] text-tx-dim ml-auto">WhatsApp</div>
            </div>

            {/* Banner preview */}
            <div className="rounded-lg overflow-hidden border border-ink-border">
              <div style={{ width: dim.width * previewScale, height: dim.height * previewScale }}>
                <BannerPreview
                  result={entry.result}
                  room={room}
                  variant={entry.bannerVariant ?? 0}
                  width={dim.width}
                  height={dim.height}
                  scale={previewScale}
                />
              </div>
            </div>

            {/* Save image */}
            <Button
              variant={imgSaved ? 'green' : 'gold'}
              fullWidth
              onClick={handleSaveBanner}
              className="!py-2.5 !text-[12px]"
            >
              {imgSaved ? 'Image Saved!' : 'Save Banner Image'}
            </Button>

            {/* Post text */}
            <div className="bg-ink-el border border-ink-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-ink-border/50 flex justify-between items-center">
                <span className="text-[10px] text-tx-dim">WhatsApp text</span>
                <Button
                  variant={copiedField === 'cal-txt' ? 'green' : 'ghost'}
                  onClick={() => handleCopy(entry.result!.text, 'cal-txt')}
                  className="!px-3 !py-1 !text-[10px]"
                >
                  {copiedField === 'cal-txt' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div
                onClick={() => handleCopy(entry.result!.text, 'cal-txt')}
                className="px-3 py-3 text-[12px] leading-relaxed text-tx cursor-pointer whitespace-pre-wrap break-words"
              >
                {entry.result.text}
              </div>
            </div>

            {/* Stat + Source row */}
            <div className="flex gap-2">
              <div className="flex-1 bg-ink-el border border-ink-border rounded-lg px-3 py-2 text-center">
                <div className="text-[18px] font-serif font-bold text-tx">{entry.result.stat}</div>
                <div className="text-[9px] text-tx-dim mt-0.5">{entry.result.statLabel}</div>
              </div>
              {entry.result.source && (
                <div className="flex-1 bg-ink-el border border-ink-border rounded-lg px-3 py-2 flex flex-col justify-center">
                  <div className="text-[9px] text-tx-ghost">SOURCE</div>
                  <div className="text-[11px] text-tx-mid truncate">{entry.result.source}</div>
                </div>
              )}
            </div>

            {/* Regenerate */}
            <Button
              variant="ghost"
              fullWidth
              onClick={handleGenerate}
              disabled={isGenerating}
              className="!py-2 !text-[11px]"
            >
              Regenerate Post
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
