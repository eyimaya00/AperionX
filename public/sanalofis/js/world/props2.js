// Mutfak ve aktivite alanı nesneleri: buzdolabı, tezgâh, ada, masa tenisi, oyun makinesi, dart, oyun masası.
import { px, py, P, box, poly } from './iso.js';
import { shadow, ball } from './furniture.js';

const TAU = Math.PI * 2;
const line = (c, a, b, col, w = 1.5) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
const disc = (c, x, y, z, r, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(px(x, y), py(x, y, z), r, r / 2, 0, 0, TAU); c.fill(); };

export const PROPS2 = {
  fridge(c, f) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h);
    box(c, x, y, w, h, 0, 104, '#e5e7eb', { top: '#f8fafc' });
    line(c, P(x, y + h, 68), P(x + w, y + h, 68), '#9ca3af');
    box(c, x + w - 10, y + h, 3, 3, 76, 96, '#64748b');
    box(c, x + w - 10, y + h, 3, 3, 28, 50, '#64748b');
  },
  kcounter(c, f) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h);
    box(c, x, y, w, h, 0, 34, '#c9b48f', { top: '#9aa1a8' });
    [x + w / 2 + 2].forEach(bx => [38, 72].forEach(by => { disc(c, bx, y + by, 35, 11, '#111827'); disc(c, bx, y + by, 35, 6, '#374151'); })); // ocak
    poly(c, [P(x + 6, y + 94, 34.5), P(x + w - 6, y + 94, 34.5), P(x + w - 6, y + 128, 34.5), P(x + 6, y + 128, 34.5)], '#cbd5e1', '#64748b'); // evye
    box(c, x + 10, y + 96, 4, 4, 34, 48, '#94a3b8');
  },
  island(c, f) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h);
    box(c, x + 6, y + 6, w - 12, h - 12, 0, 34, '#8a5a3a');
    box(c, x - 4, y - 4, w + 8, h + 8, 34, 40, '#f4eee4', { top: '#fbf7ef' });
    ball(c, x + w / 2 - 18, y + h / 2, 47, 6, '#ef4444', '#fca5a5');
    ball(c, x + w / 2 - 6, y + h / 2 + 4, 46, 6, '#f59e0b', '#fde68a');
    ball(c, x + w / 2 + 6, y + h / 2 - 3, 47, 6, '#84cc16', '#d9f99d');
    box(c, x + w - 44, y + 14, 26, 18, 40, 41, '#7c4a2d', { top: '#a16c46' }); // kesme tahtası
  },
  pingpong(c, f) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h, 0.18);
    [[x + 8, y + 8], [x + w - 12, y + 8], [x + 8, y + h - 12], [x + w - 12, y + h - 12]].forEach(([a, b]) => box(c, a, b, 4, 4, 0, 26, '#374151'));
    box(c, x, y, w, h, 26, 30, '#1b6b48', { top: '#23895b' });
    line(c, P(x + w / 2, y + 2, 30), P(x + w / 2, y + h - 2, 30), 'rgba(255,255,255,.85)', 2);
    line(c, P(x + 2, y + h / 2, 30), P(x + w - 2, y + h / 2, 30), 'rgba(255,255,255,.35)', 1);
    box(c, x + w / 2 - 1, y - 3, 2, h + 6, 30, 42, '#e5e7eb');
    ball(c, x + 34, y + 32, 33, 3, '#fff7ed');
  },
  arcade(c, f, S, t = 0) {
    const { x, y, w, h } = f, body = f.alt ? '#7c2d12' : '#312e81', trim = f.alt ? '#f97316' : '#6366f1';
    shadow(c, x, y, w, h);
    box(c, x, y, w, h, 0, 90, body, { top: shadeTop(trim) });
    box(c, x, y + h - 4, w, 4, 82, 94, trim);
    poly(c, [P(x + 6, y + h, 46), P(x + w - 6, y + h, 46), P(x + w - 6, y + h, 76), P(x + 6, y + h, 76)], `hsl(${(t * 50 + (f.alt ? 120 : 0)) % 360} 85% 55%)`);
    box(c, x + 8, y + h, w - 16, 10, 36, 40, '#1f2937');
    ball(c, x + w / 2, y + h + 6, 46, 3.2, '#ef4444');
  },
  dart(c, f) {
    const { x, y } = f;
    box(c, x + 12, y + 5, 5, 5, 0, 52, '#374151');
    const sx = px(x + 14, y + 12), sy = py(x + 14, y + 12, 66);
    [[17, '#111827'], [14, '#f8fafc'], [10, '#dc2626'], [6, '#16a34a'], [3, '#dc2626']].forEach(([r, col]) => { c.fillStyle = col; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); });
  },
  gametable(c, f) {
    const { x, y, w, h } = f, n = 4, cw = (w - 16) / n, ch = (h - 16) / n;
    shadow(c, x, y, w, h, 0.14);
    box(c, x + 6, y + 6, w - 12, h - 12, 0, 20, '#7c4a2d');
    box(c, x, y, w, h, 20, 25, '#b9855a', { top: '#c99668' });
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const a = x + 8 + i * cw, b = y + 8 + j * ch;
      poly(c, [P(a, b, 25.4), P(a + cw, b, 25.4), P(a + cw, b + ch, 25.4), P(a, b + ch, 25.4)], (i + j) % 2 ? '#6b3f26' : '#f1e9da');
    }
    ball(c, x + 22, y + 20, 30, 4.2, '#111827', '#6b7280');
    ball(c, x + w - 26, y + h - 20, 30, 4.2, '#f8fafc', '#fff');
  },
};

function shadeTop(hex) { return hex; }
