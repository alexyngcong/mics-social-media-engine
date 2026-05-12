/**
 * NewspaperWhite — clean editorial cover. White background, large serif
 * headline with red accent on the second line, light-gray skyline
 * silhouette on the right side, stats grid bottom-left, italic tagline.
 *
 * Mirrors the second Claude-generated banner the user approved.
 */
import type { BannerDoc } from '../bannerTypes';

interface Props {
  doc: BannerDoc;
  exportMode?: boolean;
}

export function NewspaperWhite({ doc, exportMode = false }: Props) {
  const { fields, photo, palette } = doc;
  return (
    <div
      data-banner-template="newspaper-white"
      style={{
        position: 'relative',
        width: 1080,
        height: 1080,
        overflow: 'hidden',
        background: '#F7F4ED',  // off-white newspaper stock
        fontFamily: '"Figtree", "Segoe UI", system-ui, sans-serif',
        color: '#0a0a0a',
        outline: exportMode ? 'none' : `1px solid ${palette.accent}30`,
      }}
    >
      {/* Right-side photo, faded to silhouette (white-mode) */}
      {photo.url && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '52%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <img
            src={photo.url}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'grayscale(1) brightness(1.1) contrast(0.95) opacity(0.32)',
              mixBlendMode: 'multiply',
            }}
          />
          {/* Left fade so the photo bleeds into white toward the left edge */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, #F7F4ED 0%, rgba(247,244,237,0.5) 25%, transparent 60%)',
            }}
          />
        </div>
      )}

      {/* Red left accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 8,
          background: palette.accent,
        }}
      />

      {/* EYEBROW */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 80,
          right: 540,
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: 4,
          color: '#0a0a0a',
        }}
      >
        {fields.eyebrow.toUpperCase()}
      </div>

      {/* HEADLINE — massive serif, two lines, accent on second */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 80,
          right: 80,
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 160,
          fontWeight: 600,
          lineHeight: 0.92,
          letterSpacing: '-2px',
        }}
      >
        <div style={{ color: '#0a0a0a' }}>{fields.headlineLine1}</div>
        <div style={{ color: palette.accent }}>{fields.headlineLine2}</div>
      </div>

      {/* SUBLINE — multi-org caps row */}
      <div
        style={{
          position: 'absolute',
          top: 600,
          left: 80,
          right: 80,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: 1.5,
          color: '#3a3a3a',
          lineHeight: 1.4,
        }}
      >
        {fields.subline}
      </div>

      {/* STATS GRID */}
      <div
        style={{
          position: 'absolute',
          top: 740,
          left: 80,
          right: 80,
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
                fontWeight: 700,
                color: '#0a0a0a',
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
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* TAGLINE — red italic serif */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 110,
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 30,
          fontWeight: 500,
          color: palette.accent,
          lineHeight: 1.3,
        }}
      >
        {fields.tagline}
      </div>

      {/* FOOTER */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 50,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 3,
          color: '#666',
        }}
      >
        <span style={{ color: palette.accent }}>MICS GROUP</span>
        <span>{fields.footer.replace('MICS Group · ', '').toUpperCase()}</span>
      </div>
    </div>
  );
}
