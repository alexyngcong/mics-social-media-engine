/**
 * BriefImport — Paste a Deep Research brief, parse, and pick items to post
 *
 * Acts as the middleman between any external Deep Research source
 * (ChatGPT, Claude, Perplexity, etc.) and the post-generation engine.
 *
 * Flow:
 *   1. User pastes the entire brief content into the textarea
 *   2. Parser extracts structured items (title, source, URL, CFO implication)
 *   3. Items render as cards with priority + room hints + tags
 *   4. User clicks "Use this for a post" → routes to format selection
 *   5. Generation flow uses the brief's CFO implication as body content,
 *      so the post inherits the brief's analytical depth
 */

import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { parseBrief } from '../../services/briefParser';
import { ROOMS } from '../../config/rooms';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, StepLabel } from '../ui/Label';
import type { BriefItem, RoomId, ImportedBrief } from '../../types';

const SAMPLE_HINT = `Paste your CFO Early Warning Brief here.

Works with output from:
- ChatGPT Deep Research
- Claude (this chat)
- Perplexity
- Any markdown-formatted research brief

The parser accepts markdown tables, numbered lists, and structured blocks.
It extracts source, URL, headline, and CFO implications for each item.`;

const PRIORITY_BADGE = {
  high:    { label: 'HIGH',    cls: 'bg-signal-red/15 text-signal-red border-signal-red/30' },
  medium:  { label: 'MEDIUM',  cls: 'bg-signal-amber/15 text-signal-amber border-signal-amber/30' },
  watch:   { label: 'WATCH',   cls: 'bg-signal-blue/15 text-signal-blue border-signal-blue/30' },
  unknown: { label: 'ITEM',    cls: 'bg-tx-ghost/15 text-tx-mid border-tx-ghost/30' },
};

export function BriefImport() {
  const store = useAppStore();
  const [rawContent, setRawContent] = useState('');
  const [hasParsed, setHasParsed] = useState(false);
  const [parseError, setParseError] = useState('');

  const brief = store.brief;

  const handleParse = () => {
    setParseError('');
    if (!rawContent.trim() || rawContent.trim().length < 50) {
      setParseError('Paste a longer brief — under 50 characters can\'t carry enough structure to parse.');
      return;
    }
    try {
      const items = parseBrief(rawContent);
      if (items.length === 0) {
        setParseError('No items found. The parser looks for markdown tables, numbered lists with URLs, or "Source:"/"URL:" patterns. Try adding clearer structure.');
        return;
      }
      const imported: ImportedBrief = {
        importedAt: Date.now(),
        itemCount: items.length,
        items,
        rawContent,
      };
      store.setBrief(imported);
      setHasParsed(true);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Parser failed unexpectedly.');
    }
  };

  const handleClear = () => {
    store.clearBrief();
    setRawContent('');
    setHasParsed(false);
    setParseError('');
  };

  const handleUseItem = (item: BriefItem) => {
    store.setSelectedBriefItem(item);
    // If the brief suggested a room, pre-select it
    if (item.suggestedRoom) {
      store.setRoom(item.suggestedRoom);
      store.setStep(2); // jump to FormatSelect (skip RoomSelect)
    } else {
      store.setStep(1); // RoomSelect
    }
  };

  // ── Initial paste state (no brief yet)
  if (!brief || !hasParsed) {
    return (
      <>
        <StepLabel>IMPORT DEEP RESEARCH BRIEF</StepLabel>

        <Card className="!mb-3 !bg-ink-el/40 !border-bronze/15">
          <div className="text-[11px] text-tx-mid leading-relaxed">
            Paste a CFO brief from <b>any Deep Research source</b> (ChatGPT,
            Claude, Perplexity). The parser extracts the items, then you
            pick which ones to post. The CFO implications become the body
            content of your posts — so each post inherits the analytical
            depth of the source brief.
          </div>
        </Card>

        <Label>PASTE BRIEF CONTENT</Label>
        <textarea
          value={rawContent}
          onChange={(e) => setRawContent(e.target.value)}
          placeholder={SAMPLE_HINT}
          rows={14}
          className="
            w-full bg-ink-card border border-ink-border rounded-card-lg
            px-3.5 py-3 text-[12px] text-tx font-mono leading-relaxed
            focus:outline-none focus:border-bronze/40 mb-2
            resize-y min-h-[260px] max-h-[460px]
          "
        />

        <div className="flex justify-between items-center text-[10px] text-tx-dim mb-3">
          <span>{rawContent.length.toLocaleString()} chars</span>
          <span>Accepts markdown tables, numbered lists, structured blocks</span>
        </div>

        {parseError && (
          <div className="bg-signal-red/10 border border-signal-red/30 rounded-card px-3.5 py-2.5 mb-3 text-[11px] text-signal-red">
            {parseError}
          </div>
        )}

        <Button
          variant="gold"
          fullWidth
          onClick={handleParse}
          disabled={rawContent.trim().length < 50}
          className="!py-3 !text-[13px]"
        >
          Parse Brief
        </Button>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => store.setStep(0)}
          className="!py-2.5 !text-[11px] !mt-2"
        >
          Back to Command Center
        </Button>
      </>
    );
  }

  // ── Parsed-items state
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <StepLabel>BRIEF PARSED &mdash; {brief.itemCount} ITEMS</StepLabel>
        <Button variant="ghost" onClick={handleClear} className="!px-2.5 !py-1 !text-[10px]">
          Clear
        </Button>
      </div>

      <Card className="!mb-3 !bg-signal-green/5 !border-signal-green/20">
        <div className="text-[11px] text-signal-green leading-relaxed">
          Parsed {brief.itemCount} item{brief.itemCount === 1 ? '' : 's'} from
          your brief. Click <b>Use for a post</b> on any item to generate a
          polished WhatsApp post using its CFO analysis as the body content.
        </div>
      </Card>

      {brief.items.map((item) => (
        <BriefItemCard key={item.id} item={item} onUse={handleUseItem} />
      ))}

      <Button
        variant="ghost"
        fullWidth
        onClick={() => store.setStep(0)}
        className="!py-2.5 !text-[11px] !mt-3"
      >
        Back to Command Center
      </Button>
    </>
  );
}

