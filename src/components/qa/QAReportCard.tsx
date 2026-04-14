import type { QAReport, QACategory, QACheckResult } from '../../types';
import { Button } from '../ui/Button';

interface QAReportCardProps {
  report: QAReport;
  onAutoFix?: () => void;
  onRegenerate?: () => void;
}

const CATEGORY_META: Record<QACategory, { label: string; icon: string }> = {
  freshness: { label: 'Content Freshness', icon: '\u23F0' },
  source: { label: 'Source Reliability', icon: '\uD83D\uDCF0' },
  voice: { label: 'Brand Voice', icon: '\uD83C\uDFA4' },
  format: { label: 'Format Compliance', icon: '\uD83D\uDCD0' },
  platform: { label: 'Platform Fit', icon: '\uD83D\uDCF1' },
  integrity: { label: 'Content Integrity', icon: '\uD83D\uDD12' },
  conversion: { label: 'Conversion Design', icon: '\uD83C\uDFAF' },
};

function CheckRow({ check }: { check: QACheckResult }) {
  const icon = check.passed ? '\u2705' : check.severity === 'critical' ? '\u274C' : '\u26A0\uFE0F';
  const textColor = check.passed
    ? 'text-tx-dim'
    : check.severity === 'critical'
      ? 'text-signal-red'
      : 'text-signal-amber';

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-ink-border/30 last:border-0">
      <span className="text-[11px] mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-medium ${check.passed ? 'text-tx-mid' : textColor}`}>
          {check.label}
        </div>
        <div className="text-[10px] text-tx-dim leading-snug mt-0.5">
          {check.detail}
        </div>
      </div>
      {!check.passed && (
        <span className={`
          text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5
          ${check.severity === 'critical'
            ? 'bg-signal-red/15 text-signal-red'
            : check.severity === 'warning'
              ? 'bg-signal-amber/15 text-signal-amber'
              : 'bg-tx-ghost/15 text-tx-ghost'
          }
        `}>
          {check.severity.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function CategorySection({ category, checks }: { category: QACategory; checks: QACheckResult[] }) {
  const meta = CATEGORY_META[category];
  const allPassed = checks.every(c => c.passed);
  const hasCritical = checks.some(c => !c.passed && c.severity === 'critical');

  return (
    <div className={`
      rounded-lg border overflow-hidden mb-2
      ${hasCritical
        ? 'border-signal-red/20 bg-signal-red/5'
        : allPassed
          ? 'border-signal-green/15 bg-signal-green/5'
          : 'border-signal-amber/15 bg-signal-amber/5'
      }
    `}>
      {/* Category header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-border/20">
        <span className="text-[12px]">{meta.icon}</span>
        <span className="text-[10px] font-bold tracking-wider text-tx-mid">{meta.label.toUpperCase()}</span>
        <span className={`
          ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full
          ${allPassed
            ? 'bg-signal-green/15 text-signal-green'
            : hasCritical
              ? 'bg-signal-red/15 text-signal-red'
              : 'bg-signal-amber/15 text-signal-amber'
          }
        `}>
          {checks.filter(c => c.passed).length}/{checks.length} PASS
        </span>
      </div>

      {/* Individual checks */}
      <div className="px-3 py-1">
        {checks.map(check => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

export function QAReportCard({ report, onAutoFix, onRegenerate }: QAReportCardProps) {
  // Group checks by category
  const categories = new Map<QACategory, QACheckResult[]>();
  for (const check of report.checks) {
    const existing = categories.get(check.category) || [];
    existing.push(check);
    categories.set(check.category, existing);
  }

  // Order: show failing categories first
  const orderedCategories = [...categories.entries()].sort(([, a], [, b]) => {
    const aFails = a.filter(c => !c.passed).length;
    const bFails = b.filter(c => !c.passed).length;
    return bFails - aFails;
  });

  const hasFixableIssues = report.checks.some(c =>
    !c.passed && (
      c.id === 'voice-punctuation' ||
      c.id === 'integrity-no-html' ||
      c.id === 'format-headline'
    )
  );

  return (
    <div className="bg-ink-card border border-ink-border rounded-card-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ink-border bg-ink-el/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-tx-ghost tracking-wider">
              QUALITY ASSURANCE REPORT
            </div>
            <div className="text-[9px] text-tx-dim mt-0.5">
              {new Date(report.timestamp).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })} &middot; {report.checks.length} checks &middot; {report.passCount} passed
            </div>
          </div>
          <div className="text-right">
            <div className={`
              text-[20px] font-bold
              ${report.verdict === 'APPROVED' ? 'text-signal-green'
                : report.verdict === 'FLAGGED' ? 'text-signal-amber'
                : 'text-signal-red'}
            `}>
              {report.score}
            </div>
            <div className="text-[8px] text-tx-ghost">SCORE</div>
          </div>
        </div>
      </div>

      {/* Category sections */}
      <div className="p-3">
        {orderedCategories.map(([category, checks]) => (
          <CategorySection key={category} category={category} checks={checks} />
        ))}
      </div>

      {/* Action buttons */}
      {(hasFixableIssues || report.verdict === 'REJECTED') && (
        <div className="px-4 py-3 border-t border-ink-border bg-ink-el/30 flex gap-2">
          {hasFixableIssues && onAutoFix && (
            <Button
              variant="gold"
              onClick={onAutoFix}
              className="flex-1 !py-2 !text-[11px]"
            >
              Auto-Fix Issues
            </Button>
          )}
          {report.verdict === 'REJECTED' && onRegenerate && (
            <Button
              variant="ghost"
              onClick={onRegenerate}
              className="flex-1 !py-2 !text-[11px] !border-signal-red/30 !text-signal-red"
            >
              Regenerate Post
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
