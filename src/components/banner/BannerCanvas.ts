import type { GeneratedPost, Room, RoomId, PhotoLayout } from '../../types';
import { tokens } from '../../config/designTokens';
import { dateFormatted } from '../../config/brand';
import { getTemplate } from './templates';
import { getPhotoForTopic } from '../../config/stockPhotos';
import { loadImage } from '../../services/imageLoader';

const SCALE = 2;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Photo cover (object-fit: cover equivalent) ─────────────────

function drawPhotoCover(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number
) {
  const imgRatio = img.width / img.height;
  const destRatio = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > destRatio) { sw = img.height * destRatio; sx = (img.width - sw) / 2; }
  else { sh = img.width / destRatio; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ─── Photo background compositing ──────────────────────────────

function drawPhotoFullbleed(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  W: number, H: number, opacity: number, roomColor: string
) {
  drawPhotoCover(ctx, img, 0, 0, W, H);
  // Cinematic gradient - heavier at bottom for text
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgba(4,4,12,${opacity * 0.15})`);
  grad.addColorStop(0.25, `rgba(4,4,12,${opacity * 0.3})`);
  grad.addColorStop(0.5, `rgba(4,4,12,${opacity * 0.55})`);
  grad.addColorStop(0.75, `rgba(4,4,12,${opacity * 0.85})`);
  grad.addColorStop(1, `rgba(4,4,12,0.96)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Colored ambient
  ctx.fillStyle = hexToRgba(roomColor, 0.04);
  ctx.fillRect(0, 0, W, H);
}

function drawPhotoSplit(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  W: number, H: number, side: 'left' | 'right', opacity: number, roomColor: string
) {
  const photoW = W * 0.52;
  const photoX = side === 'right' ? W - photoW : 0;
  ctx.fillStyle = '#060610';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(photoX, 0, photoW, H); ctx.clip();
  drawPhotoCover(ctx, img, photoX, 0, photoW, H);
  const fadeDir = side === 'right'
    ? ctx.createLinearGradient(photoX + photoW, 0, photoX, 0)
    : ctx.createLinearGradient(photoX, 0, photoX + photoW, 0);
  fadeDir.addColorStop(0, `rgba(6,6,16,${opacity})`);
  fadeDir.addColorStop(0.5, `rgba(6,6,16,${opacity * 0.4})`);
  fadeDir.addColorStop(1, 'rgba(6,6,16,0.05)');
  ctx.fillStyle = fadeDir;
  ctx.fillRect(photoX, 0, photoW, H);
  ctx.restore();
  const glow = ctx.createRadialGradient(
    side === 'right' ? W * 0.22 : W * 0.78, H * 0.4, 0,
    side === 'right' ? W * 0.22 : W * 0.78, H * 0.4, W * 0.3
  );
  glow.addColorStop(0, hexToRgba(roomColor, 0.06));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawPhotoDuotone(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  W: number, H: number, duotoneColor: string, opacity: number
) {
  drawPhotoCover(ctx, img, 0, 0, W, H);
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = duotoneColor;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgba(4,4,12,${opacity * 0.2})`);
  grad.addColorStop(0.45, `rgba(4,4,12,${opacity * 0.5})`);
  grad.addColorStop(0.75, `rgba(4,4,12,${opacity * 0.85})`);
  grad.addColorStop(1, 'rgba(4,4,12,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawPhotoFrosted(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  W: number, H: number, opacity: number, roomColor: string
) {
  drawPhotoCover(ctx, img, 0, 0, W, H);
  ctx.fillStyle = `rgba(4,4,12,${opacity})`;
  ctx.fillRect(0, 0, W, H);
  const panelPad = W * 0.06;
  const panelY = H * 0.12;
  const panelW = W - panelPad * 2;
  const panelH = H * 0.74;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(panelPad, panelY, panelW, panelH, 24); ctx.clip();
  const prevFilter = ctx.filter;
  ctx.filter = 'blur(40px) brightness(0.5)';
  drawPhotoCover(ctx, img, 0, 0, W, H);
  ctx.filter = prevFilter || 'none';
  ctx.fillStyle = 'rgba(10,10,24,0.6)';
  ctx.fillRect(panelPad, panelY, panelW, panelH);
  ctx.restore();
  ctx.strokeStyle = hexToRgba(roomColor, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(panelPad, panelY, panelW, panelH, 24); ctx.stroke();
}

function drawPhotoVignette(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  W: number, H: number, opacity: number, roomColor: string
) {
  drawPhotoCover(ctx, img, 0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H * 0.3, W * 0.12, W / 2, H * 0.35, W * 0.7);
  vig.addColorStop(0, `rgba(4,4,12,${opacity * 0.1})`);
  vig.addColorStop(0.35, `rgba(4,4,12,${opacity * 0.45})`);
  vig.addColorStop(0.65, `rgba(4,4,12,${opacity * 0.8})`);
  vig.addColorStop(1, 'rgba(4,4,12,0.97)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.25, 0, W / 2, H * 0.25, W * 0.25);
  glow.addColorStop(0, hexToRgba(roomColor, 0.07));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

// ─── Gradient fallback background ───────────────────────────────

function drawGradientBackground(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  bgColors: string[], roomColor: string
) {
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.2, H);
  bgGrad.addColorStop(0, bgColors[0]);
  bgGrad.addColorStop(0.4, bgColors[1]);
  bgGrad.addColorStop(1, bgColors[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, W * 0.5);
  g1.addColorStop(0, hexToRgba(roomColor, 0.08));
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);
  // Subtle grid
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.strokeStyle = roomColor;
  ctx.lineWidth = 0.5;
  for (let i = -H; i < W + H; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + H, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  ctx.restore();
}

// ─── Creative content rendering ─────────────────────────────────

function drawCreativeContent(
  ctx: CanvasRenderingContext2D,
  result: GeneratedPost,
  room: Room,
  W: number, H: number, fs: number,
  T: ReturnType<typeof getTemplate>,
  layout: PhotoLayout
) {
  const isSplit = layout === 'split-left' || layout === 'split-right';
  const cx = isSplit ? (layout === 'split-right' ? W * 0.24 : W * 0.76) : W / 2;
  const maxW = isSplit ? W * 0.4 : W * 0.78;

  // ── Top: Minimal room indicator (no brand name) ──
  // Thin accent line at very top
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, 'transparent');
  accentGrad.addColorStop(0.3, hexToRgba(room.color, 0.5));
  accentGrad.addColorStop(0.7, hexToRgba(room.color, 0.5));
  accentGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 3);

  // Room icon + label, very small, top-left
  ctx.textAlign = 'left';
  ctx.fillStyle = hexToRgba(room.color, 0.6);
  ctx.font = `600 ${11 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(room.icon + '  ' + room.short.toUpperCase(), 40 * fs, 36 * fs);

  // Date, top-right
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = `300 ${10 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(dateFormatted.short, W - 40 * fs, 36 * fs);

  // ── THE STAT: Large, immersive, blended into the scene ──
  ctx.textAlign = 'center';

  // Giant stat number - positioned in the photo zone (upper half)
  const statSize = Math.min(isSplit ? 100 : 150, (isSplit ? 90 : 140) * fs);
  const statY = H * 0.30;

  // Stat glow halo behind text (makes it feel like it's PART of the image)
  const statGlow = ctx.createRadialGradient(cx, statY - 10, 0, cx, statY - 10, statSize * 1.5);
  statGlow.addColorStop(0, hexToRgba(room.color, 0.12));
  statGlow.addColorStop(0.5, hexToRgba(room.color, 0.04));
  statGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = statGlow;
  ctx.fillRect(0, 0, W, H);

  // Draw stat with depth: soft shadow layer first
  ctx.font = `800 ${statSize}px Georgia,serif`;
  ctx.fillStyle = hexToRgba(room.color, 0.08);
  ctx.fillText(result.stat || '--', cx + 3, statY + 3);

  // Main stat
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = hexToRgba(room.color, 0.35);
  ctx.shadowBlur = 80;
  ctx.shadowOffsetY = 4;
  ctx.fillText(result.stat || '--', cx, statY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Stat label directly under the number, tightly coupled
  ctx.fillStyle = hexToRgba(tokens.colors.bronzeLight, 0.7);
  ctx.font = `600 ${13 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.letterSpacing = `${4 * fs}px`;
  ctx.fillText((result.statLabel || '').toUpperCase(), cx, statY + 40 * fs);
  ctx.letterSpacing = '0px';

  // Direction indicator - minimal, just a colored line + text
  const dir = result.statDirection || 'neutral';
  const dirColor = dir === 'up' ? '#22C55E' : dir === 'down' ? '#EF4444' : '#64748B';
  const dirArrow = dir === 'up' ? '\u25B2' : dir === 'down' ? '\u25BC' : '\u2022';
  const dirLabel = dir === 'up' ? 'RISING' : dir === 'down' ? 'FALLING' : 'STABLE';

  ctx.fillStyle = dirColor;
  ctx.font = `700 ${10 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(dirArrow + '  ' + dirLabel, cx, statY + 62 * fs);

  // ── DIVIDER: Organic, asymmetric ──
  const divY = H * 0.48;
  // Left accent dash
  ctx.strokeStyle = hexToRgba(room.color, 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 60 * fs, divY);
  ctx.lineTo(cx - 15 * fs, divY);
  ctx.stroke();
  // Right accent dash
  ctx.beginPath();
  ctx.moveTo(cx + 15 * fs, divY);
  ctx.lineTo(cx + 60 * fs, divY);
  ctx.stroke();
  // Center dot
  ctx.fillStyle = room.color;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(cx, divY, 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // ── HEADLINE: Bold, cinematic ──
  const hlY = divY + 50 * fs;
  const hlSize = T.headlineSize * (isSplit ? 1.2 : 1.6) * fs;

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${hlSize}px Georgia,serif`;
  const hlLines = wrapText(ctx, result.headline || 'INTELLIGENCE BRIEF', maxW);
  let currentY = hlY;
  for (const line of hlLines) {
    // Subtle text shadow for depth
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(line, cx + 1, currentY + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, cx, currentY);
    currentY += hlSize * 1.25;
  }

  // ── SUBLINE: Lighter, informational ──
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `300 ${15 * fs}px 'Segoe UI',system-ui,sans-serif`;
  const subLines = wrapText(ctx, result.subline || '', maxW - 30 * fs);
  let subY = currentY + 16 * fs;
  for (const line of subLines) {
    ctx.fillText(line, cx, subY);
    subY += 24 * fs;
  }

  // ── SOURCE: Tiny, discreet ──
  if (result.source) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = `400 ${9 * fs}px 'Segoe UI',system-ui,sans-serif`;
    ctx.fillText(result.source.toUpperCase(), cx, subY + 28 * fs);
  }

  // ── BOTTOM: Minimal, anonymous ──
  // Thin accent line above footer
  const footerLineY = H - 52 * fs;
  const footGrad = ctx.createLinearGradient(W * 0.15, 0, W * 0.85, 0);
  footGrad.addColorStop(0, 'transparent');
  footGrad.addColorStop(0.3, hexToRgba(room.color, 0.2));
  footGrad.addColorStop(0.7, hexToRgba(room.color, 0.2));
  footGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = footGrad;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, footerLineY);
  ctx.lineTo(W * 0.85, footerLineY);
  ctx.stroke();

  // Anonymous tag line
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = `300 ${9 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText('PRIVATE INTELLIGENCE', cx, H - 28 * fs);

  // Room color dot
  ctx.fillStyle = room.color;
  ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.arc(cx, H - 14 * fs, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── Main entry point ───────────────────────────────────────────

export async function drawBannerCanvas(
  result: GeneratedPost,
  room: Room,
  variant: number,
  width: number = 1080,
  height: number = 1350
): Promise<HTMLCanvasElement | null> {
  if (!result || !room) return null;

  const T = getTemplate(variant, room.color, tokens.colors.bronze);
  const W = width;
  const H = height;
  const S = SCALE;
  const fs = W / 1080;
  const layout = T.photoLayout;

  const canvas = document.createElement('canvas');
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(S, S);

  // Load topic-matched photo
  const topicText = [result.headline, result.subline, result.statLabel].filter(Boolean).join(' ');
  let photo: HTMLImageElement | null = null;
  photo = await loadImage(getPhotoForTopic(topicText, room.id as RoomId, variant));

  // === BACKGROUND ===
  if (photo) {
    const ov = T.photoOverlayOpacity ?? 0.5;
    switch (layout) {
      case 'fullbleed': drawPhotoFullbleed(ctx, photo, W, H, ov, room.color); break;
      case 'split-left':
      case 'split-right': drawPhotoSplit(ctx, photo, W, H, layout === 'split-left' ? 'left' : 'right', ov, room.color); break;
      case 'duotone': drawPhotoDuotone(ctx, photo, W, H, T.photoDuotoneColor || room.color, ov); break;
      case 'frosted': drawPhotoFrosted(ctx, photo, W, H, ov, room.color); break;
      case 'vignette': drawPhotoVignette(ctx, photo, W, H, ov, room.color); break;
      default: drawPhotoFullbleed(ctx, photo, W, H, ov, room.color); break;
    }
  } else {
    // Fallback only if image fails to load
    drawGradientBackground(ctx, W, H, T.bgColors, room.color);
  }

  // Left accent bar
  if (T.leftBar) {
    const barGrad = ctx.createLinearGradient(0, 0, 0, H);
    barGrad.addColorStop(0, hexToRgba(room.color, 0));
    barGrad.addColorStop(0.3, hexToRgba(room.color, 0.35));
    barGrad.addColorStop(0.7, hexToRgba(room.color, 0.35));
    barGrad.addColorStop(1, hexToRgba(room.color, 0));
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, 4, H);
  }

  // === CONTENT ===
  drawCreativeContent(ctx, result, room, W, H, fs, T, layout);

  return canvas;
}
