import { useAppStore } from '../../store/appStore';
import { ROOMS } from '../../config/rooms';
import { PLATFORMS } from '../../config/platforms';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label } from '../ui/Label';
import { useClipboard } from '../../hooks/useClipboard';
import type { HistoryItem } from '../../types';

interface CommandCenterProps {
  history: HistoryItem[];
}

/** Get today's recommended post type based on optimized 3/week rhythm */
function getTodayRecommendation(): { type: string; icon: string; label: string; note: string } {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ...
  switch (day) {
    case 0: return { type: 'exclusive', icon: '🔒', label: 'Week Ahead Signal', note: 'Sunday evening — set the tone for the week' };
    case 2: return { type: 'observation', icon: '🔍', label: 'Intelligence Drop', note: 'Tuesday morning — data-driven signal' };
    case 4: return { type: 'pulse', icon: '🎯', label: 'Closing Signal', note: 'Thursday afternoon — create weekend DMs' };
    default: return { type: 'generic', icon: '🤫', label: 'Strategic Silence', note: 'Silence builds exclusivity. No post today.' };
  }
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function CommandCenter({ history }: CommandCenterProps) {
  const { setStep, copiedLabel } = useAppStore();
  const { copy } = useClipboard();
  const today = getTodayRecommendation();
  const dayName = dayNames[new Date().getDay()];

  // Count posts this week (from history)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const thisWeekPosts = history.filter(h => {
    try {
      const d = new Date(h.timestamp);
      return d >= weekStart;
    } catch { return false; }
  }).length;
  const maxPostsPerWeek = 3;

  return (
    <>
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
            <div className={`text-[18px] font-bold ${thisWeekPosts >= maxPostsPerWeek ? 'text-signal-red' : thisWeekPosts >= 2 ? 'text-bronze' : 'text-tx'}`}>
              {thisWeekPosts}/{maxPostsPerWeek}
            </div>
            <div className="text-[8px] text-tx-dim">posts max</div>
          </div>
        </div>
        {thisWeekPosts >= maxPostsPerWeek && (
          <div className="mt-2 pt-2 border-t border-signal-red/20 text-signal-red text-[11px]">
            Weekly limit reached. Silence reinforces exclusivity.
          </div>
        )}
      </Card>

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
      <Button
        variant="gold"
        fullWidth
        onClick={() => setStep(10)}
        className="!py-4 !text-[14px] !rounded-card-lg !mb-2.5"
      >
        Generate Intelligence Post
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => setStep(5)}
        className="!py-3 !text-[13px] !rounded-card-lg !mb-2.5"
      >
        Custom Topic Post
      </Button>
      <Button
        variant="purple"
        fullWidth
        onClick={() => setStep(6)}
        className="!py-3.5 !text-[13px] !rounded-card-lg !mb-6"
      >
        AI Deep Dive (Research Mode)
      </Button>

      {/* Weekly Rhythm Guide */}
      <Label>WEEKLY RHYTHM</Label>
      <Card className="!mb-6 !p-0 overflow-hidden">
        <div className="divide-y divide-ink-border">
          {[
            { day: 'Sun', type: '🔒 Week Ahead Signal — 8:00 PM', active: new Date().getDay() === 0, posting: true },
            { day: 'Mon', type: '🤫 Strategic Silence', active: new Date().getDay() === 1, posting: false },
            { day: 'Tue', type: '🔍 Intelligence Drop — 9:00 AM', active: new Date().getDay() === 2, posting: true },
            { day: 'Wed', type: '🤫 Strategic Silence', active: new Date().getDay() === 3, posting: false },
            { day: 'Thu', type: '🎯 Closing Signal — 1:30 PM', active: new Date().getDay() === 4, posting: true },
            { day: 'Fri-Sat', type: '🤫 Weekend Silence', active: [5, 6].includes(new Date().getDay()), posting: false },
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
              <span className={`text-[12px] flex-1 ${row.active ? 'text-tx font-medium' : row.posting ? 'text-tx-mid' : 'text-tx-dim italic'}`}>
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

      {/* Rooms overview */}
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

      {/* Posting discipline reminder */}
      <Card className="!mt-4 !bg-ink-el/50 !border-ink-border">
        <div className="text-[10px] font-bold tracking-wider text-tx-dim mb-1">POSTING DISCIPLINE</div>
        <div className="text-tx-dim text-[11px] leading-relaxed">
          Exactly <span className="text-tx font-semibold">3 posts/week</span>. No more.
          Sunday evening, Tuesday morning, Thursday afternoon.
          Every other day is <span className="text-tx">strategic silence</span>.
          Less is more. Each post gets full attention.
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
