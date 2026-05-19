/**
 * generate-logo-png.js
 *
 * Renders the Sniper crosshair logo onto a 512×512 canvas and writes
 * it to public/logo.png (required by the TON Connect manifest).
 *
 * Usage:
 *   node scripts/generate-logo-png.js
 *
 * Requires the `canvas` package:
 *   npm install --save-dev canvas
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ────────────────────────────────────────────────────────────────
const SIZE       = 512;
const BG         = '#080B14';
const GREEN      = '#00FF41';
const FONT_MONO  = 'monospace';  // canvas built-in fallback
const OUT_PATH   = path.resolve(__dirname, '../public/logo.png');

// ─── Scale helpers (viewBox 0 0 100 100 → SIZE) ───────────────────────────
const s  = (/** @type {number} */ v) => (v / 100) * SIZE;   // scale value
const sp = (/** @type {number} */ v) => s(v);                // alias

// ─── Draw ─────────────────────────────────────────────────────────────────
const canvas = createCanvas(SIZE, SIZE);
const ctx    = canvas.getContext('2d');

// Background
ctx.fillStyle = BG;
ctx.fillRect(0, 0, SIZE, SIZE);

// ── Outer circle (opacity 0.6)
ctx.beginPath();
ctx.arc(sp(50), sp(50), sp(44), 0, Math.PI * 2);
ctx.strokeStyle = GREEN;
ctx.globalAlpha = 0.6;
ctx.lineWidth   = s(1.5);
ctx.stroke();

// ── Inner circle (opacity 0.4)
ctx.beginPath();
ctx.arc(sp(50), sp(50), sp(28), 0, Math.PI * 2);
ctx.strokeStyle = GREEN;
ctx.globalAlpha = 0.4;
ctx.lineWidth   = s(1);
ctx.stroke();

ctx.globalAlpha = 1;

// ── Center dot
ctx.beginPath();
ctx.arc(sp(50), sp(50), sp(4), 0, Math.PI * 2);
ctx.fillStyle = GREEN;
ctx.fill();

// ── Crosshair lines
const drawLine = (x1, y1, x2, y2) => {
  ctx.beginPath();
  ctx.moveTo(sp(x1), sp(y1));
  ctx.lineTo(sp(x2), sp(y2));
  ctx.strokeStyle = GREEN;
  ctx.globalAlpha = 1;
  ctx.lineWidth   = s(1.5);
  ctx.lineCap     = 'round';
  ctx.stroke();
};

drawLine(50, 6,  50, 20);   // Top
drawLine(50, 80, 50, 94);   // Bottom
drawLine(6,  50, 20, 50);   // Left
drawLine(80, 50, 94, 50);   // Right

// ── Corner brackets
const drawPath = (points, opacity = 0.7) => {
  ctx.beginPath();
  ctx.moveTo(sp(points[0][0]), sp(points[0][1]));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(sp(points[i][0]), sp(points[i][1]));
  }
  ctx.strokeStyle = GREEN;
  ctx.globalAlpha = opacity;
  ctx.lineWidth   = s(1.2);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
};

drawPath([[18, 30], [18, 18], [30, 18]]);   // top-left
drawPath([[70, 18], [82, 18], [82, 30]]);   // top-right
drawPath([[18, 70], [18, 82], [30, 82]]);   // bottom-left
drawPath([[70, 82], [82, 82], [82, 70]]);   // bottom-right

// ── "S" lettermark
ctx.globalAlpha = 1;
ctx.fillStyle   = GREEN;
ctx.font        = `700 ${s(16)}px ${FONT_MONO}`;
ctx.textAlign   = 'center';
ctx.textBaseline = 'middle';
ctx.letterSpacing = '-1px';
ctx.fillText('S', sp(50), sp(52));

// ─── Write output ─────────────────────────────────────────────────────────
const buffer = canvas.toBuffer('image/png');
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, buffer);

console.log(`✅  logo.png written → ${OUT_PATH}`);
console.log(`    Size: ${SIZE}×${SIZE}px | Background: ${BG} | Accent: ${GREEN}`);
