import { useMemo } from 'react';
import type { GeneratedPost, Room } from '../../types';
import { BannerPreview } from '../banner/BannerPreview';

interface WhatsAppPreviewProps {
  result: GeneratedPost;
  room: Room;
  bannerVariant: number;
  /** Show banner image above text (default true) */
  showBanner?: boolean;
}

/**
 * Parses WhatsApp-style formatting into React elements.
 * Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
function parseWhatsAppFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  // Split by lines first to preserve line breaks
  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) nodes.push(<br key={`br-${key++}`} />);

    if (line.trim() === '') return;

    // Process inline formatting within each line
    // Pattern: match *bold*, _italic_, ~strike~, ```mono```
    const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      // Text before the match
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`t-${key++}`}>{line.slice(lastIndex, match.index)}</span>
        );
      }

      const raw = match[0];
      if (raw.startsWith('```') && raw.endsWith('```')) {
        nodes.push(
          <code
            key={`c-${key++}`}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              background: 'rgba(0,0,0,0.15)',
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            {raw.slice(3, -3)}
          </code>
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        nodes.push(
          <strong key={`b-${key++}`} style={{ fontWeight: 700 }}>
            {raw.slice(1, -1)}
          </strong>
        );
      } else if (raw.startsWith('_') && raw.endsWith('_')) {
        nodes.push(
          <em key={`i-${key++}`} style={{ fontStyle: 'italic' }}>
            {raw.slice(1, -1)}
          </em>
        );
      } else if (raw.startsWith('~') && raw.endsWith('~')) {
        nodes.push(
          <span key={`s-${key++}`} style={{ textDecoration: 'line-through' }}>
            {raw.slice(1, -1)}
          </span>
        );
      }

      lastIndex = match.index + raw.length;
    }

    // Remaining text after last match
    if (lastIndex < line.length) {
      nodes.push(<span key={`t-${key++}`}>{line.slice(lastIndex)}</span>);
    }
  });

  return nodes;
}

/**
 * Pixel-perfect WhatsApp chat preview showing exactly how the post
 * will appear when pasted into a WhatsApp group.
 */
export function WhatsAppPreview({ result, room, bannerVariant, showBanner = true }: WhatsAppPreviewProps) {
  const formattedText = useMemo(() => parseWhatsAppFormatting(result.text), [result.text]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Banner dimensions for WhatsApp (standard image share)
  const bannerW = 1080;
  const bannerH = 1350;
  const previewW = 320;
  const bannerScale = previewW / bannerW;

  return (
    <div style={{
      background: '#0B141A',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid #1E2D3A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>
      {/* WhatsApp header bar */}
      <div style={{
        background: '#1F2C34',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid #2A3942',
      }}>
        {/* Back arrow */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>

        {/* Group avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, ${room.color}40, ${room.color}18)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0,
        }}>
          {room.icon}
        </div>

        {/* Group name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#E9EDEF',
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {room.label}
          </div>
          <div style={{
            color: '#8696A0',
            fontSize: 11,
          }}>
            tap here for group info
          </div>
        </div>

        {/* Header icons */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72" />
          </svg>
        </div>
      </div>

      {/* Chat wallpaper area */}
      <div style={{
        background: '#0B141A',
        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(30,45,58,0.4) 0%, transparent 60%)',
        padding: '10px 10px 6px',
        minHeight: 80,
      }}>
        {/* Message bubble */}
        <div style={{
          background: '#005C4B',
          borderRadius: '0 8px 8px 8px',
          maxWidth: previewW + 12,
          marginLeft: 0,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Chat bubble tail */}
          <div style={{
            position: 'absolute', top: 0, left: -6,
            width: 0, height: 0,
            borderTop: '0 solid transparent',
            borderRight: '8px solid #005C4B',
            borderBottom: '10px solid transparent',
          }} />

          {/* Banner image */}
          {showBanner && (
            <div style={{
              width: previewW + 12,
              height: bannerH * bannerScale + 6,
              overflow: 'hidden',
              padding: '3px 3px 0',
              borderRadius: '0 8px 0 0',
            }}>
              <div style={{
                width: previewW + 6,
                height: bannerH * bannerScale,
                borderRadius: '6px 6px 0 0',
                overflow: 'hidden',
              }}>
                <BannerPreview
                  result={result}
                  room={room}
                  variant={bannerVariant}
                  width={bannerW}
                  height={bannerH}
                  scale={bannerScale}
                />
              </div>
            </div>
          )}

          {/* Message text */}
          <div style={{
            padding: '6px 8px 2px',
            color: '#E9EDEF',
            fontSize: 13.5,
            lineHeight: 1.45,
            letterSpacing: '0.01em',
            wordBreak: 'break-word',
          }}>
            {formattedText}
          </div>

          {/* Timestamp + read receipts */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 3,
            padding: '0 8px 5px',
          }}>
            <span style={{
              color: 'rgba(233,237,239,0.45)',
              fontSize: 10.5,
              lineHeight: 1,
            }}>
              {timeStr}
            </span>
            {/* Double blue check */}
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              <path d="M11.071 0.929L4.5 7.5L1.929 4.929" stroke="#53BDEB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.071 0.929L7.5 7.5L6.5 6.5" stroke="#53BDEB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* WhatsApp input bar */}
      <div style={{
        background: '#1F2C34',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderTop: '1px solid #2A3942',
      }}>
        {/* Emoji icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" />
          <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" />
        </svg>

        {/* Input field */}
        <div style={{
          flex: 1,
          background: '#2A3942',
          borderRadius: 20,
          padding: '7px 14px',
          color: '#8696A0',
          fontSize: 13,
        }}>
          Type a message
        </div>

        {/* Mic icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1.5">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
    </div>
  );
}
