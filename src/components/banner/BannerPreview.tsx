import { useEffect, useRef, useState } from 'react';
import type { GeneratedPost, Room, RoomId } from '../../types';
import { tokens } from '../../config/designTokens';
import { dateFormatted } from '../../config/brand';
import { getTemplate } from './templates';
import { getPhotoForTopic } from '../../config/stockPhotos';

interface BannerPreviewProps {
  result: GeneratedPost;
  room: Room;
  variant: number;
  onReady?: () => void;
  width?: number;
  height?: number;
  scale?: number;
}

export function BannerPreview({
  result,
  room,
  variant,
  onReady,
  width = 1080,
  height = 1350,
  scale = 0.42,
}: BannerPreviewProps) {
  const T = getTemplate(variant, room.color, tokens.colors.bronze);
  const dir = result.statDirection || 'neutral';
  const dirColor = dir === 'up' ? '#22C55E' : dir === 'down' ? '#EF4444' : '#64748B';
  const dirArrow = dir === 'up' ? '\u25B2' : dir === 'down' ? '\u25BC' : '\u2022';
  const dirLabel = dir === 'up' ? 'RISING' : dir === 'down' ? 'FALLING' : 'STABLE';

  const fs = width / 1080;
  const layout = T.photoLayout;
  const isSplit = layout === 'split-left' || layout === 'split-right';
  const [imgLoaded, setImgLoaded] = useState(false);
  const onReadyFired = useRef(false);

  // Topic-based photo selection
  const topicText = [result.headline, result.subline, result.statLabel].filter(Boolean).join(' ');
  const photoUrl = getPhotoForTopic(topicText, room.id as RoomId, variant);

  // Load photo when URL changes
  useEffect(() => {
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgLoaded(true);
      if (!onReadyFired.current) {
        onReadyFired.current = true;
        if (onReady) setTimeout(onReady, 300);
      }
    };
    img.onerror = () => {
      setImgLoaded(false);
      if (!onReadyFired.current) {
        onReadyFired.current = true;
        if (onReady) setTimeout(onReady, 300);
      }
    };
    img.src = photoUrl;
  }, [photoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildBackground = (): string => {
    if (!imgLoaded) return T.bg;
    switch (layout) {
      case 'fullbleed':
        return `linear-gradient(180deg,rgba(4,4,12,0.08) 0%,rgba(4,4,12,0.3) 25%,rgba(4,4,12,0.55) 50%,rgba(4,4,12,0.85) 75%,rgba(4,4,12,0.96) 100%),url(${photoUrl}) center/cover no-repeat`;
      case 'duotone':
        return `linear-gradient(180deg,rgba(4,4,12,0.1) 0%,rgba(4,4,12,0.5) 45%,rgba(4,4,12,0.85) 75%,rgba(4,4,12,0.96) 100%),url(${photoUrl}) center/cover no-repeat`;
      case 'vignette':
        return `radial-gradient(ellipse at 50% 30%,transparent 12%,rgba(4,4,12,0.45) 35%,rgba(4,4,12,0.8) 65%,rgba(4,4,12,0.97) 100%),url(${photoUrl}) center/cover no-repeat`;
      case 'frosted':
        return `linear-gradient(180deg,rgba(4,4,12,0.35) 0%,rgba(4,4,12,0.55) 100%),url(${photoUrl}) center/cover no-repeat`;
      case 'split-left':
      case 'split-right':
        return '#060610';
      default:
        return T.bg;
    }
  };

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width, height,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: tokens.fonts.sans,
        background: buildBackground(),
        flexShrink: 0,
      }}
    >
      {/* Duotone overlay */}
      {layout === 'duotone' && imgLoaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: T.photoDuotoneColor || room.color,
          mixBlendMode: 'color', opacity: 0.5,
        }} />
      )}

      {/* Split photo panel */}
      {isSplit && imgLoaded && (
        <div style={{
          position: 'absolute', top: 0,
          [layout === 'split-right' ? 'right' : 'left']: 0,
          width: '52%', height: '100%', zIndex: 0,
          background: `linear-gradient(${layout === 'split-right' ? '270deg' : '90deg'},rgba(6,6,16,0.8) 0%,rgba(6,6,16,0.2) 50%,rgba(6,6,16,0.05) 100%),url(${photoUrl}) center/cover no-repeat`,
        }} />
      )}

      {/* Frosted panel */}
      {layout === 'frosted' && imgLoaded && (
        <div style={{
          position: 'absolute', left: '6%', right: '6%', top: '12%', height: '74%',
          zIndex: 1, borderRadius: 24,
          background: 'rgba(10,10,24,0.6)',
          backdropFilter: 'blur(40px) brightness(0.5)',
          WebkitBackdropFilter: 'blur(40px) brightness(0.5)',
          border: `1px solid ${room.color}20`,
        }} />
      )}

      {/* Orbs (visible when image hasn't loaded yet) */}
      {!imgLoaded && T.orbs.map((orb, i) => (
        <div key={i} style={{
          position: 'absolute', top: orb.top, left: orb.left,
          width: orb.size, height: orb.size, borderRadius: '50%',
          border: `1px solid ${orb.color}`, opacity: orb.opacity, pointerEvents: 'none',
        }} />
      ))}

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 10,
        background: `linear-gradient(90deg,transparent,${room.color}80,transparent)`,
      }} />

      {/* Room indicator - top left */}
      <div style={{
        position: 'absolute', top: 20 * fs, left: 40 * fs, zIndex: 10,
        fontSize: 11 * fs, fontWeight: 600, color: `${room.color}99`,
        letterSpacing: '.1em',
      }}>
        {room.icon}{'  '}{room.short.toUpperCase()}
      </div>

      {/* Date - top right */}
      <div style={{
        position: 'absolute', top: 22 * fs, right: 40 * fs, zIndex: 10,
        fontSize: 10 * fs, fontWeight: 300, color: 'rgba(255,255,255,0.18)',
      }}>
        {dateFormatted.short}
      </div>

      {/* CONTENT */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%',
        padding: `${60 * fs}px ${isSplit ? 20 * fs : 40 * fs}px ${50 * fs}px`,
        textAlign: 'center',
        maxWidth: isSplit ? '48%' : '100%',
        marginLeft: isSplit && layout === 'split-right' ? 0 : 'auto',
        marginRight: isSplit && layout === 'split-left' ? 0 : 'auto',
      }}>
        {/* STAT - large, immersive */}
        <div style={{
          fontFamily: 'Georgia,serif',
          fontSize: (isSplit ? 80 : 120) * fs,
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1,
          textShadow: `0 4px 60px ${room.color}35, 0 2px 20px rgba(0,0,0,0.4)`,
          marginBottom: 6 * fs,
        }}>
          {result.stat || '--'}
        </div>

        {/* Stat label */}
        <div style={{
          fontSize: 11 * fs, fontWeight: 600,
          color: `${tokens.colors.bronzeLight}B0`,
          letterSpacing: '.3em', textTransform: 'uppercase',
        }}>
          {result.statLabel}
        </div>

        {/* Direction */}
        <div style={{
          fontSize: 9 * fs, fontWeight: 700,
          color: dirColor, marginTop: 8 * fs, letterSpacing: '.1em',
        }}>
          {dirArrow}{'  '}{dirLabel}
        </div>

        {/* Divider - asymmetric dashes */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10 * fs,
          margin: `${20 * fs}px 0`,
        }}>
          <div style={{
            width: 40 * fs, height: 2,
            background: `${room.color}50`,
          }} />
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: `${room.color}80`,
          }} />
          <div style={{
            width: 40 * fs, height: 2,
            background: `${room.color}50`,
          }} />
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: 'Georgia,serif',
          fontSize: T.headlineSize * (isSplit ? 0.9 : 1.2) * fs,
          fontWeight: 700, color: '#ffffff',
          lineHeight: 1.2, letterSpacing: '.02em',
          maxWidth: (isSplit ? 280 : 500) * fs,
          textShadow: '0 1px 15px rgba(0,0,0,0.4)',
        }}>
          {result.headline || 'INTELLIGENCE BRIEF'}
        </div>

        {/* Subline */}
        <div style={{
          fontSize: 12 * fs, color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.5, marginTop: 12 * fs, fontWeight: 300,
          maxWidth: (isSplit ? 260 : 440) * fs,
        }}>
          {result.subline}
        </div>

        {/* Source */}
        {result.source && (
          <div style={{
            fontSize: 8 * fs, color: 'rgba(255,255,255,0.15)',
            marginTop: 22 * fs, letterSpacing: '.05em',
          }}>
            {result.source.toUpperCase()}
          </div>
        )}
      </div>

      {/* Loading state */}
      {!imgLoaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6,6,16,0.85)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 * fs, letterSpacing: '.12em' }}>
            LOADING...
          </div>
        </div>
      )}

      {/* Bottom: minimal footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        textAlign: 'center', paddingBottom: 12 * fs,
      }}>
        <div style={{
          width: '60%', height: 0.5, margin: `0 auto ${10 * fs}px`,
          background: `linear-gradient(90deg,transparent,${room.color}30,transparent)`,
        }} />
        <div style={{
          fontSize: 8 * fs, fontWeight: 300,
          color: 'rgba(255,255,255,0.12)', letterSpacing: '.15em',
        }}>
          PRIVATE INTELLIGENCE
        </div>
      </div>
    </div>
  );
}
