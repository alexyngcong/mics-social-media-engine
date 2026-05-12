/**
 * PostHeader — shared header chip used above every generated-post preview.
 *
 * Format (matches the user-approved pattern):
 *
 *   📌 CBUAE WhatsApp ban for licensed banks (Risk · UAE-specific)
 *       Type: 🚨 Compliance · Risk
 *
 * Rendered above the post preview in BOTH the calendar's DayDetail and
 * the kit's KitPostCard so the two surfaces share the same visual
 * vocabulary.
 */
import type { RoomId } from '../../types';

interface PostHeaderProps {
  /** The article title — stripped of source-name attribution */
  title: string;
  /** Room id — drives icon + colour */
  room: RoomId;
  /** Optional room subtitle (e.g. "UAE-specific", "Governance") shown in parens after room name */
  subtitle?: string;
  /** Post type id (alert / observation / pulse / poll / voicenote / exclusive) */
  postType?: string;
  /** Optional framework label, shown right of the type line (e.g. "PAS · ALERT") */
  framework?: string;
  /** Optional schedule slot, e.g. "Mon 08:00 GST" */
  slot?: string;
}

const ROOM_META: Record<RoomId, { icon: string; label: string; color: string }> = {
  growth:  { icon: '📡', label: 'Growth',  color: '#4ADE80' },
  capital: { icon: '🏦', label: 'Capital', color: '#F0C050' },
  risk:    { icon: '🛡️',  label: 'Risk',    color: '#EF5555' },
  world:   { icon: '🌍', label: 'World',   color: '#5B8DEE' },
};

const TYPE_META: Record<string, { icon: string; label: string }> = {
  alert:       { icon: '🚨', label: 'Alert' },
  observation: { icon: '🔍', label: 'Observation' },
  pulse:       { icon: '🎯', label: 'Pulse' },
  poll:        { icon: '🗳️', label: 'Poll' },
  voicenote:   { icon: '💬', label: 'Insider Note' },
  exclusive:   { icon: '🔒', label: 'Week Ahead' },
};

/** Strip news-outlet attribution suffix so the header reads cleanly. */
function cleanTitle(t: string): string {
  return String(t || '')
    .replace(/\s*[-|–—]\s*(Reuters|Bloomberg|CNBC|FT|WSJ|Forbes|The National|Gulf News|Khaleej Times|Arabian Business|Zawya|AGBI|MEED|Mondaq|Lexology|BBC|Guardian|Associated Press|AP|Economy Middle East|Gulf Business|Argaam)\s*$/i, '')
    .replace(/^(title|headline|breaking|update):\s*/gi, '')
    .trim();
}

export function PostHeader({ title, room, subtitle, postType, framework, slot }: PostHeaderProps) {
  const roomMeta = ROOM_META[room];
  const typeMeta = postType ? TYPE_META[postType] : null;
  const cleaned = cleanTitle(title);
  const subSegment = subtitle ? ` · ${subtitle}` : '';

  return (
    <div
      className="rounded-card border bg-ink-card px-3.5 py-3 mb-3"
      style={{ borderColor: `${roomMeta.color}40` }}
    >
      {/* Title row — 📌 + cleaned title + (Room · subtitle) */}
      <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
        <span className="text-[15px] leading-none">📌</span>
        <div className="flex-1 min-w-0">
          <span className="text-[13.5px] font-semibold text-tx leading-snug">
            {cleaned}
          </span>
          <span
            className="text-[12px] font-medium ml-1.5"
            style={{ color: roomMeta.color }}
          >
            ({roomMeta.icon} {roomMeta.label}{subSegment})
          </span>
        </div>
      </div>

      {/* Type + framework + slot meta row */}
      <div className="flex items-center gap-2 flex-wrap text-[10.5px] text-tx-dim">
        {typeMeta && (
          <span className="flex items-center gap-1">
            <span className="text-tx-ghost font-medium">Type:</span>
            <span className="text-tx-mid font-semibold">
              {typeMeta.icon} {typeMeta.label}
            </span>
            <span className="text-tx-ghost">·</span>
            <span className="text-tx-mid">{roomMeta.label}</span>
          </span>
        )}
        {framework && (
          <>
            {typeMeta && <span className="text-tx-ghost">·</span>}
            <span className="tracking-wide">{framework}</span>
          </>
        )}
        {slot && (
          <>
            <span className="text-tx-ghost">·</span>
            <span style={{ color: roomMeta.color }} className="font-semibold">
              📅 {slot}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
