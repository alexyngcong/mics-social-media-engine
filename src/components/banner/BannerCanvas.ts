import type { GeneratedPost, Room } from '../../types';
import { tokens } from '../../config/designTokens';
import { brand, dateFormatted } from '../../config/brand';
import { getTemplate } from './templates';

const SCALE = 2;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
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
  const isLandscape = W > H;
  const isSquare = Math.abs(W - H) < 50;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Background gradient
  const bgColors = T.bgColors;
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bgGrad.addColorStop(0, bgColors[0]);
  bgGrad.addColorStop(0.5, bgColors[1]);
  bgGrad.addColorStop(1, bgColors[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Room color glow
  const g1 = ctx.createRadialGradient(W * 0.3, H * 0.25, 0, W * 0.3, H * 0.25, W * 0.37);
  g1.addColorStop(0, room.color + '20');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.7, H * 0.7, 0, W * 0.7, H * 0.7, W * 0.32);
  g2.addColorStop(0, tokens.colors.bronze + '15');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Decorative orbs
  ctx.lineWidth = 1;
  for (const orb of T.orbs) {
    const ox = (parseFloat(orb.left) / 100) * W;
    const oy = (parseFloat(orb.top) / 100) * H;
    ctx.strokeStyle = orb.color;
    ctx.globalAlpha = orb.opacity * 2;
    ctx.beginPath();
    ctx.arc(ox + orb.size / 2, oy + orb.size / 2, orb.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Left bar accent
  if (T.leftBar) {
    ctx.fillStyle = room.color;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, 6, H);
    ctx.globalAlpha = 1;
  }

  // Header band
  const headerH = isLandscape ? H * 0.18 : H * 0.11;
  const hGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  hGrad.addColorStop(0, 'rgba(6,6,16,0.95)');
  hGrad.addColorStop(1, 'rgba(6,6,16,0.5)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, headerH);

  // Gold accent line
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, tokens.colors.bronze);
  accentGrad.addColorStop(0.5, tokens.colors.bronzeLight);
  accentGrad.addColorStop(1, tokens.colors.bronze);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, headerH - 3, W, 3);

  // Header text - scale based on dimensions
  const baseFontScale = W / 1080;
  const px = W * 0.052;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${16 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.name.toUpperCase(), px, headerH * 0.35);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `300 ${12 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.tagline, px, headerH * 0.5);

  ctx.fillStyle = room.color;
  ctx.font = `700 ${13 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(room.icon + ' ' + room.short.toUpperCase(), px, headerH * 0.78);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = `300 ${13 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(dateFormatted.short, W - px, headerH * 0.78);

  ctx.fillStyle = tokens.colors.bronze + '90';
  ctx.font = `700 ${10 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText('CFOs PRIVATE', W - px, headerH * 0.32);
  ctx.fillText('INSIGHTS CIRCLE', W - px, headerH * 0.45);

  // Content area - adaptive layout
  ctx.textAlign = 'center';
  const contentStartY = headerH + (isLandscape ? H * 0.08 : H * 0.12);

  // Stat block
  const statFontSize = isLandscape ? 80 : isSquare ? 90 : 120;
  const statY = contentStartY + statFontSize * 0.8;
  ctx.fillStyle = T.statColor;
  ctx.font = `700 ${statFontSize * baseFontScale}px Georgia,serif`;
  ctx.shadowColor = room.color + '30';
  ctx.shadowBlur = 40;
  ctx.fillText(result.stat || '--', W / 2, statY);
  ctx.shadowBlur = 0;

  // Stat label
  ctx.fillStyle = tokens.colors.bronzeLight;
  ctx.font = `700 ${16 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText((result.statLabel || '').toUpperCase(), W / 2, statY + 45 * baseFontScale);

  // Direction indicator
  const dir = result.statDirection || 'neutral';
  const dirColor = dir === 'up' ? '#22C55E' : dir === 'down' ? '#EF4444' : '#94A3B8';
  const dirText = dir === 'up' ? '\u25B2 UP' : dir === 'down' ? '\u25BC DOWN' : '\u25CF STABLE';
  ctx.fillStyle = dirColor;
  ctx.font = `700 ${14 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(dirText, W / 2, statY + 75 * baseFontScale);

  // Divider
  const divY = statY + 105 * baseFontScale;
  const divGrad = ctx.createLinearGradient(W * 0.15, 0, W * 0.85, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, tokens.colors.bronzeLight);
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, divY);
  ctx.lineTo(W * 0.85, divY);
  ctx.stroke();

  // Diamond on divider
  ctx.fillStyle = tokens.colors.bronzeLight;
  ctx.save();
  ctx.translate(W / 2, divY);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();

  // Headline
  const hlFontSize = T.headlineSize * 1.4 * baseFontScale;
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${hlFontSize}px Georgia,serif`;
  const hlLines = wrapText(ctx, result.headline || 'INTELLIGENCE BRIEF', W - 160 * baseFontScale);
  let hlY = divY + 55 * baseFontScale;
  for (const line of hlLines) {
    ctx.fillText(line, W / 2, hlY);
    hlY += hlFontSize * 1.35;
  }

  // Subline
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `300 ${18 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  const subLines = wrapText(ctx, result.subline || '', W - 200 * baseFontScale);
  let subY = hlY + 20 * baseFontScale;
  for (const line of subLines) {
    ctx.fillText(line, W / 2, subY);
    subY += 28 * baseFontScale;
  }

  // Corner brackets
  ctx.strokeStyle = tokens.colors.bronzeLight + '40';
  ctx.lineWidth = 1;
  const cornerPairs: [number, number, number, number][] = [
    [40, headerH + 20, 1, 1],
    [W - 40, headerH + 20, -1, 1],
    [40, H - 80, 1, -1],
    [W - 40, H - 80, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of cornerPairs) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 20 * dy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 20 * dx, cy);
    ctx.stroke();
  }

  // Footer
  const footerH = isLandscape ? H * 0.1 : H * 0.058;
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, H - footerH - 2, W, 2);
  ctx.fillStyle = 'rgba(6,6,16,0.95)';
  ctx.fillRect(0, H - footerH, W, footerH);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `600 ${12 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.community, W / 2, H - footerH * 0.55);
  ctx.fillStyle = tokens.colors.bronze + '70';
  ctx.font = `300 ${11 * baseFontScale}px 'Segoe UI',system-ui,sans-serif`;
  ctx.fillText(brand.footer, W / 2, H - footerH * 0.2);

  return canvas;
}
