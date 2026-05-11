import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label } from '../ui/Label';
import { useClipboard } from '../../hooks/useClipboard';
import { useRoomNewsStatus } from '../../hooks/useRoomNewsStatus';
import { NewsStatusBadge } from '../qa/NewsStatusBadge';
import { testCorsProxies, type ProxyTestResult } from '../../services/newsFetcher';
import type { HistoryItem } from '../../types';

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
  const { statuses: roomStatuses, anyFresh, isProbing, probe } = useRoomNewsStatus();

  // ── Network diagnostic state ──
  const [proxyResults, setProxyResults] = useState<ProxyTestResult[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runConnectivityTest = async () => {
    setIsTesting(true);
    setProxyResults(null);
    try {
      const results = await testCorsProxies();
      setProxyResults(results);
    } finally {
      setIsTesting(false);
    }
  };

  // Helper: clear any selected brief item before starting a fresh generation flow,
  // so the engine fetches live news instead of regenerating from the last brief.
  const startFresh = (targetStep: number) => {
    setSelectedBriefItem(null);
    setStep(targetStep);
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
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PRIMARY ENTRY POINT — Deep Research Brief Import.
          This is the most reliable workflow: no external fetches, no
          CORS issues, works in any network. Run Deep Research in
          ChatGPT/Claude/Perplexity → paste → app generates polished
          posts using the marketing-framework engine.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className="!bg-gradient-to-br !from-signal-purple/15 !to-signal-purple/5 !border-signal-purple/30 !mb-4">
        <div className="text-[10px] font-bold tracking-wider text-signal-purple mb-1.5">
          ⚡ RECOMMENDED WORKFLOW
        </div>
        <div className="text-tx text-[14px] font-semibold mb-1">
          Import Deep Research Brief
        </div>
        <div className="text-tx-mid text-[12px] leading-relaxed mb-3">
          Run your CFO research in ChatGPT, Claude, or Perplexity.
          Paste the brief here. The engine parses it, picks the right
          marketing framework per item, and produces ready-to-post
          content. Works without any external API calls.
        </div>
        <Button
          variant="purple"
          fullWidth
          onClick={() => setStep(11)}
          className="!py-3 !text-[13px]"
        >
          📋 Open Brief Importer →
        </Button>
      </Card>

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

      {/* ── EMPTY-FEED ALERT — when all rooms are dry, point to Deep Research path
                                 PLUS expose a connectivity test so the user can see
                                 which CORS proxies are actually reachable from their
                                 network. ── */}
      {!isProbing && !anyFresh && (
        <Card className="!bg-signal-amber/10 !border-signal-amber/30 !mb-3">
          <div className="text-[10px] font-bold tracking-wider text-signal-amber mb-1">
            ⚠️ LIVE FEEDS DRY
          </div>
          <div className="text-tx-mid text-[12px] leading-relaxed mb-2.5">
            Either GDELT has no fresh UAE-relevant content right now, or your
            network is blocking the CORS proxies needed to reach it. Run the
            connectivity test to find out which.
          </div>

          <div className="flex gap-2 mb-2.5">
            <Button
              variant="purple"
              onClick={() => setStep(11)}
              className="flex-1 !py-2.5 !text-[12px]"
            >
              📋 Import Deep Research →
            </Button>
            <Button
              variant="ghost"
              onClick={runConnectivityTest}
              disabled={isTesting}
              className="flex-1 !py-2.5 !text-[12px]"
            >
              {isTesting ? 'Testing...' : '🔬 Test Network'}
            </Button>
          </div>

          {/* Diagnostic results — shown after the test runs */}
          {proxyResults && (
            <div className="bg-ink-card border border-ink-border rounded-card-lg p-3 text-[11px]">
              <div className="text-tx-dim font-bold mb-1.5 text-[10px] tracking-wider">
                NETWORK DIAGNOSTIC RESULTS
              </div>
              <div className="space-y-1">
                {proxyResults.map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-tx-mid">{r.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-tx-ghost text-[10px]">{r.latencyMs}ms</span>
                      <span className={`
                        text-[9px] font-bold px-1.5 py-0.5 rounded
                        ${r.ok
                          ? 'bg-signal-green/15 text-signal-green'
                          : 'bg-signal-red/15 text-signal-red'
                        }
                      `}>
                        {r.ok ? 'OK' : typeof r.status === 'string' ? r.status.toUpperCase() : `HTTP ${r.status}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-tx-dim text-[10px] mt-2 leading-relaxed">
                {proxyResults.some(r => r.ok)
                  ? '✓ At least one proxy works. Try Pull Fresh News again — the engine will route through the working proxy.'
                  : '✗ All proxies blocked from your network. Use Import Deep Research instead — that path needs no external fetches.'
                }
              </div>
            </div>
          )}
        </Card>
      )}

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

      {/* Create actions */}
      <Label>CREATE</Label>

      {/* IMPORT DEEP RESEARCH BRIEF — middleman flow:
          paste any external brief, parse, generate polished posts from it. */}
      <Button
        variant="purple"
        fullWidth
        onClick={() => setStep(11)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-2.5"
      >
        Import Deep Research Brief →
      </Button>

      <Button
        variant="gold"
        fullWidth
        onClick={() => startFresh(10)}
        className="!py-4 !text-[14px] !rounded-card-lg !mb-2.5"
      >
        Generate Intelligence Post
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => startFresh(5)}
        className="!py-3 !text-[13px] !rounded-card-lg !mb-2.5"
      >
        Custom Topic Post
      </Button>
      <Button
        variant="purple"
        fullWidth
        onClick={() => startFresh(6)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-6"
      >
        AI Deep Dive (Research Mode)
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

      {/* Rooms overview with fresh-news indicators + manual fetch trigger */}
      <div className="flex items-center justify-between">
        <Label>INTELLIGENCE ROOMS</Label>
        <Button
          variant="ghost"
          onClick={probe}
          disabled={isProbing}
          className="!px-2.5 !py-1 !text-[10px] !mb-1"
        >
          {isProbing ? 'Fetching...' : '🔄 Pull Fresh News'}
        </Button>
      </div>
      <div className="flex items-center justify-end mb-2">
        <span className="text-[9px] text-tx-dim">
          {isProbing
            ? 'Checking...'
            : anyFresh
              ? 'Fresh signals available'
              : 'No fresh signals · 24h cutoff'}
        </span>
      </div>
      {ROOMS.map((rm) => {
        const st = roomStatuses[rm.id];
        // Only show the status badge if a probe has actually run
        // (checkedAt > 0). Otherwise the home page stays clean and silent.
        const hasProbed = st && st.checkedAt > 0;
        return (
          <Card key={rm.id} accentColor={rm.color} className="!mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <div className="text-[14px] font-semibold" style={{ color: rm.color }}>
                {rm.icon} {rm.label}
              </div>
              {hasProbed && <NewsStatusBadge status={st.status} count={st.count} />}
            </div>
            <div className="text-tx text-[12px] font-medium mb-0.5 italic">
              "{rm.cfoQuestion}"
            </div>
            <div className="text-tx-dim text-[11px] leading-snug mb-1">{rm.description}</div>
            <div className="text-bronze text-[10px]">MICS: {rm.micsServices}</div>
          </Card>
        );
      })}

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
