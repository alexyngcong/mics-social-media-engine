import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useClipboard } from '../../hooks/useClipboard';
import { useBannerExport } from '../../hooks/useBannerExport';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { TEMPLATE_COUNT } from '../banner/templates';
import { BannerPreview } from '../banner/BannerPreview';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import type { GeneratedPost, DeepDivePost } from '../../types';

interface ResultViewProps {
  result: GeneratedPost;
  isDeep: boolean;
  deepResult?: DeepDivePost | null;
  onRetry: () => void;
}

export function ResultView({ result, isDeep, deepResult, onRetry }: ResultViewProps) {
  const store = useAppStore();
  const { copy } = useClipboard();
  const { saveBanner } = useBannerExport();
  const [imgSaved, setImgSaved] = useState(false);

  const room = ROOMS.find((r) => r.id === store.room);
  const platform = PLATFORMS.find((p) => p.id === store.platform);
  if (!room || !platform) return null;

  const dim = platform.imageDimensions[store.imageDimensionIndex] || platform.imageDimensions[0];
  const previewScale = Math.min(440 / dim.width, 0.42);

  const handleSave = async () => {
    const ok = await saveBanner();
    if (ok) {
      setImgSaved(true);
      setTimeout(() => setImgSaved(false), 3000);
    }
  };

  const deepData = deepResult || (result as DeepDivePost);

  return (
    <>
      {/* Quick steps guide */}
      <div className="bg-gradient-to-br from-ink-card to-ink-el border border-bronze/15 rounded-card-lg px-4 py-3 mb-3.5">
        <div className="text-[10px] font-bold text-bronze tracking-wide mb-1">
          SEND IN 3 STEPS
        </div>
        <div className="text-tx-mid text-[12px] leading-relaxed">
          <b className="text-tx-DEFAULT">1.</b> Save image{' '}
          <b className="text-tx-DEFAULT">2.</b> Copy text{' '}
          <b className="text-tx-DEFAULT">3.</b> Post on {platform.name}
        </div>
      </div>

      {/* Key finding (deep dive only) */}
      {isDeep && deepData.keyFinding && (
        <div className="bg-gradient-to-br from-signal-purple/5 to-ink-card border border-signal-purple/30 rounded-card p-4 mb-3.5">
          <div className="text-[10px] font-bold text-signal-purple tracking-wider mb-1">KEY FINDING</div>
          <div className="text-tx-DEFAULT text-[13px] leading-relaxed">{deepData.keyFinding}</div>
        </div>
      )}

      {/* Banner graphic */}
      <Label>GRAPHIC ({dim.width}x{dim.height})</Label>

      {/* Dimension selector */}
      {platform.imageDimensions.length > 1 && (
        <div className="flex gap-1.5 mb-2">
          {platform.imageDimensions.map((d, i) => (
            <button
              key={i}
              onClick={() => store.setImageDimensionIndex(i)}
              className={`px-2.5 py-1 text-[10px] rounded-full border transition-all ${
                store.imageDimensionIndex === i
                  ? 'bg-bronze/15 border-bronze/50 text-bronze font-semibold'
                  : 'border-ink-border text-tx-dim hover:border-bronze/30'
              }`}
            >
              {d.label} ({d.width}x{d.height})
            </button>
          ))}
        </div>
      )}

      <div className="rounded-card-lg overflow-hidden mb-2 border border-ink-border">
        <div style={{ width: dim.width * previewScale, height: dim.height * previewScale }}>
          <BannerPreview
            result={result}
            room={room}
            variant={store.bannerVariant}
            width={dim.width}
            height={dim.height}
            scale={previewScale}
            onReady={() => store.setBannerReady(true)}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={imgSaved ? 'green' : 'gold'}
          onClick={handleSave}
          className="flex-1 py-3 text-[12px]"
        >
          {imgSaved ? 'Saved!' : 'Save Image'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => store.shuffleVariant(TEMPLATE_COUNT)}
          className="py-3 text-[12px]"
        >
          Shuffle Design
        </Button>
      </div>

      {/* Deep dive: hook post + brief */}
      {isDeep && deepData.post && (
        <>
          <Label>HOOK POST</Label>
          <div className="bg-ink-card border border-ink-border rounded-card overflow-hidden mb-3">
            <div className="px-3.5 py-2 border-b border-ink-border flex justify-between items-center">
              <span className="text-tx-dim text-[11px]">Short post</span>
              <Button
                variant={store.copiedLabel === 'hook' ? 'green' : 'gold'}
                onClick={() => copy(deepData.post, 'hook')}
                className="!px-3.5 !py-1 !text-[11px]"
              >
                {store.copiedLabel === 'hook' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div
              onClick={() => copy(deepData.post, 'hook')}
              className="p-3.5 text-[13px] leading-relaxed text-tx-DEFAULT bg-ink-card cursor-pointer whitespace-pre-wrap break-words"
            >
              {deepData.post}
            </div>
          </div>

          <Label color="#A78BFA">DEEP BRIEF</Label>
          <div className="bg-ink-card border border-signal-purple/30 rounded-card overflow-hidden mb-3">
            <div className="px-3.5 py-2 border-b border-ink-border flex justify-between items-center bg-signal-purple/5">
              <span className="text-signal-purple text-[11px]">Extended analysis</span>
              <Button
                variant={store.copiedLabel === 'brief' ? 'green' : 'purple'}
                onClick={() => copy(deepData.brief, 'brief')}
                className="!px-3.5 !py-1 !text-[11px]"
              >
                {store.copiedLabel === 'brief' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div
              onClick={() => copy(deepData.brief, 'brief')}
              className="p-3.5 text-[13px] leading-loose text-tx-DEFAULT bg-ink-card cursor-pointer whitespace-pre-wrap break-words"
            >
              {deepData.brief}
            </div>
          </div>
        </>
      )}

      {/* Standard post text */}
      {!isDeep && (
        <>
          <Label>{platform.name.toUpperCase()} TEXT</Label>
          <div className="bg-ink-card border border-ink-border rounded-card overflow-hidden mb-2">
            <div className="px-3.5 py-2 border-b border-ink-border flex justify-between items-center">
              <span className="text-tx-dim text-[11px]">Tap to copy</span>
              <Button
                variant={store.copiedLabel === 'txt' ? 'green' : 'gold'}
                onClick={() => copy(result.text, 'txt')}
                className="!px-3.5 !py-1 !text-[11px]"
              >
                {store.copiedLabel === 'txt' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div
              onClick={() => copy(result.text, 'txt')}
              className="p-3.5 text-[13px] leading-relaxed text-tx-DEFAULT bg-ink-card cursor-pointer min-h-[100px] whitespace-pre-wrap break-words"
            >
              {result.text}
            </div>
          </div>
        </>
      )}

      {/* Hashtags */}
      {result.hashtags && result.hashtags.length > 0 && (
        <>
          <Label>HASHTAGS</Label>
          <div className="bg-ink-card border border-ink-border rounded-card overflow-hidden mb-2">
            <div className="px-3.5 py-2 border-b border-ink-border flex justify-between items-center">
              <span className="text-tx-dim text-[11px]">{result.hashtags.length} tags</span>
              <Button
                variant={store.copiedLabel === 'tags' ? 'green' : 'gold'}
                onClick={() => copy(result.hashtags!.map((t) => (t.startsWith('#') ? t : '#' + t)).join(' '), 'tags')}
                className="!px-3.5 !py-1 !text-[11px]"
              >
                {store.copiedLabel === 'tags' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="p-3.5 text-signal-blue text-[12px] leading-relaxed flex flex-wrap gap-1.5">
              {result.hashtags.map((tag, i) => (
                <span key={i} className="bg-signal-blue/10 px-2 py-0.5 rounded-full">
                  {tag.startsWith('#') ? tag : '#' + tag}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Thread posts (Twitter) */}
      {result.threadPosts && result.threadPosts.length > 0 && (
        <>
          <Label>THREAD</Label>
          {result.threadPosts.map((tweet, i) => (
            <div key={i} className="bg-ink-card border border-ink-border rounded-card overflow-hidden mb-1.5">
              <div className="px-3.5 py-2 flex justify-between items-center">
                <span className="text-tx-dim text-[11px]">Tweet {i + 2}</span>
                <Button
                  variant={store.copiedLabel === `thread${i}` ? 'green' : 'ghost'}
                  onClick={() => copy(tweet, `thread${i}`)}
                  className="!px-3 !py-0.5 !text-[10px]"
                >
                  {store.copiedLabel === `thread${i}` ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="px-3.5 pb-3 text-[12px] leading-relaxed text-tx-DEFAULT">{tweet}</div>
            </div>
          ))}
        </>
      )}

      {/* Source */}
      {result.sourceUrl && (
        <div className="bg-ink-card border border-ink-border rounded-card px-3.5 py-2 flex justify-between items-center mb-2">
          <span className="text-tx-dim text-[11px]">Source: {result.source}</span>
          <Button
            variant="ghost"
            onClick={() => window.open(result.sourceUrl, '_blank')}
            className="!px-3 !py-1 !text-[10px]"
          >
            Open
          </Button>
        </div>
      )}

      <Button variant="ghost" fullWidth onClick={onRetry} className="mt-1.5 py-3 text-[12px]">
        Generate Different Version
      </Button>
    </>
  );
}
