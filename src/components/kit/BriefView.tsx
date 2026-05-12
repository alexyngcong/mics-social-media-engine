/**
 * BriefView — clean list-pattern view of all weekly-kit posts.
 *
 * Renders the kit in the user-preferred summary format:
 *
 *   📌 Post 1 — Hormuz oil shock (Risk / World)
 *   Framework: PAS · Type: alert · ~890 chars
 *
 *   [body text…]
 *
 *   📌 Post 2 — China PPI 45-month high (World)
 *   Framework: DATA · Type: observation · ~870 chars
 *
 *   [body text…]
 *
 * Plus a "🎯 Suggested posting sequence" table at the bottom and a
 * "Copy entire week" button at the top.
 *
 * Triggered by the "Brief View" toggle button in WeeklyKit. Switching
 * back to Card View shows the banner+caption cards.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { RoomId } from '../../types';

interface BriefPost {
  n: number;
  slug: string;
  slot: { day: string; time: string };
  framework: string;
  postType?: string;
  typeLabel?: string;
  room: RoomId;
  roomLabel?: string;
  tier: string;
  title: string;
  sourceUrl?: string;
  filenameBase: string;
}

interface BriefViewProps {
  posts: BriefPost[];
  weekOf?: string;
}

const ROOM_DISPLAY: Record<RoomId, string> = {
  growth: 'Growth',
  capital: 'Capital',
  risk: 'Risk',
  world: 'World',
};

const ROOM_COLOR: Record<RoomId, string> = {
  growth: '#4ADE80',
  capital: '#F0C050',
  risk: '#EF5555',
  world: '#5B8DEE',
};

export function BriefView({ posts, weekOf }: BriefViewProps) {
  const { copiedLabel, setCopied } = useAppStore();
  const [captions, setCaptions] = useState<Record<number, string>>({});

  // Lazy-load each post's caption text from /kit/<slug>.txt
  useEffect(() => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    let cancelled = false;
    Promise.all(
      posts.map(async (p) => {
        try {
          const res = await fetch(`${base}/kit/${p.filenameBase}.txt`, { cache: 'no-cache' });
          if (!res.ok) return [p.n, '[caption unavailable]'] as const;
          const txt = await res.text();
          return [p.n, txt] as const;
        } catch {
          return [p.n, '[caption unavailable]'] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<number, string> = {};
      for (const [n, txt] of entries) map[n] = txt;
      setCaptions(map);
    });
    return () => {
      cancelled = true;
    };
  }, [posts]);

  // Build the full plain-text export — what the "Copy entire week" button copies
  const buildFullExport = () => {
    const blocks = posts.map((p) => {
      const caption = (captions[p.n] || '').trim();
      const chars = caption.length;
      const charBadge = chars > 0 ? ` · ~${Math.round(chars / 10) * 10} chars` : '';
      return `📌 Post ${p.n} — ${stripParenSuffix(p.title)} (${ROOM_DISPLAY[p.room]})
Framework: ${p.framework}${charBadge}

${caption}`;
    });
    const week = weekOf ? `Week of ${weekOf}\n\n` : '';
    const footer = `\n\n🎯 Suggested posting sequence\n` +
      posts.map((p) => `${p.slot.day} ${p.slot.time}\t#${p.n} ${stripParenSuffix(p.title)} (${ROOM_DISPLAY[p.room]})`).join('\n');
    return week + blocks.join('\n\n') + footer + '\n';
  };

  const handleCopyAll = async () => {
    const text = buildFullExport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied('brief-all');
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* fallback would need a textarea trick */
    }
  };

  return (
    <div>
      {/* Top bar — bulk copy + week label */}
      <Card className="!mb-3 !bg-gradient-to-br !from-bronze/10 !to-ink-card !border-bronze/30">
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-bronze mb-0.5">
              📋 BRIEF VIEW · LIST FORMAT
            </div>
            {weekOf && (
              <div className="text-[11px] text-tx-mid">Week of {weekOf}</div>
            )}
          </div>
          <Button
            variant="gold"
            onClick={handleCopyAll}
            className="!py-1.5 !px-3 !text-[11px]"
          >
            {copiedLabel === 'brief-all' ? '✓ All Copied' : '📋 Copy entire week'}
          </Button>
        </div>
        <div className="text-[11px] text-tx-mid leading-relaxed">
          All 7 posts in one clean list with headers. Tap "Copy entire week"
          to paste the whole kit into a doc, email, or chat in one go.
        </div>
      </Card>

      {/* Per-post entries */}
      {posts.map((p) => (
        <BriefPostBlock
          key={p.slug}
          post={p}
          caption={captions[p.n] || 'Loading…'}
        />
      ))}

      {/* Posting sequence table */}
      <Card className="!mt-4 !bg-ink-el/40 !border-ink-border">
        <div className="text-[10px] font-bold tracking-wider text-bronze mb-2">
          🎯 SUGGESTED POSTING SEQUENCE
        </div>
        <div className="text-[11px] text-tx-mid space-y-1.5">
          {posts.map((p) => (
            <div key={p.slug} className="flex items-baseline gap-2">
              <span
                className="font-bold tracking-wide flex-shrink-0 w-[110px]"
                style={{ color: ROOM_COLOR[p.room] }}
              >
                {p.slot.day} {p.slot.time}
              </span>
              <span className="text-tx-mid">
                <span className="text-tx-dim">#{p.n}</span>{' '}
                {stripParenSuffix(p.title)}{' '}
                <span className="text-tx-ghost">({ROOM_DISPLAY[p.room]})</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Per-post block ─────────────────────────────────────────────

interface BriefPostBlockProps {
  post: BriefPost;
  caption: string;
}

function BriefPostBlock({ post, caption }: BriefPostBlockProps) {
  const { copiedLabel, setCopied } = useAppStore();
  const charCount = caption && caption !== 'Loading…' ? caption.trim().length : 0;
  const charBadge = charCount > 0 ? `~${Math.round(charCount / 10) * 10} chars` : '';
  const roomColor = ROOM_COLOR[post.room];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption.trim());
      setCopied(`brief-${post.n}`);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className="!mb-2.5" accentColor={roomColor}>
      <div className="text-[13px] font-semibold mb-1" style={{ color: roomColor }}>
        📌 Post {post.n} — {stripParenSuffix(post.title)} ({ROOM_DISPLAY[post.room]})
      </div>
      <div className="text-[10px] text-tx-dim mb-2 tracking-wide">
        Framework: {post.framework}{charBadge ? ` · ${charBadge}` : ''} ·{' '}
        <span style={{ color: roomColor }}>{post.slot.day} {post.slot.time}</span>
      </div>
      <div className="text-[11px] text-tx-mid leading-relaxed whitespace-pre-line font-mono bg-ink rounded-card px-3 py-2.5 border border-ink-border max-h-[280px] overflow-y-auto">
        {caption}
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          variant="ghost"
          onClick={handleCopy}
          className="!py-1.5 !text-[10px] !px-3"
        >
          {copiedLabel === `brief-${post.n}` ? '✓ Copied' : '📋 Copy this post'}
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

// Strip "- Reuters" / " (Bloomberg)" attribution suffix so the brief header
// reads cleanly. The full title remains in the card's `title` field.
function stripParenSuffix(title: string): string {
  return String(title || '')
    .replace(/\s*[-|–—]\s*(Reuters|Bloomberg|CNBC|FT|WSJ|Forbes|The National|Gulf News|Khaleej Times|Arabian Business|Zawya|AGBI|MEED|Mondaq|Lexology|BBC|Guardian|Associated Press|AP|Economy Middle East|Gulf Business|Argaam)\s*$/i, '')
    .trim();
}
