/**
 * EditorialNight — full-canvas photo background (night-skyline preferred)
 * with editorial typography overlay. Mirrors the first Claude-generated
 * banner the user approved: eyebrow caps row, massive serif headline,
 * subline with multi-org list, 3-stat grid, italic tagline, footer.
 *
 * Renders at 1080×1080 native; the parent BannerEditor scales it down
 * for preview and snapshots the un-scaled DOM via html-to-image for PNG
 * export.
 */
import type { BannerDoc } from '../bannerTypes';

interface Props {
  doc: BannerDoc;
  exportMode?: boolean;  // when true, hide editing affordances
}

export function EditorialNight({ doc, exportMode = false }: Props) {
  const { fields, photo, palette } = doc;
  return (
    <div
      data-banner-template="editorial-night"
      style={{
        position: 'relative',
        width: 1080,
        height: 1080,
        overflow: 'hidden',
        background: '#06060f',
        fontFamily: '"Figtree", "Segoe UI", system-ui, sans-serif',
        color: palette.text,
        outline: exportMode ? 'none' : `1px solid ${palette.accent}30`,
      }}
    >
      {/* Hero photo */}
      {photo.url && (
        <img
          src={photo.url}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(1.05) contrast(1.05)',
          }}
        />
      )}

      {/* Bottom-up gradient for text legibility — keeps top 55% of photo bright */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(6,6,15,0.10) 0%, rgba(6,6,15,0.20) 45%, rgba(6,6,15,0.65) 75%, rgba(6,6,15,0.92) 100%)',
        }}
      />

      {/* Top bronze bracket — editorial corner */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 30,
          height: 30,
          borderLeft: `2px solid ${palette.accent}`,
          borderTop: `2px solid ${palette.accent}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 30,
          height: 30,
          borderRight: `2px solid ${palette.accent}`,
          borderTop: `2px solid ${palette.accent}`,
        }}
      />

      {/* EYEBROW */}
      <div
        style={{
          position: 'absolute',
          top: 88,
          left: 80,
          right: 80,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 5,
          color: palette.accent,
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {fields.eyebrow.toUpperCase()}
      </div>

      {/* HEADLINE — massive serif, two lines */}
      <div
        style={{
          position: 'absolute',
          top: 360,
          left: 80,
          right: 80,
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 140,
          fontWeight: 600,
          lineHeight: 0.95,
          color: '#ffffff',
          textShadow: '0 4px 32px rgba(0,0,0,0.7), 0 2px 12px rgba(0,0,0,0.5)',
        }}
      >
        <div>{fields.headlineLine1}</div>
        <div style={{ color: palette.accent }}>{fields.headlineLine2}</div>
      </div>

      {/* SUBLINE — small caps multi-org row */}
      <div
        style={{
          position: 'absolute',
          top: 680,
          left: 80,
          right: 80,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: 1.5,
          color: 'rgba(234,230,222,0.85)',
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          lineHeight: 1.4,
        }}
      >
        {fields.subline}
      </div>

      {/* STATS GRID */}
      <div
        style={{
          position: 'absolute',
          top: 770,
          left: 80,
          right: 80,
          display: 'flex',
          gap: 60,
          alignItems: 'flex-end',
        }}
      >
        {fields.stats.slice(0, 3).map((s, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 64,
                fontWeight: 600,
                color: '#ffffff',
                lineHeight: 1,
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 2,
                color: palette.accent,
              }}
            >
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* TAGLINE — italic */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 110,
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 28,
          fontWeight: 500,
          color: palette.accent,
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          lineHeight: 1.3,
        }}
      >
        {fields.tagline}
      </div>

      {/* Bronze hairline */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 75,
          height: 1,
          background: `linear-gradient(to right, transparent, ${palette.accent}55, transparent)`,
        }}
      />

      {/* FOOTER */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 40,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 3,
          color: 'rgba(168,146,106,0.7)',
        }}
      >
        <span>MICS GROUP</span>
        <span>{fields.footer.replace('MICS Group · ', '').toUpperCase()}</span>
      </div>
    </div>
  );
}
