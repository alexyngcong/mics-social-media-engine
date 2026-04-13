import { useEffect } from 'react';
import type { GeneratedPost, Room } from '../../types';
import { tokens } from '../../config/designTokens';
import { brand, dateFormatted } from '../../config/brand';
import { getTemplate } from './templates';

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
  const dirColor = dir === 'up' ? '#22C55E' : dir === 'down' ? '#EF4444' : '#94A3B8';
  const dirText = dir === 'up' ? '\u25B2 UP' : dir === 'down' ? '\u25BC DOWN' : '\u25CF STABLE';
  const dirBg =
    dir === 'up'
      ? 'rgba(34,197,94,0.15)'
      : dir === 'down'
        ? 'rgba(239,68,68,0.15)'
        : 'rgba(148,163,184,0.08)';

  const fs = width / 1080; // font scaling factor

  useEffect(() => {
    if (onReady) setTimeout(onReady, 300);
  }, [onReady]);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: tokens.fonts.sans,
        background: T.bg,
        flexShrink: 0,
      }}
    >
      {/* Decorative orbs */}
      {T.orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            border: `1px solid ${orb.color}`,
            opacity: orb.opacity,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Left bar */}
      {T.leftBar && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: room.color,
            opacity: 0.25,
            zIndex: 1,
          }}
        />
      )}

      {/* Corner brackets */}
      {[
        { v: 'top', h: 'left', top: 95 * fs, left: 20 * fs },
        { v: 'top', h: 'right', top: 95 * fs, right: 20 * fs },
        { v: 'bottom', h: 'left', bottom: 62 * fs, left: 20 * fs },
        { v: 'bottom', h: 'right', bottom: 62 * fs, right: 20 * fs },
      ].map((pos, i) => (
        <div
          key={`corner-${i}`}
          style={{
            position: 'absolute',
            ...(pos.top !== undefined ? { top: pos.top } : {}),
            ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
            ...(pos.left !== undefined ? { left: pos.left } : {}),
            ...(pos.right !== undefined ? { right: pos.right } : {}),
            width: 16,
            height: 16,
            [`border${pos.v === 'top' ? 'Top' : 'Bottom'}`]: `1px solid ${tokens.colors.bronzeLight}30`,
            [`border${pos.h === 'left' ? 'Left' : 'Right'}`]: `1px solid ${tokens.colors.bronzeLight}30`,
            zIndex: 3,
          }}
        />
      ))}

      {/* Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: `${18 * fs}px ${28 * fs}px ${14 * fs}px`,
          background: 'linear-gradient(180deg,rgba(6,6,16,0.92),rgba(6,6,16,0.5))',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg,${tokens.colors.bronze},${tokens.colors.bronzeLight},${tokens.colors.bronze})`,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12 * fs, fontWeight: 800, letterSpacing: '.22em', color: '#fff' }}>
              {brand.name.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 9 * fs,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 2,
                letterSpacing: '.06em',
                fontWeight: 300,
              }}
            >
              {brand.tagline}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8 * fs, fontWeight: 700, color: `${tokens.colors.bronze}90`, letterSpacing: '.12em' }}>
              CFOs PRIVATE
            </div>
            <div style={{ fontSize: 8 * fs, fontWeight: 700, color: `${tokens.colors.bronze}60`, letterSpacing: '.12em' }}>
              INSIGHTS CIRCLE
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 * fs }}>
          <div style={{ fontSize: 10 * fs, fontWeight: 700, color: room.color, letterSpacing: '.1em' }}>
            {room.icon} {room.short.toUpperCase()}
          </div>
          <div style={{ fontSize: 10 * fs, color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>
            {dateFormatted.short}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${36 * fs}px ${40 * fs}px ${30 * fs}px`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia,serif',
            fontSize: 76 * fs,
            fontWeight: 700,
            color: T.statColor,
            lineHeight: 1,
            textShadow: `0 4px 40px ${room.color}25`,
          }}
        >
          {result.stat || '--'}
        </div>
        <div
          style={{
            fontSize: 12 * fs,
            fontWeight: 700,
            color: tokens.colors.bronzeLight,
            letterSpacing: '.15em',
            marginTop: 8 * fs,
            textTransform: 'uppercase',
          }}
        >
          {result.statLabel}
        </div>
        <div
          style={{
            display: 'inline-block',
            fontSize: 10 * fs,
            fontWeight: 700,
            marginTop: 10 * fs,
            padding: `${3 * fs}px ${18 * fs}px`,
            borderRadius: 20,
            color: dirColor,
            background: dirBg,
            letterSpacing: '.08em',
          }}
        >
          {dirText}
        </div>

        {/* Divider */}
        <div style={{ width: '70%', height: 1, margin: `${22 * fs}px auto`, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg,transparent,${tokens.colors.bronzeLight},transparent)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -4,
              width: 8,
              height: 8,
              background: tokens.colors.bronzeLight,
              borderRadius: 1,
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </div>

        <div
          style={{
            fontFamily: 'Georgia,serif',
            fontSize: T.headlineSize * fs,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.25,
            letterSpacing: '.03em',
            maxWidth: 440 * fs,
            textShadow: '0 1px 20px rgba(0,0,0,0.4)',
          }}
        >
          {result.headline || 'INTELLIGENCE BRIEF'}
        </div>
        <div
          style={{
            fontSize: 12 * fs,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.5,
            marginTop: 12 * fs,
            fontWeight: 300,
            maxWidth: 400 * fs,
          }}
        >
          {result.subline}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg,${tokens.colors.bronze}80,${tokens.colors.bronzeLight},${tokens.colors.bronze}80)`,
          }}
        />
        <div style={{ background: 'rgba(6,6,16,0.95)', padding: `${10 * fs}px ${28 * fs}px`, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 9 * fs,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '.12em',
            }}
          >
            {brand.community}
          </div>
          <div
            style={{
              fontSize: 8 * fs,
              color: `${tokens.colors.bronze}55`,
              marginTop: 2,
              letterSpacing: '.08em',
            }}
          >
            {brand.footer}
          </div>
        </div>
      </div>
    </div>
  );
}
