/**
 * DarkPremium — navy ink background, gold serif typography, no photo
 * by default. Instead renders a stylised bar-chart skyline in the lower
 * right corner that doubles as both ornament and visual signal.
 *
 * Mirrors the third Claude-generated banner the user approved.
 */
import type { BannerDoc } from '../bannerTypes';

interface Props {
  doc: BannerDoc;
  exportMode?: boolean;
}

export function DarkPremium({ doc, exportMode = false }: Props) {
  const { fields, palette } = doc;

  // Stylised bar-chart cityscape — 14 bars of varying height growing toward right
  const bars = [
    { h: 80,  w: 36 },
    { h: 130, w: 36 },
    { h: 95,  w: 36 },
    { h: 160, w: 36 },
    { h: 110, w: 36 },
    { h: 200, w: 36 },
    { h: 150, w: 36 },
    { h: 230, w: 36 },
    { h: 175, w: 36 },
    { h: 270, w: 36 },
    { h: 210, w: 36 },
    { h: 320, w: 36 },
    { h: 260, w: 36 },
    { h: 380, w: 36 },
  ];

  return (
    <div
      data-banner-template="dark-premium"
      style={{
        position: 'relative',
        width: 1080,
        height: 1080,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #08081a 0%, #0d1428 100%)',
        fontFamily: '"Figtree", "Segoe UI", system-ui, sans-serif',
        color: palette.text,
        outline: exportMode ? 'none' : `1px solid ${palette.accent}30`,
      }}
    >
      {/* Top corner brackets */}
      <div style={{ position: 'absolute', top: 40, left: 40, width: 30, height: 30, borderLeft: `2px solid ${palette.accent}80`, borderTop: `2px solid ${palette.accent}80` }} />
      <div style={{ position: 'absolute', top: 40, right: 40, width: 30, height: 30, borderRight: `2px solid ${palette.accent}80`, borderTop: `2px solid ${palette.accent}80` }} />
      <div style={{ position: 'absolute', bottom: 40, left: 40, width: 30, height: 30, borderLeft: `2px solid ${palette.accent}80`, borderBottom: `2px solid ${palette.accent}80` }} />
      <div style={{ position: 'absolute', bottom: 40, right: 40, width: 30, height: 30, borderRight: `2px solid ${palette.accent}80`, borderBottom: `2px solid ${palette.accent}80` }} />

      {/* Right-edge vertical caption stamp */}
      <div
        style={{
          position: 'absolute',
          right: 22,
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)',
          transformOrigin: 'right center',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 4,
          color: `${palette.accent}80`,
          whiteSpace: 'nowrap',
        }}
      >
        INFRASTRUCTURE · CAPITAL · 2026
      </div>

      {/* EYEBROW + horizontal rule */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 80,
          right: 80,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 5,
          color: 'rgba(234,230,222,0.6)',
        }}
      >
        {fields.eyebrow.toUpperCase()}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 145,
          left: 80,
          width: 480,
          height: 1,
          background: `${palette.accent}40`,
        }}
      />

      {/* HEADLINE — gold serif two lines */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: 80,
          right: 80,
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 145,
          fontWeight: 600,
          lineHeight: 0.95,
        }}
      >
        <div style={{ color: '#EAE6DE' }}>{fields.headlineLine1}</div>
        <div style={{ color: palette.accent }}>{fields.headlineLine2}</div>
      </div>

      {/* SUBLINE — narrower (chart sits to the right) */}
      <div
        style={{
          position: 'absolute',
          top: 580,
          left: 80,
          width: 540,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: 1.5,
          color: 'rgba(234,230,222,0.75)',
          lineHeight: 1.4,
        }}
      >
        {fields.subline}
      </div>

      {/* STATS GRID */}
      <div
        style={{
          position: 'absolute',
          top: 730,
          left: 80,
          display: 'flex',
          gap: 60,
          alignItems: 'flex-end',
        }}
      >
        {fields.stats.slice(0, 3).map((s, i) => (
          <div key={i}>
            <div
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 64,
                fontWeight: 600,
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
                color: `${palette.accent}99`,
                textTransform: 'uppercase',
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Stylised cityscape bar-chart (right side) */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          right: 80,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 380,
        }}
      >
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              width: b.w,
              height: b.h,
              background: `linear-gradient(180deg, ${palette.accent}55 0%, ${palette.accent}25 60%, transparent 100%)`,
              borderTop: `1px solid ${palette.accent}80`,
              borderRadius: '2px 2px 0 0',
            }}
          />
        ))}
      </div>

      {/* FOOTER */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 70,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 3,
          color: `${palette.accent}99`,
        }}
      >
        <span>MICS GROUP</span>
        <span style={{ color: 'rgba(234,230,222,0.5)' }}>
          {fields.footer.replace('MICS Group · ', '').toUpperCase()}
        </span>
      </div>
    </div>
  );
}
