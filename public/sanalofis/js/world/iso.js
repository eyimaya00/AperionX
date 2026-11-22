// İzometrik (2:1) izdüşüm ve çizim yardımcıları. Oyun mantığı düz 2B kalır; yalnızca çizim izdüşürülür.
import { WORLD } from '../config.js';

export const K = 0.72;
export const WALL_H = 160, ROOM_H = 66;
export const OX = Math.round(WORLD.h * K + 80), OY = 210;
export const SW = Math.ceil((WORLD.w + WORLD.h) * K + 160);
export const SH = Math.ceil((WORLD.w + WORLD.h) * K / 2 + OY + 90);

export const px = (x, y) => OX + (x - y) * K;
export const py = (x, y, z = 0) => OY + (x + y) * K / 2 - z;
export const P = (x, y, z = 0) => [px(x, y), py(x, y, z)];

// Ekran (sahne) noktasını zemin düzlemindeki dünya konumuna çevirir.
export function unproject(sx, sy) {
  const u = (sx - OX) / K, v = (sy - OY) * 2 / K;
  return { x: (u + v) / 2, y: (v - u) / 2 };
}

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = s => Math.min(255, Math.round(((n >> s) & 255) * f));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function poly(c, pts, fill, stroke, lw = 1) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}

// Dikdörtgen prizma: üst, güney ve doğu yüzleri görünür. o.top/south/east renkleri ezer.
export function box(c, x, y, w, h, z0, z1, col, o = {}) {
  const line = o.line;
  poly(c, [P(x, y + h, z0), P(x + w, y + h, z0), P(x + w, y + h, z1), P(x, y + h, z1)], o.south || shade(col, 0.84), line);
  poly(c, [P(x + w, y, z0), P(x + w, y + h, z0), P(x + w, y + h, z1), P(x + w, y, z1)], o.east || shade(col, 0.68), line);
  poly(c, [P(x, y, z1), P(x + w, y, z1), P(x + w, y + h, z1), P(x, y + h, z1)], o.top || col, line);
}

// Zeminde r yarıçaplı daire (izometrikte elips) yolu.
export function floorRing(c, x, y, r) {
  c.beginPath();
  c.ellipse(px(x, y), py(x, y), r * K * 1.414, r * K * 0.707, 0, 0, Math.PI * 2);
}

// Duvar düzlemine yerel çizim: yerel x ekranda piksel (duvar boyunca), yerel y aşağı doğru piksel.
// axis 'y': y=fixed düzlemi (u = x), axis 'x': x=fixed düzlemi (u = y, yerel x ters akar).
export function onWall(c, axis, fixed, u0, ztop, fn) {
  c.save();
  if (axis === 'y') c.transform(1, 0.5, 0, 1, px(u0, fixed), py(u0, fixed, ztop));
  else c.transform(-1, 0.5, 0, 1, px(fixed, u0), py(fixed, u0, ztop));
  fn(c);
  c.restore();
}

// Dünya hareket yönü → ekranda 4 yön (yürüme görünümü).
export function dir4(vx, vy) {
  const sx = vx - vy, sy = (vx + vy) / 2;
  return Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
}
// Oturan karakter: ekrana sırtı mı yüzü mü dönük?
export const seatDir = f => (f[0] + f[1] > 0 ? 'down' : 'up');

export function wrapText(c, text, maxW, maxLines) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].replace(/.{1}$/, '')}…`; }
  return lines;
}
