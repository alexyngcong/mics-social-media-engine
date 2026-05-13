import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label } from '../ui/Label';
import { useClipboard } from '../../hooks/useClipboard';
import { IntelligenceFeed } from '../intelligence/IntelligenceFeed';
import type { HistoryItem, IntelligenceItem } from '../../types';

interface CommandCenterProps {
  history: HistoryItem[];
}

/** Get today's recommended post type. Post any day, any time — no weekly limit. */
function getTodayRecommendation(): { type: string; icon: string; label: string; note: string } {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ...
  switch (day) {
    case 0: return { type: 'exclusive', icon: '🔒', label: 'Week Ahead Signal', note: 'Sunday — set the tone for the week' };
    case 1: return { type: 'observation', icon: '🔍', label: 'Monday Intelligence', note: 'Start the week with a data-led read' };
    case 2: return { type: 'observation', icon: '🔍', label: 'Intelligence Drop', note: 'Tuesday — fresh signal worth landing' };
    case 3: return { type: 'pulse', icon: '🎯', label: 'Midweek Pulse', note: 'Wednesday — short, sharp micro-insight' };
    case 4: return { type: 'observation', icon: '📊', label: 'Sector Read', note: 'Thursday — deeper read on the week\'s flow' };
    case 5: return { type: 'pulse', icon: '🎯', label: 'Closing Signal', note: 'Friday — frame the weekend conversation' };
    case 6: return { type: 'voicenote', icon: '💬', label: 'Insider Note', note: 'Saturday — personal note to the circle' };
    default: return { type: 'observation', icon: '🔍', label: 'Intelligence Drop', note: 'Post when the signal warrants it' };
  }
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function CommandCenter({ history }: CommandCenterProps) {
  const { setStep, copiedLabel, setSelectedBriefItem } = useAppStore();
  const { copy } = useClipboard();
  const today = getTodayRecommendation();
  const dayName = dayNames[new Date().getDay()];
  // Helper: clear any selected brief item before starting a fresh generation flow,
  // so the engine fetches live news instead of regenerating from the last brief.
  const startFresh = (targetStep: number) => {
    setSelectedBriefItem(null);
    setStep(targetStep);
  };

  // When the user clicks "Paste AI Response" on an intelligence item,
  // we store the item context and route to step 12 (AIBriefPaste).
  // That view parses Claude's heading-based 17-section output and
  // generates platform-specific posts using the item's metadata.
  const handlePasteAIResponse = (item: IntelligenceItem) => {
    useAppStore.getState().setPendingIntelligenceItem(item);
    setStep(12);
  };

  // Count posts this week (from history)
  // Use h.id (Date.now() in ms) for reliable timestamp — h.timestamp is a
  // display-formatted string ("15 Apr 2026") that doesn't parse consistently.
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();
  const thisWeekPosts = history.filter(h => {
    if (typeof h.id !== 'number' || !isFinite(h.id)) return false;
    return h.id >= weekStartMs;
  }).length;

  return (
    <>
      {/* ━━━ WEEKLY POSTING KIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          In-app view (step 13). Reads kit-latest.json same-origin and
          renders the 7 posts + banners inside the React app. No external
          tab, no separate page that runs on its own — fully integrated.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="!bg-gradient-to-br !from-bronze/15 !to-ink-card !border-bronze/30 !mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold tracking-wider text-bronze">
            📦 WEEKLY POSTING KIT
          </div>
          <span className="text-[9px] tracking-wider px-1.5 py-0.5 rounded-full bg-signal-green/10 border border-signal-green/30 text-signal-green font-bold">
            AUTO-REFRESHED
          </span>
        </div>
        <div className="text-tx text-[13px] font-semibold mb-1">
          7 ready-to-post signals + matching banners
        </div>
        <div className="text-tx-mid text-[11px] leading-relaxed mb-2.5">
          Updates every Sunday and after each fresh news pull. Posts + banners
          open inside this app — no separate page.
        </div>
        <Button
          variant="gold"
          fullWidth
          onClick={() => setStep(13)}
          className="!py-3 !text-[13px]"
        >
          Open Weekly Kit →
        </Button>
      </Card>

      {/* Banner Editor — in-app graphics editor for custom banner design.
          3 templates (Editorial Night / Newspaper White / Dark Premium),
          editable text + photo, PNG export. Modelled on the Claude-
          generated banners the user approved. */}
      <Card className="!bg-gradient-to-br !from-signal-purple/10 !to-ink-card !border-signal-purple/30 !mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold tracking-wider text-signal-purple">
            🎨 BANNER EDITOR
          </div>
          <span className="text-[9px] tracking-wider px-1.5 py-0.5 rounded-full bg-bronze/10 border border-bronze/30 text-bronze font-bold">
            3 TEMPLATES
          </span>
        </div>
        <div className="text-tx text-[13px] font-semibold mb-1">
          Design any banner with photo + custom text
        </div>
        <div className="text-tx-mid text-[11px] leading-relaxed mb-2.5">
          Pick a template, swap the photo, edit every text field. Exports
          as 1080 × 1080 PNG ready for WhatsApp / LinkedIn / Instagram.
        </div>
        <Button
          variant="purple"
          fullWidth
          onClick={() => setStep(14)}
          className="!py-2.5 !text-[12px]"
        >
          Open Banner Editor →
        </Button>
      </Card>

      {/* Generate by Service — service-led post generation. Opens the
          ServicePicker (step 15) where the user picks any combination of
          the 42 canonical MICS services. Topic + room + advisory anchor
          are synthesized from the selection. Two fast paths: pick freely
          ("Customize") or one-click the full Operational Compliance pillar
          ("All Compliance"). */}
      <Card className="!bg-gradient-to-br !from-signal-red/10 !to-ink-card !border-signal-red/30 !mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold tracking-wider text-signal-red">
            🎯 GENERATE BY SERVICE
          </div>
          <span className="text-[9px] tracking-wider px-1.5 py-0.5 rounded-full bg-bronze/10 border border-bronze/30 text-bronze font-bold">
            42 SERVICES
          </span>
        </div>
        <div className="text-tx text-[13px] font-semibold mb-1">
          Pick the services. We&rsquo;ll build the post.
        </div>
        <div className="text-tx-mid text-[11px] leading-relaxed mb-2.5">
          Choose one or many services from the MICS catalog &mdash; the engine fetches
          relevant live news, routes to the right room, and anchors the post
          on the strongest matching track record.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              useAppStore.getState().setPendingServicePreset(null);
              startFresh(15);
            }}
            className="!py-2.5 !text-[12px] !border-bronze/40 !text-bronze hover:!bg-bronze/10"
          >
            🎯 Customize →
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              useAppStore.getState().setPendingServicePreset('compliance');
              startFresh(15);
            }}
            className="!py-2.5 !text-[12px]"
          >
            🛡️ All Compliance →
          </Button>
        </div>
      </Card>

      {/* ━━━ PRIMARY VIEW — INTELLIGENCE FEED ━━━━━━━━━━━━━━━━━━━━
          Live items from the GitHub Actions news pipeline.
          Each card has a One-Click AI Brief button:
            1. Builds complete Claude prompt with 17 outputs
            2. Auto-copies to clipboard + opens claude.ai
            3. User pastes, gets response, copies it back
            4. App parses 17 outputs into ready-to-post content
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <IntelligenceFeed onPasteResponse={handlePasteAIResponse} />

      {/* Strategy card */}
      <Card className="!bg-gradient-to-br !from-ink-card !to-ink-el !border-bronze/15 !mb-3">
        <div className="text-[10px] font-bold tracking-wider text-bronze mb-2">THE PLAY</div>
        <div className="text-tx-mid text-[13px] leading-relaxed">
          Every post is a <span className="text-tx font-semibold">trust deposit</span>.
          Every closing line creates hunger:{' '}
          <span className="text-bronze italic">
            "I need to talk to someone who understands this."
          </span>{' '}
          You never sell. You make them come to you.
        </div>
      </Card>

      {/* Today's recommendation */}
      <Card className="!bg-gradient-to-br !from-[#005C4B]/10 !to-ink-card !border-[#25D366]/20 !mb-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-[#25D366] mb-1">
              TODAY — {dayName.toUpperCase()}
            </div>
            <div className="text-tx text-[14px] font-semibold">
              {today.icon} {today.label}
            </div>
            <div className="text-tx-dim text-[11px] mt-0.5">{today.note}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-tx-dim">This week</div>
            <div className="text-[18px] font-bold text-tx">
              {thisWeekPosts}
            </div>
            <div className="text-[8px] text-tx-dim">{thisWeekPosts === 1 ? 'post' : 'posts'}</div>
          </div>
        </div>
      </Card>

      {/* Legacy LIVE FEEDS DRY / Test Network card removed. The static
          intelligence-feed.json from GitHub Actions makes the browser-side
          CORS proxy chain irrelevant; the IntelligenceFeed component above
          handles its own empty state. */}

      {/* Calendar */}
      <Label>CALENDAR</Label>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => setStep(9)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-6 !border-bronze/30 !text-bronze hover:!bg-bronze/10"
      >
        Content Calendar
      </Button>

      {/* Create actions — only the "paste a brief" path remains. The legacy
          "Generate Intelligence Post / Custom Topic / AI Deep Dive" buttons
          were removed: they relied on a browser-side CORS-proxy news fetch
          that no longer functions in the deployed network environment, and
          their template-based output has been superseded by the AI Brief
          flow at the top of the screen (per-signal claude.ai handoff) plus
          the auto-refreshed Daily Posting Kit. */}
      <Label>IMPORT EXTERNAL BRIEF</Label>
      <Button
        variant="purple"
        fullWidth
        onClick={() => startFresh(11)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-6"
      >
        Paste CFO Brief from ChatGPT / Perplexity →
      </Button>

      {/* Weekly Rhythm Guide — post any day, suggested angles only */}
      <Label>SUGGESTED ANGLES BY DAY</Label>
      <Card className="!mb-6 !p-0 overflow-hidden">
        <div className="divide-y divide-ink-border">
          {[
            { day: 'Sun', type: '🔒 Week Ahead Signal — set the tone', active: new Date().getDay() === 0 },
            { day: 'Mon', type: '🔍 Monday Intelligence — data-led read', active: new Date().getDay() === 1 },
            { day: 'Tue', type: '🔍 Intelligence Drop — fresh signal', active: new Date().getDay() === 2 },
            { day: 'Wed', type: '🎯 Midweek Pulse — short, sharp', active: new Date().getDay() === 3 },
            { day: 'Thu', type: '📊 Sector Read — deeper analysis', active: new Date().getDay() === 4 },
            { day: 'Fri', type: '🎯 Closing Signal — frame the weekend', active: new Date().getDay() === 5 },
            { day: 'Sat', type: '💬 Insider Note — personal aside', active: new Date().getDay() === 6 },
          ].map((row) => (
            <div
              key={row.day}
              className={`flex items-center justify-between px-3.5 py-2.5 ${
                row.active ? 'bg-bronze/5' : ''
              }`}
            >
              <span className={`text-[11px] font-semibold w-[60px] ${row.active ? 'text-bronze' : 'text-tx-dim'}`}>
                {row.day}
              </span>
              <span className={`text-[12px] flex-1 ${row.active ? 'text-tx font-medium' : 'text-tx-mid'}`}>
                {row.type}
              </span>
              {row.active && (
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-bronze/15 text-bronze font-bold">
                  TODAY
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Platform overview */}
      <Label>PLATFORMS</Label>
      <div className="flex gap-2 flex-wrap mb-6">
        {PLATFORMS.map((plat) => (
          <div
            key={plat.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ink-border text-[11px] text-tx-mid"
          >
            <span>{plat.icon}</span>
            <span>{plat.name}</span>
          </div>
        ))}
      </div>

      {/* Rooms overview — descriptive reference. The live intelligence
          per room is rendered by the IntelligenceFeed component at the
          top of the page. This section is just a "what each room covers"
          legend for the user. */}
      <Label>INTELLIGENCE ROOMS</Label>
      {ROOMS.map((rm) => (
        <Card key={rm.id} accentColor={rm.color} className="!mb-2">
          <div className="text-[14px] font-semibold mb-0.5" style={{ color: rm.color }}>
            {rm.icon} {rm.label}
          </div>
          <div className="text-tx text-[12px] font-medium mb-0.5 italic">
            "{rm.cfoQuestion}"
          </div>
          <div className="text-tx-dim text-[11px] leading-snug mb-1">{rm.description}</div>
          <div className="text-bronze text-[10px]">MICS: {rm.micsServices}</div>
        </Card>
      ))}

      {/* Posting guidance — no cap */}
      <Card className="!mt-4 !bg-ink-el/50 !border-ink-border">
        <div className="text-[10px] font-bold tracking-wider text-tx-dim mb-1">POSTING GUIDANCE</div>
        <div className="text-tx-dim text-[11px] leading-relaxed">
          Post <span className="text-tx font-semibold">whenever the signal warrants it</span>.
          The day-by-day suggestions above are angles to help shape the post.
          Quality of the signal matters more than cadence.
        </div>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-ink-border">
          <Label>RECENT POSTS</Label>
          {history.slice(0, 8).map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-card bg-ink-card border border-ink-border mb-1.5"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-[11px] font-semibold truncate text-tx">
                  {h.headline || h.text?.slice(0, 50)}
                </div>
                <div className="text-[9px] text-tx-dim mt-0.5">
                  {h.room} | {h.type} | {h.platform} | {h.timestamp}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => copy(h.text || '', `h${h.id}`)}
                className="!px-2.5 !py-1 !text-[9px] flex-shrink-0"
              >
                {copiedLabel === `h${h.id}` ? 'Done' : 'Copy'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
