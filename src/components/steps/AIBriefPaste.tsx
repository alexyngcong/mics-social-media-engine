/**
 * AIBriefPaste — Step 12
 *
 * The "Paste AI Response" landing screen, used after the user has run
 * the One-Click AI Brief workflow:
 *   1. User clicked "🤖 Generate AI Brief" on an Intelligence Feed item
 *   2. Prompt was auto-copied to clipboard, claude.ai opened
 *   3. User pasted, got Claude's 17-section response, copied it
 *   4. Returns here → pastes Claude's response → app parses
 *   5. Generates a polished WhatsApp post with banner + per-platform variants
 *
 * The parser recognises Claude's heading-based output (`## WHATSAPP UPDATE`,
 * `## LINKEDIN POST`, etc.) and extracts the 17 fields defined in AIBrief.
 */

import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { parseAIBriefResponse, getBriefCompleteness } from '../../services/aiResponseParser';
import { autoFixPost, validatePost } from '../../services/qaValidator';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, StepLabel } from '../ui/Label';
import { TEMPLATE_COUNT } from '../banner/templates';
import { ROOMS } from '../../config/rooms';
import type { AIBrief, GeneratedPost, RoomId } from '../../types';

const PASTE_HINT = `Paste the FULL Claude response here.

Should contain sections like:
## EXECUTIVE SUMMARY
## WHATSAPP UPDATE
## LINKEDIN POST
... and 14 others

You don't need to clean it up — the parser handles
extra formatting, blank lines, and minor variations.`;

