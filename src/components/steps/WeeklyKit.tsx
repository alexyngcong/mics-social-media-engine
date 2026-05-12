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
import { KitBannerLive } from '../kit/KitBannerLive';
import { BriefView } from '../kit/BriefView';
import { PostHeader } from '../common/PostHeader';
import type { RoomId } from '../../types';

type KitViewMode = 'card' | 'brief';

interface KitPost {
  n: number;
  slug: string;
  slot: { day: string; time: string };
  framework: string;
  postType?: string;
  typeLabel?: string;
  typeIcon?: string;
  typeAccent?: string;
  room: RoomId;
  roomColor?: string;
  roomLabel?: string;
  theme: string;
  tier: string;
  title: string;
  sourceUrl?: string;
  filenameBase: string;
  // Extended banner-render fields (added in schema v2)
  photoUrl?: string;
  stat?: string;
  headlineLine1?: string;
  headlineLine2?: string;
  hoursAgo?: number | null;
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
  const [viewMode, setViewMode] = useState<KitViewMode>('card');

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

      {/* View toggle — card grid (banners + captions) vs brief list
          (📌 Post N — Title clean-list format the user prefers for bulk
          paste-into-doc workflows). */}
      <div className="flex gap-1.5 mb-3 p-1 rounded-card bg-ink-card border border-ink-border">
        <button
          onClick={() => setViewMode('card')}
          className={`
            flex-1 py-1.5 px-3 rounded-card text-[11px] font-semibold tracking-wide
            transition-all
            ${viewMode === 'card'
              ? 'bg-bronze/20 text-bronze border border-bronze/40'
              : 'text-tx-dim hover:text-tx-mid border border-transparent'
            }
          `}
        >
          🖼️ Card View
        </button>
        <button
          onClick={() => setViewMode('brief')}
          className={`
            flex-1 py-1.5 px-3 rounded-card text-[11px] font-semibold tracking-wide
            transition-all
            ${viewMode === 'brief'
              ? 'bg-bronze/20 text-bronze border border-bronze/40'
              : 'text-tx-dim hover:text-tx-mid border border-transparent'
            }
          `}
        >
          📋 Brief View
        </button>
      </div>

      {viewMode === 'card' ? (
        manifest.posts.map((post) => (
          <KitPostCard key={post.slug} post={post} />
        ))
      ) : (
        <BriefView posts={manifest.posts} weekOf={manifest.weekOf} />
      )}

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

  const typeAccent = post.typeAccent || '#A8926A';
  const typeLabel = post.typeLabel || 'OBSERVATION';
  const typeIcon = post.typeIcon || '';
  const isPoll = post.postType === 'poll';

  // Pull a subtitle for the header from the room label (e.g.
  // "RISK · UAE-SPECIFIC" → "UAE-Specific").
  const subtitle = (() => {
    const segments = (post.roomLabel || '').split(/\s*[·•]\s*/);
    return segments.length > 1 ? segments[segments.length - 1] : undefined;
  })();

  return (
    <Card className="!mb-3" accentColor={roomColor}>
      {/* Formatted PostHeader — same component used by calendar's DayDetail
          so both surfaces share the visual vocabulary the user approved.
          📌 Title (Room · subtitle) + Type: line + scheduled slot. */}
      <PostHeader
        title={post.title}
        room={post.room}
        subtitle={subtitle}
        postType={post.postType}
        framework={post.framework}
        slot={`${post.slot.day} ${post.slot.time}`}
      />

      {/* Banner preview — interactive React render. Photo guaranteed to
          load because we use a real <img> tag instead of SVG external
          <image href> which some browsers block when SVG is loaded via
          <img src>. Static SVG file still exists for downloads. */}
      <div className="mb-2.5">
        <KitBannerLive post={post} />
      </div>

      {/* Light supplemental tag row under the banner */}
      <div className="flex items-center gap-2 text-[10px] mb-2 flex-wrap">
        <span className="text-tx-dim">POST {post.n}</span>
        <span className="text-tx-ghost">·</span>
        <span className="text-tx-ghost">{post.framework}</span>
        <span
          className="font-bold tracking-wider px-1.5 py-0.5 rounded border ml-auto"
          style={{ color: typeAccent, background: `${typeAccent}1A`, borderColor: `${typeAccent}40` }}
          title={`Post type: ${typeLabel}`}
        >
          {typeIcon} {typeLabel}
        </span>
      </div>

      {/* Tier line */}
      <div className="text-[10px] tracking-wider mb-2" style={{ color: roomColor }}>
        {post.tier}
      </div>

      {/* Caption preview — polls get extra visual emphasis on the answer options */}
      <div
        className={`
          bg-ink border rounded-card px-3 py-2.5 mb-2.5
          text-[11px] text-tx-mid whitespace-pre-line leading-relaxed
          max-h-[220px] overflow-y-auto font-mono
          ${isPoll ? 'border-signal-purple/30' : 'border-ink-border'}
        `}
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
