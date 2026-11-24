// Temel mobilya çizimleri (izometrik, kutu tabanlı) ve çok parçalı nesneler (kanepe, sandalye).
import { px, py, P, box, poly } from './iso.js';
import { LEAF } from './season.js';

const TAU = Math.PI * 2;
export const shadow = (c, x, y, w, h, a = 0.16) =>
  poly(c, [P(x + 4, y + 4), P(x + w + 10, y + 4), P(x + w + 10, y + h + 10), P(x + 4, y + h + 10)], `rgba(50,25,10,${a})`);

export function ball(c, x, y, z, r, fill, hi) {
  const sx = px(x, y), sy = py(x, y, z);
  c.fillStyle = fill; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
  if (hi) { c.fillStyle = hi; c.beginPath(); c.arc(sx - r * 0.3, sy - r * 0.3, r * 0.45, 0, TAU); c.fill(); }
}

export const FDRAW = {
  desk(c, f) {
    const { x, y, w, h } = f, cx = x + w / 2;
    shadow(c, x, y, w, h);
    [[x + 3, y + 3], [x + w - 7, y + 3], [x + 3, y + h - 7], [x + w - 7, y + h - 7]].forEach(([a, b]) => box(c, a, b, 4, 4, 0, 22, '#8b8f9c'));
    box(c, x, y, w, h, 22, 27, '#f1ebdf', { top: '#faf6ee' });
    box(c, cx - 5, y + 8, 10, 6, 27, 32, '#374151');
    box(c, cx - 17, y + 6, 34, 3, 30, 52, '#111827', { south: '#3b6df0' }); // ekran (sandalyeye dönük)
    box(c, cx - 12, y + 24, 24, 8, 27, 29, '#cfd5de', { top: '#e5e9f0' });
    box(c, x + w - 16, y + 30, 7, 7, 27, 34, '#ffffff', { top: '#7c4a2d' });
  },
  table(c, f) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h);
    box(c, x + 30, y + 18, w - 60, h - 36, 0, 24, '#8b7f6a');
    box(c, x, y, w, h, 24, 30, '#f1e9da', { top: '#f8f2e6' });
  },
  ctable(c, f) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h, 0.12);
    box(c, x, y, w, h, 0, 16, '#8a5a3a', { top: '#b9855a' });
    box(c, x + 14, y + 8, 6, 6, 16, 22, '#ffffff', { top: '#6b3f26' });
  },
  plant(c, f, S) {
    const L = LEAF[S?.season] || LEAF.summer;
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    shadow(c, f.x + 4, f.y + 4, f.w - 8, f.h - 8, 0.2);
    box(c, cx - 8, cy - 8, 16, 16, 0, 13, '#b45f3a', { top: '#8a4a2d' });
    box(c, cx - 2, cy - 2, 4, 4, 13, 26, '#7c4a2d');
    ball(c, cx + 3, cy + 3, 36, 15, L[0]);
    ball(c, cx, cy, 38, 15, L[1], L[2]);
  },
  beanbag(c, f) {
    const sx = px(f.x + f.w / 2, f.y + f.h / 2), sy = py(f.x + f.w / 2, f.y + f.h / 2, 0), col = f.alt ? '#06b6d4' : '#f43f5e';
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(sx, sy + 3, 30, 17, 0, 0, TAU); c.fill();
    c.fillStyle = f.alt ? '#0891b2' : '#e11d48'; c.beginPath(); c.ellipse(sx, sy, 28, 16, 0, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(sx, sy - 9, 25, 13, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(sx - 6, sy - 12, 10, 5, 0, 0, TAU); c.fill();
  },
  ringlight(c, f) {
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2, sx = px(cx, cy), sy = py(cx, cy, 64);
    box(c, cx - 9, cy - 9, 18, 18, 0, 4, '#1f2937');
    box(c, cx - 1.5, cy - 1.5, 3, 3, 4, 62, '#374151');
    c.strokeStyle = '#f8fafc'; c.lineWidth = 5; c.beginPath(); c.arc(sx, sy, 13, 0, TAU); c.stroke();
    c.fillStyle = '#0b1220'; c.beginPath(); c.arc(sx, sy, 5, 0, TAU); c.fill();
  },
};

// Çok parçalı nesneler: her parça kendi sıralama anahtarıyla çizilir (oturanlar doğru görünsün diye).
export const FPARTS = {
  sofa(f) {
    const { x, y, w, h, back } = f, n = 3, cw = (w - 24) / n;
    const backY = back === 'top' ? y : y + h - 14, seatY = back === 'top' ? y + 14 : y;
    const parts = [{
      key: x + w / 2 + y,
      draw: c => {
        shadow(c, x, y, w, h, 0.18);
        box(c, x, y, w, h, 0, 16, '#4b3fb0', { top: '#5b4ec2' });
        for (let i = 0; i < n; i++) box(c, x + 12 + i * cw + 1, seatY, cw - 2, h - 14, 16, 24, '#6d5fd6', { top: '#8478ee' });
      },
    }];
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      parts.push({ key: x + (i + 0.5) * bw + backY + 7, draw: c => box(c, x + i * bw, backY, bw, 14, 16, 44, '#4b3fb0', { top: '#6558d6' }) });
    }
    parts.push({ key: x + 6 + y + h / 2, draw: c => box(c, x, y, 12, h, 16, 32, '#4b3fb0', { top: '#6558d6' }) });
    parts.push({ key: x + w - 6 + y + h / 2, draw: c => box(c, x + w - 12, y, 12, h, 16, 32, '#4b3fb0', { top: '#6558d6' }) });
    return parts;
  },
  beanbag: f => [{ key: f.x + f.w / 2 + f.y + f.h / 2 - 3, draw: c => FDRAW.beanbag(c, f) }],
};

// Sandalye: oturak + sırt dayanağı ayrı parçalar. Sırt, bakış yönünün tersindedir.
export function chairSeat(c, ch) {
  box(c, ch.x - 2, ch.y - 2, 4, 4, 0, 9, '#1f2937');
  box(c, ch.x - 8, ch.y - 8, 16, 16, 9, 14, '#4a5568', { top: '#64748b' });
}
const backAtSouthOrEast = ch => (Math.abs(ch.f[1]) >= Math.abs(ch.f[0]) ? ch.f[1] < 0 : ch.f[0] < 0);
export function chairBack(c, ch) {
  const { x, y } = ch, [fx, fy] = ch.f;
  if (Math.abs(fy) >= Math.abs(fx)) box(c, x - 8, fy < 0 ? y + 5 : y - 8, 16, 3, 14, 31, '#2d3748', { top: '#4b5563' });
  else box(c, fx < 0 ? x + 5 : x - 8, y - 8, 3, 16, 14, 31, '#2d3748', { top: '#4b5563' });
}
export const chairBackKey = ch => ch.x + ch.y + (backAtSouthOrEast(ch) ? 8 : -8);
