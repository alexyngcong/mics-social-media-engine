import { useState } from 'react';
import type { QAReport } from '../../types';
import { QAReportCard } from './QAReportCard';
import { Button } from '../ui/Button';

interface QABadgeProps {
  report: QAReport;
  onAutoFix?: () => void;
  onRegenerate?: () => void;
  compact?: boolean;
}

const VERDICT_CONFIG = {
  APPROVED: {
    icon: '\u2705',
    label: 'QA APPROVED',
    bg: 'bg-signal-green/10',
    border: 'border-signal-green/30',
    text: 'text-signal-green',
    glow: 'shadow-[0_0_12px_rgba(74,222,128,0.15)]',
  },
  FLAGGED: {
    icon: '\u26A0\uFE0F',
    label: 'QA FLAGGED',
    bg: 'bg-signal-amber/10',
    border: 'border-signal-amber/30',
    text: 'text-signal-amber',
    glow: 'shadow-[0_0_12px_rgba(251,191,36,0.15)]',
  },
  REJECTED: {
    icon: '\u274C',
    label: 'QA REJECTED',
    bg: 'bg-signal-red/10',
    border: 'border-signal-red/30',
    text: 'text-signal-red',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  },
};

export function QABadge({ report, onAutoFix, onRegenerate, compact }: QABadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = VERDICT_CONFIG[report.verdict];

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
          ${config.bg} ${config.border} ${config.text} border transition-all
          hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <span className="text-[11px]">{config.icon}</span>
        <span>{report.score}</span>
      </button>
    );
  }

  return (
    <div className="mb-3.5">
      {/* Badge bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-card-lg border
          ${config.bg} ${config.border} ${config.glow}
          transition-all duration-200 hover:scale-[1.005] active:scale-[0.998]
          cursor-pointer
        `}
      >
        {/* Verdict icon */}
        <span className="text-[16px]">{config.icon}</span>

        {/* Verdict text */}
        <div className="flex-1 text-left">
          <div className={`text-[11px] font-bold tracking-wider ${config.text}`}>
            {config.label}
          </div>
          <div className="text-[10px] text-tx-dim mt-0.5 leading-snug">
            {report.summary.length > 100 ? report.summary.slice(0, 97) + '...' : report.summary}
          </div>
        </div>

        {/* Score circle */}
        <div className="flex flex-col items-center">
          <div className={`
            w-10 h-10 rounded-full border-2 flex items-center justify-center
            ${config.border} ${config.bg}
          `}>
            <span className={`text-[14px] font-bold ${config.text}`}>{report.score}</span>
          </div>
          <span className="text-[8px] text-tx-ghost mt-0.5">SCORE</span>
        </div>

        {/* Expand indicator */}
        <div className={`text-tx-dim text-[12px] transition-transform ${expanded ? 'rotate-180' : ''}`}>
          {'\u25BC'}
        </div>
      </button>

      {/* Stats row */}
      <div className="flex gap-3 mt-1.5 px-1">
        <span className="text-[9px] text-signal-green">
          {report.passCount} passed
        </span>
        {report.warnCount > 0 && (
          <span className="text-[9px] text-signal-amber">
            {report.warnCount} warnings
          </span>
        )}
        {report.failCount > 0 && (
          <span className="text-[9px] text-signal-red">
            {report.failCount} failed
          </span>
        )}
        <span className="text-[9px] text-tx-ghost ml-auto">
          {report.checks.length} checks &middot; tap to {expanded ? 'hide' : 'expand'}
        </span>
      </div>

      {/* Audit-refresh line — proves to the user this validation ran live */}
      <div className="flex gap-2 mt-1 px-1 text-[9px] text-tx-ghost">
        <span>Audit refreshed:</span>
        <span className="text-tx-dim">{formatAuditTime(report.timestamp)}</span>
      </div>

      {/* Quick-action buttons — visible WITHOUT needing to expand the report.
          Shown whenever the post is not APPROVED, so the user always has a
          clear next step. */}
      {report.verdict !== 'APPROVED' && (onAutoFix || onRegenerate) && (
        <div className="flex gap-2 mt-2">
          {onAutoFix && (
            <Button
              variant="gold"
              onClick={onAutoFix}
              className="flex-1 !py-2 !text-[11px]"
            >
              Auto-Fix Issues
            </Button>
          )}
          {onRegenerate && (
            <Button
              variant="ghost"
              onClick={onRegenerate}
              className={`flex-1 !py-2 !text-[11px] ${
                report.verdict === 'REJECTED'
                  ? '!border-signal-red/40 !text-signal-red'
                  : '!border-signal-amber/40 !text-signal-amber'
              }`}
            >
              Regenerate Post
            </Button>
          )}
        </div>
      )}

      {/* Expanded report */}
      {expanded && (
        <div className="mt-2">
          <QAReportCard
            report={report}
            onAutoFix={onAutoFix}
            onRegenerate={onRegenerate}
          />
        </div>
      )}
    </div>
  );
}

/** Format the QA audit timestamp in a readable UAE-time string. */
function formatAuditTime(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
    }) + ' UAE';
  } catch {
    return isoTimestamp;
  }
}
