import { useMemo } from 'react';
import type { GeneratedPost, Room } from '../../types';
import { BannerPreview } from '../banner/BannerPreview';

interface WhatsAppPreviewProps {
  result: GeneratedPost;
  room: Room;
  bannerVariant: number;
  showBanner?: boolean;
}

/**
 * Parses WhatsApp formatting within a single line.
 * Handles *bold*, _italic_, ~strikethrough~, ```mono```
 */
function formatLine(line: string, keyBase: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = keyBase;
  const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`t${key++}`}>{line.slice(lastIndex, match.index)}</span>);
    }
    const raw = match[0];
    if (raw.startsWith('```') && raw.endsWith('```')) {
      nodes.push(
        <code key={`c${key++}`} style={{
          fontFamily: 'monospace', fontSize: 12,
          background: 'rgba(0,0,0,0.18)', padding: '1px 4px', borderRadius: 3,
        }}>
          {raw.slice(3, -3)}
        </code>
      );
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      nodes.push(<strong key={`b${key++}`}>{raw.slice(1, -1)}</strong>);
    } else if (raw.startsWith('_') && raw.endsWith('_')) {
      nodes.push(<em key={`i${key++}`}>{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith('~') && raw.endsWith('~')) {
      nodes.push(<del key={`s${key++}`}>{raw.slice(1, -1)}</del>);
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < line.length) {
    nodes.push(<span key={`t${key++}`}>{line.slice(lastIndex)}</span>);
  }
  return nodes;
}

/**
 * Splits text into paragraphs (double newline) and lines (single newline),
 * then applies WhatsApp inline formatting. Returns proper block-level elements
 * with real paragraph spacing like WhatsApp actually renders.
 */
/**
 * Auto-breaks a wall of text into paragraphs by splitting after sentences
 * that end with . or ? or ! followed by a space and a capital letter or *.
 * Only used as fallback when the AI doesn't include \n\n breaks.
 */
function autoParagraph(text: string): string {
  // If text already has paragraph breaks, return as-is
  if (text.includes('\n\n')) return text;

  // Split after sentence-ending punctuation followed by space + uppercase/formatting
  // Insert \n\n every ~2-3 sentences (target ~60-80 chars per paragraph)
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z*_~])/);
  if (sentences.length <= 2) return text;

  const paragraphs: string[] = [];
  let current = '';
  let sentenceCount = 0;

  for (const sentence of sentences) {
    current += (current ? ' ' : '') + sentence;
    sentenceCount++;

    // Break into paragraph every 2-3 sentences or if chunk is long enough
    if (sentenceCount >= 2 && current.length > 80) {
      paragraphs.push(current);
      current = '';
      sentenceCount = 0;
    }
  }
  if (current) paragraphs.push(current);

  return paragraphs.join('\n\n');
}

function parseWhatsAppText(text: string): React.ReactNode[] {
  // Auto-paragraph fallback for wall-of-text outputs
  const processedText = autoParagraph(text);

  // Split on double newlines to get paragraphs
  const paragraphs = processedText.split(/\n\n+/);
  let globalKey = 0;

  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    const lineNodes: React.ReactNode[] = [];

    lines.forEach((line, lIdx) => {
      if (lIdx > 0) lineNodes.push(<br key={`br${globalKey++}`} />);
      const formatted = formatLine(line, globalKey);
      globalKey += formatted.length + 1;
      lineNodes.push(...formatted);
    });

    return (
      <p key={`p${pIdx}`} style={{ margin: 0, marginBottom: pIdx < paragraphs.length - 1 ? 10 : 0 }}>
        {lineNodes}
      </p>
    );
  });
}

export function WhatsAppPreview({ result, room, bannerVariant, showBanner = true }: WhatsAppPreviewProps) {
  const formattedText = useMemo(() => parseWhatsAppText(result.text), [result.text]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // WhatsApp constrains shared images to ~260px max height in chat bubble
  const bubbleW = 330;
  const bannerW = 1080;
  const bannerH = 1080; // Use square crop for chat preview (WhatsApp crops tall images)
  const imgMaxH = 260;
  const bannerScale = bubbleW / bannerW;
  const scaledH = Math.min(bannerH * bannerScale, imgMaxH);

  return (
    <div style={{
      background: '#0B141A',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid #1E2D3A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>
      {/* ── WhatsApp Header Bar ── */}
      <div style={{
        background: '#1F2C34',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid #2A3942',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, ${room.color}40, ${room.color}18)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0,
        }}>
          {room.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E9EDEF', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {room.label}
          </div>
          <div style={{ color: '#8696A0', fontSize: 11 }}>tap here for group info</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72" />
          </svg>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div style={{
        background: '#0B141A',
        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(30,45,58,0.4) 0%, transparent 60%)',
        padding: '10px 10px 6px',
      }}>
        {/* Outgoing bubble */}
        <div style={{
          background: '#005C4B',
          borderRadius: '0 8px 8px 8px',
          maxWidth: bubbleW,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Tail */}
          <div style={{
            position: 'absolute', top: 0, left: -6, width: 0, height: 0,
            borderRight: '8px solid #005C4B', borderBottom: '10px solid transparent',
          }} />

          {/* ── Banner Image (cropped to WhatsApp proportions) ── */}
          {showBanner && (
            <div style={{
              width: bubbleW,
              height: scaledH,
              overflow: 'hidden',
              padding: '3px 3px 0',
            }}>
              <div style={{
                width: bubbleW - 6,
                height: scaledH - 3,
                borderRadius: '6px 6px 0 0',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Render at full resolution then clip to the stat/headline zone */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) scale(${bannerScale})`,
                  transformOrigin: 'center center',
                  width: 1080,
                  height: 1350,
                }}>
                  <BannerPreview
                    result={result}
                    room={room}
                    variant={bannerVariant}
                    width={1080}
                    height={1350}
                    scale={1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Message Text ── */}
          <div style={{
            padding: '8px 10px 3px',
            color: '#E9EDEF',
            fontSize: 14,
            lineHeight: 1.5,
            letterSpacing: '0.01em',
            wordBreak: 'break-word',
          }}>
            {formattedText}
          </div>

          {/* ── Timestamp + Blue Ticks ── */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 3, padding: '2px 8px 5px',
          }}>
            <span style={{ color: 'rgba(233,237,239,0.45)', fontSize: 10.5, lineHeight: 1 }}>
              {timeStr}
            </span>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              <path d="M11.071 0.929L4.5 7.5L1.929 4.929" stroke="#53BDEB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.071 0.929L7.5 7.5L6.5 6.5" stroke="#53BDEB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        background: '#1F2C34',
        padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '1px solid #2A3942',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" />
        </svg>
        <div style={{ flex: 1, background: '#2A3942', borderRadius: 20, padding: '7px 14px', color: '#8696A0', fontSize: 13 }}>
          Type a message
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1.5">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
    </div>
  );
}
