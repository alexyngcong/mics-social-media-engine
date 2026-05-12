/**
 * BannerEditor — Step 14
 *
 * In-app graphics editor that lets the user pick a template, swap photos,
 * edit every text field, and export a 1080×1080 PNG. Modelled on the
 * Claude-generated banners the user approved.
 *
 * Pipeline:
 *   1. User picks a template (Editorial Night / Newspaper White / Dark Premium)
 *   2. User picks or pastes a photo URL
 *   3. User edits eyebrow / headline / subline / stats / tagline / footer
 *   4. Live preview renders the chosen template at 0.45× scale
 *   5. Export: html-to-image snapshots the un-scaled DOM → PNG download
 *
 * Entry points:
 *   - "Banner Editor" button on CommandCenter (cold start with DEFAULT_DOC)
 *   - "Open in editor" button on any Weekly Kit card (pre-fills BannerDoc
 *     from that post's data)
 *
 * No paid API. Photos load directly from Unsplash CDN. The PNG export
 * runs entirely client-side via html-to-image.
 */
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, StepLabel } from '../ui/Label';
import { EditorialNight } from './templates/EditorialNight';
import { NewspaperWhite } from './templates/NewspaperWhite';
import { DarkPremium } from './templates/DarkPremium';
import {
  type BannerDoc,
  type TemplateId,
  DEFAULT_DOC,
  PHOTO_LIBRARY,
  PALETTE_PRESETS,
} from './bannerTypes';

const TEMPLATES: Array<{ id: TemplateId; label: string; tag: string }> = [
  { id: 'editorial-night', label: 'Editorial Night', tag: 'Photo hero, gold accents' },
  { id: 'newspaper-white', label: 'Newspaper White', tag: 'Editorial cover, red accents' },
  { id: 'dark-premium',    label: 'Dark Premium',    tag: 'Navy + gold, chart graphic' },
];

const PREVIEW_SCALE = 0.45;  // 1080 → 486 visible

