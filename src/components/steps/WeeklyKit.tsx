/**
 * WeeklyKit — Step 13
 *
 * In-app view for the auto-generated weekly posting kit. Fetches the
 * lightweight `kit-latest.json` manifest same-origin, then for each post
 * lazy-loads the caption (.txt) and banner (.svg). Everything renders
 * inside the React app — no standalone HTML page, no external window.
 *
 * Data lifecycle:
 *   1. The seed manifest + 14 post files ship in public/ so the kit
 *      always has something to show.
 *   2. The GitHub Actions weekly cron regenerates the manifest +
 *      banners on the gh-pages branch.
 *   3. The deploy script (scripts/deploy.mjs) preserves the cron-
 *      generated versions over the bundled seeds.
 *
 * No paid API. No external tab. Fully integrated.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, StepLabel } from '../ui/Label';
import { useClipboard } from '../../hooks/useClipboard';
import type { RoomId } from '../../types';

interface KitPost {
  n: number;
  slug: string;
  slot: { day: string; time: string };
  framework: string;
  room: RoomId;
  theme: string;
  tier: string;
  title: string;
  sourceUrl?: string;
  filenameBase: string;
}

interface KitManifest {
  schemaVersion: number;
  generatedAt: string;
  weekOf: string;
  totalCount: number;
  posts: KitPost[];
}

const ROOM_COLOR: Record<RoomId, string> = {
  growth: '#4ADE80',
  capital: '#F0C050',
  risk: '#EF5555',
  world: '#5B8DEE',
};

const ROOM_LABEL: Record<RoomId, string> = {
  growth: 'GROWTH',
  capital: 'CAPITAL',
  risk: 'RISK',
  world: 'WORLD',
};

export function WeeklyKit() {
  const { setStep } = useAppStore();
  const [manifest, setManifest] = useState<KitManifest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const cacheBust = Math.floor(Date.now() / 60_000);
    fetch(`${base}/kit-latest.json?t=${cacheBust}`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: KitManifest) => {
        if (!cancelled) {
          setManifest(data);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(`Could not load the kit manifest: ${e.message}. The cron may not have populated it yet.`);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <StepLabel>WEEKLY POSTING KIT</StepLabel>
        <Card>
          <div className="text-[12px] text-tx-dim text-center py-6">
            Loading kit...
          </div>
        </Card>
      </>
    );
  }

  if (error || !manifest) {
    return (
      <>
        <StepLabel>WEEKLY POSTING KIT</StepLabel>
        <Card className="!bg-signal-amber/5 !border-signal-amber/25">
          <div className="text-[11px] font-bold tracking-wider text-signal-amber mb-1.5">
            KIT NOT AVAILABLE
          </div>
          <div className="text-[11px] text-tx-mid leading-relaxed">
            {error || 'No kit data yet. The weekly auto-builder runs every Sunday and after each fresh news pull.'}
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setStep(0)}
            className="!mt-3 !py-2 !text-[11px]"
          >
            ← Back to Command Center
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <StepLabel>WEEKLY KIT — {manifest.totalCount} POSTS</StepLabel>
        <Button
          variant="ghost"
          onClick={() => setStep(0)}
          className="!px-2.5 !py-1 !text-[10px]"
        >
          ← Home
        </Button>
      </div>

      <Card className="!mb-3 !bg-gradient-to-br !from-bronze/10 !to-ink-card !border-bronze/25">
        <div className="text-[10px] font-bold tracking-wider text-bronze mb-1">
          📦 AUTO-REFRESHED · WEEK OF {manifest.weekOf?.toUpperCase()}
        </div>
        <div className="text-[11px] text-tx-mid leading-relaxed">
          7 signals, room and framework rotated across the week. Tap any post
          to copy the caption and download the banner. Regenerates every Sunday
          and after each fresh news pull.
        </div>
      </Card>

      {manifest.posts.map((post) => (
        <KitPostCard key={post.slug} post={post} />
      ))}

      <Button
        variant="ghost"
        fullWidth
        onClick={() => setStep(0)}
        className="!mt-4 !py-2.5 !text-[11px]"
      >
        ← Back to Command Center
      </Button>
    </>
  );
}

// ─── Individual post card ───────────────────────────────────────

interface KitPostCardProps {
  post: KitPost;
}

function KitPostCard({ post }: KitPostCardProps) {
  const { copy } = useClipboard();
  const { copiedLabel } = useAppStore();
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const svgUrl = `${base}/kit/${post.filenameBase}.svg`;
  const txtUrl = `${base}/kit/${post.filenameBase}.txt`;
  const roomColor = ROOM_COLOR[post.room];
  const roomLabel = ROOM_LABEL[post.room];

  const [caption, setCaption] = useState<string>('Loading caption...');

  useEffect(() => {
    let cancelled = false;
    fetch(txtUrl, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((t) => {
        if (!cancelled) setCaption(t);
      })
      .catch(() => {
        if (!cancelled) setCaption('[caption file not available]');
      });
    return () => {
      cancelled = true;
    };
  }, [txtUrl]);

  const handleCopy = () => copy(caption, `kit-${post.n}`);
  const handleDownloadSvg = () => {
    const a = document.createElement('a');
    a.href = svgUrl;
    a.download = `${post.filenameBase}.svg`;
    a.click();
  };

  const handleDownloadPng = async () => {
    try {
      const res = await fetch(svgUrl, { cache: 'no-cache' });
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1080, 1080);
        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(pngBlob);
          a.download = `${post.filenameBase}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, 'image/png');
      };
      img.src = url;
    } catch {
      /* swallow — user can use SVG download instead */
    }
  };

  return (
    <Card className="!mb-3" accentColor={roomColor}>
      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap text-[9px]">
          <span
            className="font-bold tracking-wider px-1.5 py-0.5 rounded border"
            style={{ color: roomColor, background: `${roomColor}1A`, borderColor: `${roomColor}40` }}
          >
            {roomLabel}
          </span>
          <span className="text-tx-dim">POST {post.n}</span>
          <span className="text-tx-ghost">·</span>
          <span className="text-tx-ghost">{post.framework}</span>
        </div>
        <span className="text-[9px] text-bronze tracking-wide">
          📅 {post.slot.day} {post.slot.time}
        </span>
      </div>

      {/* Banner preview */}
      <div className="bg-ink rounded-card overflow-hidden mb-2.5 border border-ink-border">
        <img
          src={svgUrl}
          alt={`Banner for post ${post.n}`}
          loading="lazy"
          className="w-full h-auto block"
        />
      </div>

      {/* Title */}
      <div className="text-[13px] font-semibold text-tx leading-snug mb-1">
        {post.title}
      </div>
      <div className="text-[10px] tracking-wider mb-2" style={{ color: roomColor }}>
        {post.tier}
      </div>

      {/* Caption preview (scrollable) */}
      <div
        className="
          bg-ink border border-ink-border rounded-card px-3 py-2.5 mb-2.5
          text-[11px] text-tx-mid whitespace-pre-line leading-relaxed
          max-h-[180px] overflow-y-auto font-mono
        "
      >
        {caption}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="gold"
          onClick={handleCopy}
          className="!py-1.5 !text-[11px] flex-1"
        >
          {copiedLabel === `kit-${post.n}` ? '✓ Copied' : '📋 Copy Caption'}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDownloadSvg}
          className="!py-1.5 !text-[10px] !px-3"
        >
          ⬇ SVG
        </Button>
        <Button
          variant="ghost"
          onClick={handleDownloadPng}
          className="!py-1.5 !text-[10px] !px-3"
        >
          ⬇ PNG
        </Button>
        {post.sourceUrl && (
          <Button
            variant="ghost"
            onClick={() => window.open(post.sourceUrl, '_blank', 'noopener')}
            className="!py-1.5 !text-[10px] !px-3"
          >
            ↗ Source
          </Button>
        )}
      </div>
    </Card>
  );
}