export function AIBriefPaste() {
  const store = useAppStore();
  const item = store.pendingIntelligenceItem;

  const [raw, setRaw] = useState('');
  const [parseError, setParseError] = useState('');
  const [previewBrief, setPreviewBrief] = useState<AIBrief | null>(null);

  if (!item) {
    return (
      <>
        <StepLabel>PASTE AI BRIEF</StepLabel>
        <Card className="!bg-signal-amber/5 !border-signal-amber/30">
          <div className="text-[12px] text-tx-mid">
            No intelligence item selected. Go back to the home screen and
            click "🤖 Generate AI Brief" on an article first, then return
            here to paste Claude's response.
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => store.setStep(0)}
            className="!mt-2 !py-2 !text-[11px]"
          >
            ← Back to Command Center
          </Button>
        </Card>
      </>
    );
  }

  const handleParse = () => {
    setParseError('');
    setPreviewBrief(null);
    if (!raw.trim() || raw.trim().length < 100) {
      setParseError('Paste a longer response — under 100 characters cannot carry 17 sections.');
      return;
    }
    const brief = parseAIBriefResponse(raw);
    const { found, total } = getBriefCompleteness(brief);

    if (found === 0) {
      setParseError(
        'No sections recognised. Make sure you pasted Claude\'s full response. ' +
        'The parser looks for `## SECTION` headings, `**SECTION**`, or ALL-CAPS lines.'
      );
      return;
    }
    if (!brief.whatsappUpdate && !brief.linkedinPost && !brief.executiveSummary) {
      setParseError(
        `Parsed ${found}/${total} sections but none of the core post fields (WhatsApp / LinkedIn / Executive Summary) ` +
        'were found. The response may be missing those sections — try regenerating in Claude.'
      );
      return;
    }
    setPreviewBrief(brief);
  };

  const handleUseAsPost = (platformFormat: 'whatsapp' | 'linkedin' | 'newsletter') => {
    if (!previewBrief || !item) return;

    // Build a GeneratedPost from the brief + intelligence item context
    const text =
      platformFormat === 'whatsapp' ? (previewBrief.whatsappUpdate || '') :
      platformFormat === 'linkedin' ? (previewBrief.linkedinPost || '') :
      platformFormat === 'newsletter' ? (previewBrief.newsletterSummary || '') :
      '';

    if (!text) {
      setParseError(`No ${platformFormat} content found in the parsed brief.`);
      return;
    }

    // Stat extraction — look for a money/percent token in the text or item title
    const statMatch = text.match(/(AED|USD|\$|€|£)\s*\d[\d,.]*(B|M|T|\s*(billion|million|trillion))?|\d[\d,.]*%/i);
    const stat = statMatch ? statMatch[0].trim() : '';

    // Build headline (4-5 words ALL CAPS from item title)
    const headlineWords = item.title
      .replace(/[''""]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !/^(the|and|for|but|with|from|into|that|this|has|have|been|was|were|are|its|a|an|or|in|on|at|to|by|of|as|is)$/i.test(w));
    const headline = headlineWords.slice(0, 5).join(' ').toUpperCase();

    const post: GeneratedPost = {
      text,
      headline,
      subline: `${item.date}${stat ? ' | ' + stat : ''}`,
      stat,
      statLabel: headline.split(/\s+/).slice(0, 3).join(' '),
      statDirection: 'neutral',
      source: item.source,
      sourceUrl: item.url,
      hashtags: previewBrief.hashtags || [],
      articleHoursAgo: item.hoursAgo,
      generatedAtMs: Date.now(),
    };

    // Auto-fix + QA validate
    const { fixed } = autoFixPost(post);
    const qa = validatePost(fixed, {
      platform: platformFormat === 'whatsapp' ? 'whatsapp' : 'linkedin',
      articleHoursAgo: item.hoursAgo,
    });

    // Map item.topic to a room so banner colour is correct
    const room: RoomId =
      item.topic && /tax|regulatory|geopolitical|supply|emerging/i.test(item.topic) ? 'risk' :
      item.topic && /finance|banking|ipo|family|workforce|market/i.test(item.topic) ? 'capital' :
      item.topic && /ai|digital|oil|global/i.test(item.topic) ? 'world' :
      'growth';

    store.setRoom(room);
    store.setPlatform(platformFormat === 'whatsapp' ? 'whatsapp' : 'linkedin');
    store.setResult(fixed);
    store.setQAReport(qa);
    store.shuffleVariant(TEMPLATE_COUNT);
    store.setBannerReady(false);
    store.setStep(4); // Existing ResultView handles banner + preview + copy/save
  };

  // ─── Initial paste view ───────────────────────────────────────
  if (!previewBrief) {
    const room = ROOMS.find(r => /tax|regulatory|geopolitical|supply|emerging/i.test(item.topic || '') ? r.id === 'risk' :
      /finance|banking|ipo|family|workforce|market/i.test(item.topic || '') ? r.id === 'capital' :
      /ai|digital|oil|global/i.test(item.topic || '') ? r.id === 'world' :
      r.id === 'growth');

    return (
      <>
        <StepLabel>PASTE AI BRIEF RESPONSE</StepLabel>

        {/* Article context card */}
        <Card className="!mb-3" accentColor={room?.color}>
          <div className="text-[9px] font-bold text-tx-ghost tracking-wider mb-1">
            ARTICLE
          </div>
          <div className="text-[13px] font-semibold text-tx mb-1">{item.title}</div>
          <div className="flex gap-2 text-[10px] text-tx-dim">
            <span>{item.source}</span>
            <span>·</span>
            <span>{item.hoursAgo}h ago</span>
            <span>·</span>
            <span style={{ color: room?.color }}>{item.topic}</span>
            <span>·</span>
            <span>Score {item.score}</span>
          </div>
        </Card>

        <Card className="!mb-3 !bg-ink-el/40">
          <div className="text-[11px] text-tx-mid leading-relaxed">
            Switch back to your <b>claude.ai</b> tab. Copy Claude's complete response
            (use Ctrl+A → Ctrl+C in the response area), then paste it below.
            The parser extracts all 17 sections automatically.
          </div>
        </Card>

        <Label>PASTE CLAUDE RESPONSE</Label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={PASTE_HINT}
          rows={14}
          className="
            w-full bg-ink-card border border-ink-border rounded-card-lg
            px-3.5 py-3 text-[12px] text-tx font-mono leading-relaxed
            focus:outline-none focus:border-bronze/40 mb-2
            resize-y min-h-[260px] max-h-[460px]
          "
        />

        <div className="flex justify-between items-center text-[10px] text-tx-dim mb-3">
          <span>{raw.length.toLocaleString()} chars</span>
          <span>Recognises `## SECTION` headings + variants</span>
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
          disabled={raw.trim().length < 100}
          className="!py-3 !text-[13px]"
        >
          Parse AI Brief
        </Button>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => store.setStep(0)}
          className="!py-2.5 !text-[11px] !mt-2"
        >
          ← Back to Command Center
        </Button>
      </>
    );
  }

  // ─── Preview view — show parsed sections + choose platform ───
  const { found, total } = getBriefCompleteness(previewBrief);

  return (
    <>
      <StepLabel>AI BRIEF PARSED — {found}/{total} SECTIONS</StepLabel>

      <Card className="!mb-3 !bg-signal-green/5 !border-signal-green/30">
        <div className="text-[11px] text-signal-green leading-relaxed">
          Parsed {found} of {total} sections from Claude's response. Pick a
          platform below to generate the post with banner + QA validation.
        </div>
      </Card>

      {/* Per-platform launch buttons */}
      <Label>GENERATE POST FOR</Label>

      {previewBrief.whatsappUpdate && (
        <Card className="!mb-2 !bg-[#005C4B]/10 !border-[#25D366]/30">
          <div className="text-[10px] font-bold tracking-wider text-[#25D366] mb-1">
            📱 WHATSAPP COMMUNITY UPDATE
          </div>
          <div className="text-[11px] text-tx-mid leading-relaxed mb-2 line-clamp-4 whitespace-pre-line">
            {previewBrief.whatsappUpdate.slice(0, 360)}{previewBrief.whatsappUpdate.length > 360 ? '…' : ''}
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={() => handleUseAsPost('whatsapp')}
            className="!py-2 !text-[12px]"
          >
            Generate WhatsApp Post →
          </Button>
        </Card>
      )}

      {previewBrief.linkedinPost && (
        <Card className="!mb-2 !bg-signal-blue/5 !border-signal-blue/25">
          <div className="text-[10px] font-bold tracking-wider text-signal-blue mb-1">
            💼 LINKEDIN POST
          </div>
          <div className="text-[11px] text-tx-mid leading-relaxed mb-2 line-clamp-4 whitespace-pre-line">
            {previewBrief.linkedinPost.slice(0, 360)}{previewBrief.linkedinPost.length > 360 ? '…' : ''}
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => handleUseAsPost('linkedin')}
            className="!py-2 !text-[12px]"
          >
            Generate LinkedIn Post →
          </Button>
        </Card>
      )}

      {previewBrief.newsletterSummary && (
        <Card className="!mb-2 !bg-bronze/5 !border-bronze/25">
          <div className="text-[10px] font-bold tracking-wider text-bronze mb-1">
            📰 NEWSLETTER SECTION
          </div>
          <div className="text-[11px] text-tx-mid leading-relaxed mb-2 line-clamp-4 whitespace-pre-line">
            {previewBrief.newsletterSummary.slice(0, 360)}{previewBrief.newsletterSummary.length > 360 ? '…' : ''}
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => handleUseAsPost('newsletter')}
            className="!py-2 !text-[12px]"
          >
            Generate Newsletter Section →
          </Button>
        </Card>
      )}

      {/* Read-only preview of the other parsed sections */}
      <Label>OTHER PARSED OUTPUTS</Label>
      <ParsedField label="Executive Summary" value={previewBrief.executiveSummary} />
      <ParsedField label="Why It Matters" value={previewBrief.whyItMatters} />
      <ParsedField label="CFO Angle" value={previewBrief.cfoAngle} />
      <ParsedField label="Founder Angle" value={previewBrief.founderAngle} />
      <ParsedField label="Investor Angle" value={previewBrief.investorAngle} />
      <ParsedField label="Risk & Opportunity" value={previewBrief.riskOpportunity} />
      <ParsedField label="Content Hook" value={previewBrief.contentHook} />
      <ParsedField label="Visual Idea" value={previewBrief.visualIdea} />
      <ParsedField label="CTA" value={previewBrief.cta} />
      <ParsedField label="Advisory Angle" value={previewBrief.advisoryAngle} />
      <ParsedField label="Hashtags" value={previewBrief.hashtags?.join(' ')} />
      <ParsedField label="Viral Headlines" value={previewBrief.viralHeadlines?.join(' / ')} />
      <ParsedField label="Carousel Outline" value={previewBrief.carouselOutline} />
      <ParsedField label="Poll Idea" value={previewBrief.pollIdea} />

      <Button
        variant="ghost"
        fullWidth
        onClick={() => { setPreviewBrief(null); setRaw(''); }}
        className="!py-2.5 !text-[11px] !mt-3"
      >
        ← Paste a different response
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

// ─── Helper component ──────────────────────────────────────────

function ParsedField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Card className="!mb-2">
      <div className="text-[9px] font-bold text-tx-ghost tracking-wider mb-1">
        {label.toUpperCase()}
      </div>
      <div className="text-[11px] text-tx-mid leading-relaxed whitespace-pre-line">
        {value.length > 300 ? value.slice(0, 297) + '…' : value}
      </div>
    </Card>
  );
}