export function BannerEditor() {
  const { setStep, pendingBannerDoc, setPendingBannerDoc } = useAppStore();

  // Initialise from any pre-filled doc (e.g. "Open in editor" from kit card),
  // otherwise start from DEFAULT_DOC.
  const [doc, setDoc] = useState<BannerDoc>(() => pendingBannerDoc || DEFAULT_DOC);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [flash, setFlash] = useState('');
  const exportNodeRef = useRef<HTMLDivElement | null>(null);

  // Clear the pending doc on unmount so the next time the user opens the
  // editor cold (from CommandCenter) they start fresh.
  useEffect(() => () => setPendingBannerDoc(null), [setPendingBannerDoc]);

  const setField = <K extends keyof BannerDoc['fields']>(key: K, value: BannerDoc['fields'][K]) =>
    setDoc(d => ({ ...d, fields: { ...d.fields, [key]: value } }));

  const setStat = (i: number, key: 'value' | 'label', value: string) =>
    setDoc(d => ({
      ...d,
      fields: {
        ...d.fields,
        stats: d.fields.stats.map((s, idx) => idx === i ? { ...s, [key]: value } : s),
      },
    }));

  const setPhoto = (url: string) =>
    setDoc(d => ({ ...d, photo: { ...d.photo, url } }));

  const handleExportPng = async () => {
    if (!exportNodeRef.current) return;
    setFlash('Generating PNG…');
    try {
      // Load html-to-image from public ESM CDN at click-time. This
      // avoids requiring `npm install` for the package to be present —
      // and the /* @vite-ignore */ tells Vite not to try to resolve
      // this URL at build time.
      const cdnUrl = 'https://esm.sh/html-to-image@1.11.13';
      const mod = await import(/* @vite-ignore */ cdnUrl) as { toPng: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<string> };
      const dataUrl = await mod.toPng(exportNodeRef.current, {
        width: 1080,
        height: 1080,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
      });
      const link = document.createElement('a');
      link.download = `mics-banner-${doc.templateId}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setFlash('✓ PNG downloaded');
      setTimeout(() => setFlash(''), 2500);
    } catch (e) {
      console.error('[BannerEditor] PNG export failed', e);
      setFlash(`Export failed — ${e instanceof Error ? e.message : 'unknown error'}`);
      setTimeout(() => setFlash(''), 5000);
    }
  };

  const Template =
    doc.templateId === 'newspaper-white' ? NewspaperWhite :
    doc.templateId === 'dark-premium'    ? DarkPremium :
    EditorialNight;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <StepLabel>BANNER EDITOR</StepLabel>
        <Button
          variant="ghost"
          onClick={() => setStep(0)}
          className="!px-2.5 !py-1 !text-[10px]"
        >
          ← Home
        </Button>
      </div>

      {/* TEMPLATE PICKER */}
      <Label>TEMPLATE STYLE</Label>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setDoc(d => ({ ...d, templateId: t.id }))}
            className={`
              text-left p-2.5 rounded-card border transition-all
              ${doc.templateId === t.id
                ? 'border-bronze bg-bronze/15'
                : 'border-ink-border bg-ink-card hover:border-bronze/40'
              }
            `}
          >
            <div className={`text-[11px] font-bold mb-0.5 ${doc.templateId === t.id ? 'text-bronze' : 'text-tx'}`}>
              {t.label}
            </div>
            <div className="text-[9px] text-tx-dim leading-tight">{t.tag}</div>
          </button>
        ))}
      </div>

      {/* PREVIEW */}
      <Label>PREVIEW · 1080 × 1080</Label>
      <div
        className="bg-ink rounded-card overflow-hidden mb-4 border border-ink-border flex items-center justify-center"
        style={{ minHeight: 1080 * PREVIEW_SCALE + 24, padding: 12 }}
      >
        <div
          style={{
            width: 1080 * PREVIEW_SCALE,
            height: 1080 * PREVIEW_SCALE,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            ref={exportNodeRef}
            style={{
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: 'top left',
              width: 1080,
              height: 1080,
            }}
          >
            <Template doc={doc} />
          </div>
        </div>
      </div>

      {/* EXPORT */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="gold"
          fullWidth
          onClick={handleExportPng}
          className="!py-2.5 !text-[12px]"
        >
          ⬇ Export PNG (1080 × 1080)
        </Button>
      </div>
      {flash && (
        <div className="mb-3 text-[11px] text-bronze text-center">{flash}</div>
      )}

      {/* PALETTE PRESETS */}
      <Label>ACCENT COLOR</Label>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {PALETTE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setDoc(d => ({ ...d, palette: p.palette }))}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold
              transition-all
              ${doc.palette.accent === p.palette.accent
                ? 'border-tx/60 bg-ink-card'
                : 'border-ink-border bg-ink hover:border-bronze/40'
              }
            `}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: p.palette.accent }}
            />
            <span className="text-tx-mid">{p.label}</span>
          </button>
        ))}
      </div>

      {/* PHOTO PICKER (hidden for dark-premium which doesn't show one) */}
      {doc.templateId !== 'dark-premium' && (
        <>
          <Label>PHOTO</Label>
          <div className="grid grid-cols-4 gap-1.5 mb-2 max-h-[200px] overflow-y-auto p-1 bg-ink-card rounded-card border border-ink-border">
            {PHOTO_LIBRARY.map((p) => (
              <button
                key={p.url}
                onClick={() => setPhoto(p.url)}
                title={p.label}
                className={`
                  aspect-square rounded overflow-hidden border-2 transition-all
                  ${doc.photo.url === p.url
                    ? 'border-bronze'
                    : 'border-transparent hover:border-bronze/40'
                  }
                `}
              >
                <img
                  src={p.url}
                  alt={p.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="url"
              placeholder="…or paste any Unsplash image URL"
              value={customPhotoUrl}
              onChange={(e) => setCustomPhotoUrl(e.target.value)}
              className="
                flex-1 bg-ink-card border border-ink-border rounded-card
                px-3 py-1.5 text-[11px] text-tx font-mono
                focus:outline-none focus:border-bronze/40
              "
            />
            <Button
              variant="ghost"
              onClick={() => { if (customPhotoUrl.trim()) { setPhoto(customPhotoUrl.trim()); setCustomPhotoUrl(''); } }}
              className="!py-1.5 !px-3 !text-[10px]"
            >
              Use URL
            </Button>
          </div>
        </>
      )}

      {/* FIELD EDITORS */}
      <Label>TEXT FIELDS</Label>
      <Card className="!mb-4">
        <EditField label="Eyebrow"        value={doc.fields.eyebrow}       onChange={v => setField('eyebrow', v)} />
        <EditField label="Headline 1"     value={doc.fields.headlineLine1} onChange={v => setField('headlineLine1', v)} />
        <EditField label="Headline 2 (accent)" value={doc.fields.headlineLine2} onChange={v => setField('headlineLine2', v)} />
        <EditField label="Subline (orgs / context list)" value={doc.fields.subline} onChange={v => setField('subline', v)} multiline />
        <EditField label="Tagline (italic)" value={doc.fields.tagline} onChange={v => setField('tagline', v)} multiline />
        <EditField label="Footer"         value={doc.fields.footer}         onChange={v => setField('footer', v)} />
      </Card>

      <Label>STATS GRID (3 max)</Label>
      <Card className="!mb-4">
        {doc.fields.stats.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={s.value}
              onChange={(e) => setStat(i, 'value', e.target.value)}
              placeholder="Value (e.g. $57B)"
              className="flex-1 bg-ink border border-ink-border rounded px-2.5 py-1.5 text-[12px] text-tx font-serif"
            />
            <input
              type="text"
              value={s.label}
              onChange={(e) => setStat(i, 'label', e.target.value)}
              placeholder="Label (e.g. Total Pipeline)"
              className="flex-1 bg-ink border border-ink-border rounded px-2.5 py-1.5 text-[10px] text-tx-mid uppercase tracking-wider"
            />
          </div>
        ))}
      </Card>

      <Button
        variant="ghost"
        fullWidth
        onClick={() => setStep(0)}
        className="!py-2.5 !text-[11px] !mt-3"
      >
        ← Back to Command Center
      </Button>
    </>
  );
}

// ─── Reusable text input row ───────────────────────────────────

interface EditFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}

function EditField({ label, value, onChange, multiline }: EditFieldProps) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="text-[9px] font-bold tracking-wider text-tx-ghost mb-1">
        {label.toUpperCase()}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="
            w-full bg-ink border border-ink-border rounded
            px-2.5 py-1.5 text-[11px] text-tx leading-relaxed
            focus:outline-none focus:border-bronze/40 resize-y
          "
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full bg-ink border border-ink-border rounded
            px-2.5 py-1.5 text-[11px] text-tx
            focus:outline-none focus:border-bronze/40
          "
        />
      )}
    </div>
  );
}
