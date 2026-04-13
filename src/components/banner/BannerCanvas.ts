import type { GeneratedPost, Room } from '../../types';
import { tokens } from '../../config/designTokens';
import { brand, dateFormatted } from '../../config/brand';
import { getTemplate } from './templates';

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

function drawGeometricPattern(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  // Diagonal grid lines
  for (let i = -H; i < W + H; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  for (let i = -H; i < W + H; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i + H, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHexagonRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawDataDots(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  ctx.save();
  // Simulated mini chart dots
  const points = [0.3, 0.5, 0.4, 0.7, 0.6, 0.85, 0.75, 0.9, 0.8, 0.95];
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const px = x + (i / (points.length - 1)) * w;
    const py = y + (1 - points[i]) * 30;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Glow under the line
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = color;
  ctx.lineTo(x + w, y + 30);
  ctx.lineTo(x, y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBannerCanvas(
  result: GeneratedPost,
  room: Room,
  variant: number,
  width: number = 1080,
  height: number = 1350
): HTMLCanvasElement | null {
  if (!result || !room) return null;

  const T = getTemplate(variant, room.color, tokens.colors.bronze);
  const W = width;
  const H = height;
  const S = SCALE;
  const fs = W / 1080; // font scale

  const canvas = document.createElement('canvas');
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(S, S);

  // === BACKGROUND ===
  const bgColors = T.bgColors;
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.2, H);
  bgGrad.addColorStop(0, bgColors[0]);
  bgGrad.addColorStop(0.4, bgColors[1]);
  bgGrad.addColorStop(1, bgColors[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Room color ambient glow
  const g1 = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, W * 0.5);
  g1.addColorStop(0, hexToRgba(room.color, 0.08));
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.8, H * 0.6, 0, W * 0.8, H * 0.6, W * 0.4);
  g2.addColorStop(0, hexToRgba(tokens.colors.bronze, 0.06));
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Geometric pattern overlay
  drawGeometricPattern(ctx, W, H, room.color);

  // Hexagon decorations
  drawHexagonRing(ctx, W * 0.85, H * 0.15, 80 * fs, room.color, 0.06);
  drawHexagonRing(ctx, W * 0.85, H * 0.15, 120 * fs, room.color, 0.03);
  drawHexagonRing(ctx, W * 0.1, H * 0.7, 60 * fs, tokens.colors.bronze, 0.05);
  drawHexagonRing(ctx, W * 0.1, H * 0.7, 100 * fs, tokens.colors.bronze, 0.025);

  // Left accent bar
  if (T.leftBar) {
    const barGrad = ctx.createLinearGradient(0, 0, 0, H);
    barGrad.addColorStop(0, hexToRgba(room.color, 0));
    barGrad.addColorStop(0.3, hexToRgba(room.color, 0.4));
    barGrad.addColorStop(0.7, hexToRgba(room.color, 0.4));
    barGrad.addColorStop(1, hexToRgba(room.color, 0));
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, 5, H);
  }

  // === HEADER BAND ===
  const headerH = H * 0.105;
  const hGrad = ctx.createLinearGradient(0, 0, 0, headerH + 30);
  hGrad.addColorStop(0, 'rgba(4,4,12,0.98)');
  hGrad.addColorStop(1, 'rgba(4,4,12,0.3)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, headerH + 30);

  // Gold accent line under header
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, hexToRgba(tokens.colors.bronze, 0.1));
  accentGrad.addColorStop(0.3, tokens.colors.bronzeLight);
  accentGrad.addColorStop(0.7, tokens.colors.bronzeLight);
  accentGrad.addColorStop(1, hexToRgba(tokens.colors.bronze, 0.1));
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, headerH, W, 2.5);

  // Header content
  const px = 52 * fs;

  // Brand name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${17 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.letterSpacing = '3px';
  ctx.fillText('MICS INTERNATIONAL', px, headerH * 0.38);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `300 ${11 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.tagline, px, headerH * 0.55);

  // Room badge
  ctx.fillStyle = hexToRgba(room.color, 0.12);
  const badgeW = ctx.measureText(room.icon + ' ' + room.short.toUpperCase()).width + 28 * fs;
  const badgeX = px - 4;
  const badgeY = headerH * 0.67;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY - 10 * fs, badgeW, 22 * fs, 4);
  ctx.fill();
  ctx.fillStyle = room.color;
  ctx.font = `700 ${12 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(room.icon + '  ' + room.short.toUpperCase(), px, headerH * 0.72);

  // Right side - community label + date
  ctx.textAlign = 'right';
  ctx.fillStyle = hexToRgba(tokens.colors.bronzeLight, 0.6);
  ctx.font = `700 ${9 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText('CFOs PRIVATE INSIGHTS CIRCLE', W - px, headerH * 0.38);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = `300 ${11 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(dateFormatted.short, W - px, headerH * 0.72);

  // === MAIN CONTENT AREA ===
  ctx.textAlign = 'center';

  // Stat section with background panel
  const statPanelY = headerH + H * 0.08;
  const statPanelH = H * 0.22;

  // Subtle panel behind stat
  ctx.fillStyle = hexToRgba(room.color, 0.03);
  ctx.beginPath();
  ctx.roundRect(W * 0.1, statPanelY, W * 0.8, statPanelH, 16);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(room.color, 0.08);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Mini data chart behind stat
  drawDataDots(ctx, W * 0.15, statPanelY + statPanelH * 0.12, W * 0.7, room.color);

  // Main stat number
  const statFontSize = Math.min(110, 100 * fs);
  const statY = statPanelY + statPanelH * 0.55;
  ctx.fillStyle = T.statColor;
  ctx.font = `700 ${statFontSize}px Georgia,serif`;
  ctx.shadowColor = hexToRgba(room.color, 0.25);
  ctx.shadowBlur = 60;
  ctx.fillText(result.stat || '--', W / 2, statY);
  ctx.shadowBlur = 0;

  // Stat label
  ctx.fillStyle = tokens.colors.bronzeLight;
  ctx.font = `700 ${14 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText((result.statLabel || '').toUpperCase(), W / 2, statY + 35 * fs);

  // Direction badge
  const dir = result.statDirection || 'neutral';
  const dirColor = dir === 'up' ? '#22C55E' : dir === 'down' ? '#EF4444' : '#94A3B8';
  const dirText = dir === 'up' ? '\u25B2  TRENDING UP' : dir === 'down' ? '\u25BC  DECLINING' : '\u25CF  HOLDING STEADY';
  const dirBadgeW = 140 * fs;
  ctx.fillStyle = hexToRgba(dirColor, 0.12);
  ctx.beginPath();
  ctx.roundRect(W / 2 - dirBadgeW / 2, statY + 48 * fs, dirBadgeW, 24 * fs, 12);
  ctx.fill();
  ctx.fillStyle = dirColor;
  ctx.font = `700 ${11 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(dirText, W / 2, statY + 64 * fs);

  // === DIVIDER SECTION ===
  const divY = statPanelY + statPanelH + H * 0.04;

  // Elegant divider with side decorations
  const divGrad = ctx.createLinearGradient(W * 0.08, 0, W * 0.92, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.15, hexToRgba(tokens.colors.bronzeLight, 0.3));
  divGrad.addColorStop(0.5, tokens.colors.bronzeLight);
  divGrad.addColorStop(0.85, hexToRgba(tokens.colors.bronzeLight, 0.3));
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.08, divY);
  ctx.lineTo(W * 0.92, divY);
  ctx.stroke();

  // Center diamond
  ctx.fillStyle = tokens.colors.bronzeLight;
  ctx.save();
  ctx.translate(W / 2, divY);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();

  // Side dots
  ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.arc(W * 0.15, divY, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.85, divY, 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // === HEADLINE SECTION ===
  const headlineY = divY + 45 * fs;
  const hlSize = T.headlineSize * 1.5 * fs;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${hlSize}px Georgia,serif`;
  const hlLines = wrapText(ctx, result.headline || 'INTELLIGENCE BRIEF', W - 140 * fs);
  let hlY = headlineY;
  for (const line of hlLines) {
    ctx.fillText(line, W / 2, hlY);
    hlY += hlSize * 1.3;
  }

  // Subline
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `400 ${16 * fs}px 'Segoe UI',system-ui,sans-serif`;
  const subLines = wrapText(ctx, result.subline || '', W - 180 * fs);
  let subY = hlY + 18 * fs;
  for (const line of subLines) {
    ctx.fillText(line, W / 2, subY);
    subY += 26 * fs;
  }

  // === SOURCE ATTRIBUTION ===
  if (result.source) {
    const srcY = subY + 30 * fs;
    ctx.fillStyle = hexToRgba(tokens.colors.bronze, 0.4);
    ctx.font = `600 ${10 * fs}px 'Segoe UI',system-ui,sans-serif`;
    ctx.fillText('SOURCE: ' + result.source.toUpperCase(), W / 2, srcY);
  }

  // === CORNER BRACKETS (premium detail) ===
  ctx.strokeStyle = hexToRgba(tokens.colors.bronzeLight, 0.2);
  ctx.lineWidth = 1.5;
  const cm = 32; // corner margin
  const cl = 24; // corner length
  // Top-left
  ctx.beginPath(); ctx.moveTo(cm, headerH + cm + cl); ctx.lineTo(cm, headerH + cm); ctx.lineTo(cm + cl, headerH + cm); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(W - cm, headerH + cm + cl); ctx.lineTo(W - cm, headerH + cm); ctx.lineTo(W - cm - cl, headerH + cm); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(cm, H - 78 - cm - cl); ctx.lineTo(cm, H - 78 - cm); ctx.lineTo(cm + cl, H - 78 - cm); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - cm, H - 78 - cm - cl); ctx.lineTo(W - cm, H - 78 - cm); ctx.lineTo(W - cm - cl, H - 78 - cm); ctx.stroke();

  // === FOOTER ===
  const footerH = 76 * fs;

  // Footer separator
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, H - footerH - 2, W, 2);

  // Footer background
  ctx.fillStyle = 'rgba(4,4,12,0.97)';
  ctx.fillRect(0, H - footerH, W, footerH);

  // Footer content
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 ${12 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.community, W / 2, H - footerH * 0.58);

  ctx.fillStyle = hexToRgba(tokens.colors.bronze, 0.45);
  ctx.font = `300 ${10 * fs}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.footer, W / 2, H - footerH * 0.25);

  // Small room color accent dot in footer
  ctx.fillStyle = room.color;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(W / 2, H - footerH * 0.85, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  return canvas;
}
