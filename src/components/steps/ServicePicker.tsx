/**
 * ServicePicker — Step 15
 *
 * Service-driven post generation. The user picks any combination of MICS
 * services from the canonical 3-pillar taxonomy (42 services total). Two
 * fast-paths are surfaced at the top:
 *   - "All Compliance"     — selects the entire Operational Compliance pillar
 *   - "Customize"          — fresh selection (default)
 *
 * On Generate:
 *   1. Selected service ids → synthesizeServiceTopic() → customTopic string
 *   2. dominantRoom() → room id (drives content engine routing)
 *   3. Default post type 'observation' (service-led posts answer "what's
 *      happening in this area?" — observation is the right frame)
 *   4. Standard generate() pipeline runs (fetchNews → contentEngine → QA)
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  PILLARS, SERVICES, servicesByPillar, ALL_COMPLIANCE_PRESET,
  type PillarId,
} from '../../config/services';
import {
  synthesizeServiceTopic, dominantRoom, dominantTrackRecord, countByPillar,
} from '../../services/serviceTopicSynth';
import { POST_TYPES } from '../../config/postTypes';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, StepLabel } from '../ui/Label';
import type { PostTypeId } from '../../types';

interface ServicePickerProps {
  onGenerate: () => void;
}

export function ServicePicker({ onGenerate }: ServicePickerProps) {
  const store = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chosenType, setChosenType] = useState<PostTypeId>('observation');

  // Apply a preset on mount if the user landed here via a preset button.
  useEffect(() => {
    const preset = store.pendingServicePreset;
    if (preset === 'compliance') {
      setSelected(new Set(ALL_COMPLIANCE_PRESET));
    } else if (preset === 'corporate_finance') {
      setSelected(new Set(servicesByPillar('corporate_finance').map((s) => s.id)));
    } else if (preset === 'wealth_management') {
      setSelected(new Set(servicesByPillar('wealth_management').map((s) => s.id)));
    }
    // Clear the preset so navigating away + back doesn't auto-fill again
    if (preset) store.setPendingServicePreset(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePillar = (pillar: PillarId) => {
    const ids = servicesByPillar(pillar).map((s) => s.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // All selected → unselect all in this pillar
        ids.forEach((id) => next.delete(id));
      } else {
        // Not all selected → select all in this pillar
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const handleGenerate = () => {
    if (selected.size === 0) return;
    const serviceIds = Array.from(selected);
    const topic = synthesizeServiceTopic(serviceIds);
    const room = dominantRoom(serviceIds);

    store.setRoom(room);
    store.setPostType(chosenType);
    store.setCustomTopic(topic);
    // Clear any previously-imported brief — service-led generation uses live news
    store.setSelectedBriefItem(null);
    store.setStep(3);
    setTimeout(onGenerate, 200);
  };

  const counts = countByPillar(Array.from(selected));
  const trackRecord = dominantTrackRecord(Array.from(selected));

  return (
    <>
      <StepLabel>STEP 1 OF 2 &mdash; SELECT SERVICES</StepLabel>

      {/* ━━━ POWER PRESETS ━━━ */}
      <Label>QUICK PRESETS</Label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setSelected(new Set(ALL_COMPLIANCE_PRESET))}
          className="bg-signal-red/10 border border-signal-red/30 text-signal-red rounded-card px-3 py-2.5 text-[11px] font-semibold tracking-wide hover:bg-signal-red/15 transition-all"
        >
          🛡️ All Compliance
          <div className="text-[9px] font-normal opacity-70 mt-0.5">{ALL_COMPLIANCE_PRESET.length} services</div>
        </button>
        <button
          onClick={() => setSelected(new Set(servicesByPillar('corporate_finance').map((s) => s.id)))}
          className="bg-signal-green/10 border border-signal-green/30 text-signal-green rounded-card px-3 py-2.5 text-[11px] font-semibold tracking-wide hover:bg-signal-green/15 transition-all"
        >
          📈 All Corporate Finance
          <div className="text-[9px] font-normal opacity-70 mt-0.5">{servicesByPillar('corporate_finance').length} services</div>
        </button>
        <button
          onClick={() => setSelected(new Set(servicesByPillar('wealth_management').map((s) => s.id)))}
          className="bg-bronze/10 border border-bronze/30 text-bronze rounded-card px-3 py-2.5 text-[11px] font-semibold tracking-wide hover:bg-bronze/15 transition-all"
        >
          💎 All Wealth Mgmt
          <div className="text-[9px] font-normal opacity-70 mt-0.5">{servicesByPillar('wealth_management').length} services</div>
        </button>
        <button
          onClick={clearAll}
          className="bg-ink-card border border-ink-border text-tx-dim rounded-card px-3 py-2.5 text-[11px] font-semibold tracking-wide hover:border-tx-dim transition-all"
        >
          ✕ Clear All
          <div className="text-[9px] font-normal opacity-70 mt-0.5">Start fresh</div>
        </button>
      </div>

      {/* ━━━ PILLARS ━━━ */}
      {PILLARS.map((pillar) => {
        const pillarServices = servicesByPillar(pillar.id);
        const allSelected = pillarServices.every((s) => selected.has(s.id));
        const someSelected = pillarServices.some((s) => selected.has(s.id));
        const selectedCount = pillarServices.filter((s) => selected.has(s.id)).length;

        return (
          <div key={pillar.id} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{pillar.icon}</span>
                <div>
                  <Label color={pillar.color}>{pillar.label}</Label>
                  <div className="text-[10px] text-tx-dim -mt-1">
                    {selectedCount} of {pillarServices.length} selected
                  </div>
                </div>
              </div>
              <button
                onClick={() => togglePillar(pillar.id)}
                className="text-[10px] px-2 py-1 rounded-full border border-ink-border text-tx-dim hover:text-tx hover:border-tx-dim transition-all"
              >
                {allSelected ? 'Unselect all' : someSelected ? 'Select rest' : 'Select all'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {pillarServices.map((svc) => {
                const isSelected = selected.has(svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggle(svc.id)}
                    className={`
                      text-left px-3 py-2 rounded-card border transition-all
                      flex items-center justify-between gap-2
                      ${isSelected
                        ? 'bg-bronze/10 border-bronze/50 text-tx'
                        : 'bg-ink-card border-ink-border text-tx-mid hover:border-ink-border-light hover:bg-ink-el'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center shrink-0
                          ${isSelected
                            ? 'bg-bronze border-bronze text-ink'
                            : 'border-ink-border'
                          }
                        `}
                      >
                        {isSelected && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-[12px] truncate">{svc.label}</span>
                    </div>
                    {svc.trackRecord && (
                      <span className="text-[8px] text-tx-dim italic shrink-0 max-w-[140px] truncate">
                        {svc.trackRecord}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ━━━ FORMAT OVERRIDE ━━━ */}
      <Label>POST FORMAT</Label>
      <div className="text-[11px] text-tx-dim mb-2 -mt-1 px-0.5">
        Default is Market Observation — change if you want a different angle.
      </div>
      <Card className="!mb-4">
        <div className="grid grid-cols-2 gap-1.5">
          {POST_TYPES.map((tp) => (
            <button
              key={tp.id}
              onClick={() => setChosenType(tp.id)}
              className={`
                text-left px-2.5 py-1.5 rounded-card border transition-all
                ${chosenType === tp.id
                  ? 'bg-bronze/15 border-bronze text-tx'
                  : 'bg-transparent border-ink-border text-tx-mid hover:border-bronze/40'
                }
              `}
            >
              <div className="text-[12px] font-semibold">
                {tp.icon} {tp.label}
              </div>
              <div className="text-[9px] text-tx-dim leading-tight truncate">
                {tp.description}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* ━━━ STICKY GENERATE FOOTER ━━━ */}
      <div className="sticky bottom-0 bg-ink pt-3 pb-2 -mx-5 px-5 border-t border-ink-border">
        {selected.size > 0 && (
          <div className="text-[10px] text-tx-dim mb-2 leading-tight">
            <span className="text-tx font-semibold">{selected.size}</span> service
            {selected.size === 1 ? '' : 's'} selected
            {counts.corporate_finance > 0 && <> · {counts.corporate_finance} 📈</>}
            {counts.operational_compliance > 0 && <> · {counts.operational_compliance} 🛡️</>}
            {counts.wealth_management > 0 && <> · {counts.wealth_management} 💎</>}
            {trackRecord && (
              <div className="text-[9px] text-bronze mt-0.5 italic">
                Anchored on: {trackRecord}
              </div>
            )}
          </div>
        )}
        <Button
          variant="gold"
          fullWidth
          disabled={selected.size === 0}
          onClick={handleGenerate}
          className="!py-3 !text-[13px]"
        >
          {selected.size === 0
            ? 'Select at least one service'
            : `Generate from ${selected.size} selected service${selected.size === 1 ? '' : 's'}  →`}
        </Button>
      </div>
    </>
  );
}
