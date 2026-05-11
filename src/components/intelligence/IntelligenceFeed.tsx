/**
 * Intelligence Feed — Phase 2 Command Center MVP
 *
 * Renders the latest items from news-latest.json grouped by room.
 * Each item has a "🤖 Generate AI Brief" button that:
 *   1. Builds a complete LLM prompt for the article
 *   2. Auto-copies it to clipboard
 *   3. Opens claude.ai in a new tab
 *   4. User pastes + waits + copies response back
 *   5. Returns to app → "📥 Paste AI Response" → instant 17-output post pack
 */

import { useEffect, useState } from 'react';
import type { IntelligenceFeed as Feed, IntelligenceItem, RoomId } from '../../types';
import {
  loadIntelligenceFeed,
  formatFeedAge,
} from '../../services/intelligenceFeed';
import { launchAIBrief } from '../../services/promptBuilder';
import { ROOMS } from '../../config/rooms';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label } from '../ui/Label';

type RoomFilter = 'all' | RoomId;

interface IntelligenceFeedProps {
  /** Called when user clicks "Paste AI Response" — routes to the paste flow */
  onPasteResponse: (item: IntelligenceItem) => void;
}

export function IntelligenceFeed({ onPasteResponse }: IntelligenceFeedProps) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');
  const [flashMessage, setFlashMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadIntelligenceFeed().then((f) => {
      if (!cancelled) {
        setFeed(f);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    const f = await loadIntelligenceFeed(true);
    setFeed(f);
    setLoading(false);
  };

  const handleGenerateBrief = async (item: IntelligenceItem) => {
    const ok = await launchAIBrief(item);
    setFlashMessage(
      ok
        ? '✓ Prompt copied & claude.ai opened. Paste, wait, copy response, click Paste AI Response.'
        : '✗ Clipboard write blocked. Open the prompt manually from the browser console.'
    );
    setTimeout(() => setFlashMessage(''), 8000);
  };

  if (loading) {
    return (
      <Card className="!mb-3 !bg-ink-card !border-ink-border">
        <div className="text-[12px] text-tx-dim text-center py-4">
          Loading intelligence feed...
        </div>
      </Card>
    );
  }

  if (!feed || feed.totalCount === 0) {
    return (
      <Card className="!mb-3 !bg-signal-amber/5 !border-signal-amber/20">
        <div className="text-[11px] font-bold tracking-wider text-signal-amber mb-1">
          ⚠️ NO STRATEGIC SIGNAL CLEARED THE BAR
        </div>
        <div className="text-[11px] text-tx-mid leading-relaxed">
          Nothing in the last cycle passed the strategic-signal threshold —
          rather than serve recycled commentary, the room stays quiet until
          something worth flagging lands. The feed refreshes every 4 hours.
          In the meantime, use Import Deep Research Brief to bring an external
          signal into the room.
        </div>
        <Button
          variant="ghost"
          onClick={handleRefresh}
          className="!mt-2 !py-1.5 !text-[10px]"
        >
          🔄 Check again
        </Button>
      </Card>
    );
  }

  // Build filtered items
  const rooms: RoomId[] = ['growth', 'capital', 'risk', 'world'];
  const visibleRooms = roomFilter === 'all' ? rooms : [roomFilter];
  const visibleCount = visibleRooms.reduce(
    (sum, r) => sum + feed.rooms[r].length,
    0,
  );

  // Detect the dominant strategic theme across all rooms so the header
  // surfaces a single "what this week is really about" callout instead
  // of reading like a news index. Returns null when no theme dominates.
  const themeCallout = detectWeeklyTheme(feed);

  // Count items fresh enough to act on this week (< 24h)
  const freshCount = rooms.reduce(
    (sum, r) => sum + feed.rooms[r].filter(i => i.hoursAgo <= 24).length,
    0,
  );

  return (
    <>
      {/* Header card — positioned as a strategic-signal command center,
          NOT a news aggregator. The wording deliberately suppresses
          "score" / "items" / "feed" language that leaks the system
          layer into the user experience. */}
      <Card className="!mb-3 !bg-gradient-to-br !from-signal-purple/10 !to-ink-card !border-signal-purple/25">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-signal-purple">
              ⚡ STRATEGIC SIGNALS  ·  AHEAD OF MAINSTREAM
            </div>
            <div className="text-[10px] text-tx-dim mt-0.5">
              {feed.totalCount} signals tracked · {freshCount} fresh in last 24h · Read {formatFeedAge(feed)}
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleRefresh}
            className="!px-2.5 !py-1 !text-[10px]"
          >
            🔄 Refresh
          </Button>
        </div>

        {/* "Pattern this week" callout when one theme dominates */}
        {themeCallout && (
          <div className="text-[10.5px] text-bronze leading-relaxed mb-2 px-2 py-1.5 rounded bg-bronze/8 border border-bronze/20">
            <span className="font-bold tracking-wider">PATTERN THIS WEEK:</span>{' '}
            {themeCallout}
          </div>
        )}

        {/* Room filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <FilterChip
            label={`All · ${feed.totalCount}`}
            active={roomFilter === 'all'}
            onClick={() => setRoomFilter('all')}
          />
          {rooms.map((r) => {
            const room = ROOMS.find(x => x.id === r);
            return (
              <FilterChip
                key={r}
                label={`${room?.icon || ''} ${room?.short || r} · ${feed.rooms[r].length}`}
                color={room?.color}
                active={roomFilter === r}
                onClick={() => setRoomFilter(r)}
              />
            );
          })}
        </div>
      </Card>

      {/* Flash message after Generate Brief click */}
      {flashMessage && (
        <Card className="!mb-3 !bg-signal-green/10 !border-signal-green/30">
          <div className="text-[11px] text-signal-green leading-relaxed">
            {flashMessage}
          </div>
        </Card>
      )}

      {visibleCount === 0 && (
        <Card className="!mb-3">
          <div className="text-[11px] text-tx-dim text-center py-3">
            No items in this room right now. Try another filter or refresh.
          </div>
        </Card>
      )}

      {/* Items grouped by room */}
      {visibleRooms.map((room) => {
        const items = feed.rooms[room];
        if (items.length === 0) return null;
        const roomMeta = ROOMS.find((r) => r.id === room);
        return (
          <div key={room} className="mb-4">
            {roomFilter === 'all' && (
              <Label color={roomMeta?.color}>
                {roomMeta?.icon} {roomMeta?.label.toUpperCase()} ({items.length})
              </Label>
            )}
            {items.map((item, i) => (
              <IntelligenceCard
                key={`${item.url}-${i}`}
                item={item}
                roomColor={roomMeta?.color}
                onGenerateBrief={handleGenerateBrief}
                onPasteResponse={onPasteResponse}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

// ─── Helper components ─────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}

function FilterChip({ label, active, color, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all
        ${active
          ? 'border-bronze/60 bg-bronze/15 text-bronze'
          : 'border-ink-border bg-ink-card text-tx-dim hover:border-tx-dim/40'
        }
      `}
      style={active && color ? {
        borderColor: `${color}80`,
        background: `${color}20`,
        color: color,
      } : undefined}
    >
      {label}
    </button>
  );
}

interface IntelligenceCardProps {
  item: IntelligenceItem;
  roomColor?: string;
  onGenerateBrief: (item: IntelligenceItem) => void;
  onPasteResponse: (item: IntelligenceItem) => void;
}

function IntelligenceCard({ item, roomColor, onGenerateBrief, onPasteResponse }: IntelligenceCardProps) {
  const ageStr = item.hoursAgo <= 1 ? 'just now'
    : item.hoursAgo <= 24 ? `${item.hoursAgo}h ago`
    : `${Math.floor(item.hoursAgo / 24)}d ago`;

  // Strategic-attribute chips replace the raw SCORE number.
  // The user-facing read should be "why this matters" (intelligence frame),
  // not "how it ranked" (news-aggregator frame). Up to 3 chips, ordered
  // most-significant-first so the eye lands on the strongest signal.
  const attrs = deriveStrategicAttributes(item);

  return (
    <Card className="!mb-2" accentColor={roomColor}>
      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap text-[9px]">
          {attrs.map((a) => (
            <span
              key={a.label}
              className="font-bold tracking-wider px-1.5 py-0.5 rounded border"
              style={{ color: a.color, background: `${a.color}1A`, borderColor: `${a.color}40` }}
              title={a.tooltip}
            >
              {a.label}
            </span>
          ))}
          <span className="text-tx-dim">{item.topic}</span>
          <span className="text-tx-ghost">·</span>
          <span className="text-tx-ghost">{ageStr}</span>
        </div>
        <span className="text-[9px] text-tx-ghost italic shrink-0">{item.source}</span>
      </div>

      {/* Title */}
      <div className="text-[13px] font-semibold text-tx leading-snug mb-2">
        {item.title}
      </div>

      {/* Description (truncated) */}
      {item.description && item.description !== item.title && (
        <div className="text-[11px] text-tx-mid leading-relaxed mb-2 line-clamp-3">
          {item.description}
        </div>
      )}

      {/* Action row */}
      <div className="flex gap-2 mt-2">
        <Button
          variant="purple"
          onClick={() => onGenerateBrief(item)}
          className="flex-1 !py-1.5 !text-[11px]"
        >
          🤖 Generate AI Brief
        </Button>
        <Button
          variant="ghost"
          onClick={() => onPasteResponse(item)}
          className="flex-1 !py-1.5 !text-[11px]"
        >
          📥 Paste Response
        </Button>
      </div>
    </Card>
  );
}

// ─── Weekly theme detection ─────────────────────────────────────
// Surfaces the dominant cross-room pattern when 3+ items share the same
// strategic theme. The point is that an intelligence command center
// connects signals, not lists them — "3 items this week point to capital-
// buffer tightening" reads very differently from "24 articles".
//
// Returns a short sentence when a theme dominates, null otherwise.

const THEME_PATTERNS: Array<{ test: RegExp; phrase: string }> = [
  { test: /\b(oil|brent|wti|opec|hormuz|crude|barrel|refining|petroleum)\b/i,
    phrase: 'energy and shipping-route disruption with downstream UAE freight + refining-margin exposure.' },
  { test: /\b(tariff|trade war|sanction|sanctions|export control|customs|cbam)\b/i,
    phrase: 'trade-policy fragmentation pulling supplier-mix and currency-mix decisions forward.' },
  { test: /\b(rate|yield|fed|ecb|cbuae|interest|inflation|cpi|ppi|treasur|bond|sukuk)\b/i,
    phrase: 'rate and funding-curve repositioning — quarterly treasury policy review warranted.' },
  { test: /\b(compliance|enforce|penalty|fine|sanction|aml|kyc|audit|tax|fta|pillar 2|dmtt|einvoic|emiratisation)\b/i,
    phrase: 'regulatory enforcement tightening — audit-trail readiness moves from quarterly to monthly cadence.' },
  { test: /\b(ai|artificial intelligence|capex|data centre|data center|automation|chip|gpu)\b/i,
    phrase: 'AI-capex restructuring shifting capital-allocation conversations into board-level territory.' },
  { test: /\b(ipo|listing|merger|acquisition|m&a|consolidation|stake|spv|family office)\b/i,
    phrase: 'capital-markets and consolidation activity opening structural windows for early movers.' },
];

function detectWeeklyTheme(feed: Feed): string | null {
  // Pool all items across rooms
  const all = (['growth', 'capital', 'risk', 'world'] as RoomId[])
    .flatMap(r => feed.rooms[r] || []);
  if (all.length < 3) return null;

  // Count theme hits — only patterns matching at least 3 items count
  const counts: Record<number, number> = {};
  for (const item of all) {
    const blob = `${item.title} ${item.description || ''}`;
    THEME_PATTERNS.forEach((p, i) => {
      if (p.test.test(blob)) counts[i] = (counts[i] || 0) + 1;
    });
  }
  let bestIdx = -1;
  let bestCount = 2; // require strictly more than 2 matches
  for (const [idxStr, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestCount = c;
      bestIdx = Number(idxStr);
    }
  }
  if (bestIdx < 0) return null;
  return `${bestCount} signals point to ${THEME_PATTERNS[bestIdx].phrase}`;
}

// ─── Strategic attribute derivation ─────────────────────────────
// Replaces the raw "SCORE N" chip. Reads the item shape and surfaces up
// to 3 attribute chips that signal *why* this item is worth attention,
// in language a CFO recognises instantly. Ordered most-significant first.

interface StrategicAttr {
  label: string;
  color: string;
  tooltip: string;
}

function deriveStrategicAttributes(item: IntelligenceItem): StrategicAttr[] {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  const out: StrategicAttr[] = [];

  // 1. AHEAD-OF-CURVE — high-impact signal that just landed (rare, high value)
  if (item.score >= 11 && item.hoursAgo <= 6) {
    out.push({
      label: 'AHEAD-OF-CURVE',
      color: '#A8926A',
      tooltip: 'High-impact signal landed in the last 6h — front-foot position',
    });
  } else if (item.score >= 11) {
    out.push({
      label: 'STRUCTURAL',
      color: '#A8926A',
      tooltip: 'High-impact strategic signal worth board attention',
    });
  }

  // 2. UAE-LINKED — direct regional exposure (always a top filter for this audience)
  if (/\b(uae|dubai|abu dhabi|sharjah|ajman|fujairah|emirates|gulf|gcc|saudi|ksa|qatar|bahrain|oman|kuwait|difc|adgm|cbuae|fta|mof|dfsa|mohre|moiat|wam)\b/.test(text)) {
    out.push({
      label: 'UAE-LINKED',
      color: '#5B8DEE',
      tooltip: 'Direct UAE/GCC regulatory or commercial exposure',
    });
  }

  // 3. ENFORCEMENT — regulatory action / penalty / deadline language
  if (/\b(penalty|penalties|fine|fines|sanction|sanctioned|enforce|prosecution|imprisonment|deadline|comply|compliance|breach|violation|effective\s+\d|enters into force|come into force)\b/.test(text)) {
    out.push({
      label: 'ENFORCEMENT',
      color: '#EF5555',
      tooltip: 'Regulatory enforcement, penalty exposure, or compliance deadline',
    });
  }

  // 4. TIME-SENSITIVE — fresh enough to act on this week
  if (item.hoursAgo <= 24 && out.length < 3) {
    out.push({
      label: 'TIME-SENSITIVE',
      color: '#F0C050',
      tooltip: 'Signal under 24h old — act inside this week',
    });
  }

  // 5. TRANSMISSION RISK — global signal with downstream GCC impact
  if (/\b(transmission|spillover|second.order|knock.on|contagion|ripple|cascade)\b/.test(text) && out.length < 3) {
    out.push({
      label: 'TRANSMISSION RISK',
      color: '#A78BFA',
      tooltip: 'Global signal with downstream GCC transmission expected',
    });
  }

  // Floor: if nothing matched, show a single STRATEGIC SIGNAL chip so the
  // card never looks unbadged. Never expose the raw score — that's a news-
  // ranking artifact that leaks the system layer into the user experience.
  if (out.length === 0) {
    out.push({
      label: 'STRATEGIC SIGNAL',
      color: '#A8926A',
      tooltip: 'Passed the intelligence-grade scoring threshold',
    });
  }

  return out.slice(0, 3);
}