// ─── BriefItemCard ──────────────────────────────────────────────

interface BriefItemCardProps {
  item: BriefItem;
  onUse: (item: BriefItem) => void;
}

function BriefItemCard({ item, onUse }: BriefItemCardProps) {
  const pri = PRIORITY_BADGE[item.priority];
  const roomMeta: { id: RoomId; color: string; icon: string; short: string } | null =
    item.suggestedRoom
      ? (() => {
          const r = ROOMS.find(rm => rm.id === item.suggestedRoom);
          return r ? { id: r.id, color: r.color, icon: r.icon, short: r.short } : null;
        })()
      : null;

  return (
    <Card className="!mb-2.5" accentColor={roomMeta?.color}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${pri.cls}`}>
            {pri.label}
          </span>
          {roomMeta && (
            <span
              className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                color: roomMeta.color,
                background: `${roomMeta.color}18`,
                borderColor: `${roomMeta.color}40`,
              }}
            >
              {roomMeta.icon} {roomMeta.short}
            </span>
          )}
          {item.publicationTime && (
            <span className="text-[9px] text-tx-dim">{item.publicationTime}</span>
          )}
        </div>
        {item.source && (
          <span className="text-[9px] text-tx-ghost italic">{item.source}</span>
        )}
      </div>

      <div className="text-[13px] font-semibold text-tx leading-snug mb-1.5">
        {item.title}
      </div>

      {item.cfoImplication && (
        <div className="text-[11px] text-tx-mid leading-relaxed mb-2 line-clamp-4">
          {item.cfoImplication}
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[8px] text-tx-dim bg-ink-el/60 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="gold"
          onClick={() => onUse(item)}
          className="flex-1 !py-1.5 !text-[11px]"
        >
          Use for a post
        </Button>
        {item.sourceUrl && (
          <Button
            variant="ghost"
            onClick={() => window.open(item.sourceUrl, '_blank')}
            className="!px-3 !py-1.5 !text-[10px]"
          >
            Open
          </Button>
        )}
      </div>
    </Card>
  );
}
