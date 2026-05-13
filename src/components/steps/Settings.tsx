/**
 * Settings — Step 16
 *
 * Hosts the "Connect Claude.ai" bookmarklet integration and any future
 * integration setup (Slack webhook, Notion sync, etc.). Kept off the
 * Command Center home screen so the primary CTAs stay uncluttered.
 *
 * The bookmarklet itself lives in src/integrations/claudeBookmarklet.ts
 * and is generated at render time so it always picks up the current
 * deploy origin.
 */
import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildBookmarkletHref, importUrlBase } from '../../integrations/claudeBookmarklet';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, StepLabel } from '../ui/Label';

export function Settings() {
  const store = useAppStore();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);

  const targetOrigin = useMemo(() => importUrlBase(), []);
  const bookmarkletHref = useMemo(() => buildBookmarkletHref(targetOrigin), [targetOrigin]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard write fails silently — user can drag the link instead */
    }
  };

  return (
    <>
      <StepLabel>SETTINGS &amp; INTEGRATIONS</StepLabel>

      <Button
        variant="ghost"
        onClick={() => store.setStep(0)}
        className="!py-2 !text-[11px] !mb-4"
      >
        ← Back to Command Center
      </Button>

      {/* ━━━ CLAUDE.AI BOOKMARKLET ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="!bg-gradient-to-br !from-bronze/10 !to-ink-card !border-bronze/30 !mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label color="#C4953E">📌 CONNECT CLAUDE.AI</Label>
          <span className="text-[9px] tracking-wider px-1.5 py-0.5 rounded-full bg-signal-green/10 border border-signal-green/30 text-signal-green font-bold">
            BOOKMARKLET
          </span>
        </div>

        <div className="text-tx text-[13px] font-semibold mb-1.5">
          One-click import from any Claude.ai chat
        </div>
        <div className="text-tx-mid text-[11px] leading-relaxed mb-3">
          Drag the gold button below to your browser&rsquo;s bookmarks bar.
          Then on any Claude.ai chat, click the bookmark and the
          last response lands directly in this app &mdash; no copy, no paste.
        </div>

        {/* The draggable bookmarklet link itself */}
        <div className="flex items-center gap-2 p-3 bg-ink-el rounded-card border border-bronze/20 mb-3">
          <a
            ref={linkRef}
            href={bookmarkletHref}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-br from-bronze to-bronze-light text-ink rounded-card font-bold text-[12px] tracking-wide cursor-grab active:cursor-grabbing select-none shadow-md hover:brightness-110 transition-all"
            title="Drag this to your bookmarks bar"
          >
            📌 Send to MICS
          </a>
          <div className="text-[10px] text-tx-dim flex-1 leading-tight">
            <span className="text-bronze font-semibold">↑ Drag this</span> to your bookmarks bar
          </div>
        </div>

        {/* Fallback: copy raw href for users who prefer adding a bookmark manually */}
        <button
          onClick={handleCopy}
          className="w-full text-[10px] text-tx-dim hover:text-tx-mid underline underline-offset-2 transition-all"
        >
          {copied ? '✓ Copied to clipboard' : 'Can’t drag? Click here to copy the bookmark URL'}
        </button>
      </Card>

      {/* ━━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="!mb-4">
        <Label>HOW IT WORKS</Label>
        <ol className="text-[12px] text-tx-mid leading-relaxed space-y-2 ml-4 list-decimal">
          <li>
            <span className="text-tx font-semibold">Drag</span> the gold
            &ldquo;Send to MICS&rdquo; button above into your browser&rsquo;s
            bookmarks bar.
          </li>
          <li>
            Open <span className="text-tx font-mono text-[11px]">claude.ai</span>{' '}
            and have Claude reply to your prompt as usual (or run the
            One-Click AI Brief flow from the home screen).
          </li>
          <li>
            When Claude finishes, click the <span className="text-bronze">📌 Send to MICS</span>{' '}
            bookmark.
          </li>
          <li>
            A new tab opens with the response auto-imported, auto-parsed,
            and routed straight to the post preview &mdash; QA badge included.
          </li>
        </ol>
      </Card>

      {/* ━━━ COMPATIBILITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="!bg-ink-el/40 !border-ink-border">
        <Label color="#6A6478">COMPATIBILITY</Label>
        <ul className="text-[11px] text-tx-dim leading-relaxed space-y-1">
          <li>
            <span className="text-tx-mid">✓ Chrome, Edge, Firefox 113+, Brave</span> &mdash; full gzip compression
          </li>
          <li>
            <span className="text-tx-mid">✓ Safari 16.4+</span> &mdash; falls back to uncompressed transport
          </li>
          <li>
            <span className="text-tx-dim">!</span> If a Claude response is larger than ~25 KB,
            the bookmarklet shows an alert and you should use manual paste instead.
          </li>
        </ul>
      </Card>

      {/* ━━━ DEBUG INFO (collapsed by default-ish) ━━━━━━━━━━━━━━━ */}
      <div className="mt-6 text-[9px] text-tx-dim font-mono">
        <div>Target origin: {targetOrigin}</div>
        <div className="mt-0.5">Bookmarklet length: {bookmarkletHref.length} chars</div>
      </div>
    </>
  );
}
