// Mevsim: ay'a göre dört mevsim (?season=winter gibi URL ile denenebilir) ve mevsimlik süs nesneleri.
import { px, py, box } from './iso.js';
import { ball } from './furniture.js';

const TAU = Math.PI * 2;
// mode: yönetim panelindeki seçim ('auto' | 'off' | mevsim adı). Dönüş: mevsim adı ya da '' (kapalı).
export function seasonOf(mode = 'auto', d = new Date()) {
  const q = new URLSearchParams(location.search).get('season');
  if (['autumn', 'winter', 'spring', 'summer'].includes(q)) return q;
  if (mode === 'off') return '';
  if (['autumn', 'winter', 'spring', 'summer'].includes(mode)) return mode;
  const m = d.getMonth();
  return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
}
// Saksı bitkisinin yaprak renkleri.
export const LEAF = {
  summer: ['#1b8a4c', '#22a05a', '#6fdc98'], spring: ['#2e9d57', '#3fb868', '#f9a8d4'],
  autumn: ['#c2570c', '#e0830f', '#fcd34d'], winter: ['#1f6b4f', '#2c7d5c', '#f1f5f9'],
};

const tier = (c, sx, sy, w, h, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(sx - w, sy); c.lineTo(sx + w, sy); c.lineTo(sx, sy - h); c.closePath(); c.fill(); };

const DECOR = {
  winter: [
    (c, x, y, t) => { // süslü çam ağacı + hediyeler
      const sx = px(x, y), sy = py(x, y);
      box(c, x - 3, y - 3, 6, 6, 0, 12, '#7c4a2d');
      tier(c, sx, sy - 8, 24, 30, '#1c6b43'); tier(c, sx, sy - 28, 19, 28, '#228653'); tier(c, sx, sy - 48, 13, 26, '#2a9d62');
      c.fillStyle = '#fde047'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7; c.lineTo(sx + Math.sin(i * TAU / 10) * r, sy - 78 - Math.cos(i * TAU / 10) * r); } c.fill();
      [[-11, -16, '#ef4444'], [9, -26, '#38bdf8'], [-6, -40, '#f59e0b'], [8, -50, '#ef4444'], [-3, -60, '#c084fc']].forEach(([dx, dy, col], i) => {
        c.fillStyle = Math.sin(t * 3 + i * 1.7) > 0 ? col : '#fff'; c.beginPath(); c.arc(sx + dx, sy + dy, 2.6, 0, TAU); c.fill();
      });
      box(c, x + 18, y + 8, 12, 12, 0, 9, '#ef4444'); box(c, x - 30, y + 10, 10, 10, 0, 7, '#38bdf8');
    },
    (c, x, y) => { ball(c, x, y, 7, 11, '#f8fafc', '#fff'); ball(c, x, y, 22, 8, '#f8fafc', '#fff'); ball(c, x, y, 33, 5.5, '#f8fafc', '#fff'); ball(c, x + 2, y + 2, 33, 1.2, '#111827'); box(c, x - 1, y + 4, 2, 2, 31, 33, '#f97316'); }, // kardan adam
  ],
  autumn: [
    (c, x, y) => { [[-14, 4, 12], [8, 6, 14], [-2, -6, 11], [20, -4, 9]].forEach(([dx, dy, r], i) => { ball(c, x + dx, y + dy, r * 0.7, r, i % 2 ? '#ea580c' : '#f97316', '#fdba74'); box(c, x + dx - 1, y + dy - 1, 2, 2, r * 1.4, r * 1.4 + 4, '#3f6212'); }); }, // balkabakları
    (c, x, y) => { for (let i = 0; i < 12; i++) { const a = i * 2.4; ball(c, x + Math.cos(a) * 14, y + Math.sin(a) * 9, 3, 4.5, ['#dc2626', '#f59e0b', '#b45309', '#ea580c'][i % 4]); } }, // yaprak yığını
  ],
  spring: [
    (c, x, y) => { box(c, x - 18, y - 8, 36, 16, 0, 12, '#b45f3a'); [[-12, '#f472b6'], [-4, '#facc15'], [4, '#fb7185'], [12, '#c084fc']].forEach(([dx, col]) => { box(c, x + dx - 0.7, y - 0.7, 1.4, 1.4, 12, 26, '#22c55e'); ball(c, x + dx, y, 28, 4.5, col, '#fff'); }); },
    (c, x, y) => { [-8, 0, 8].forEach((dx, i) => { box(c, x + dx - 0.6, y - 0.6, 1.2, 1.2, 0, 18 + i * 3, '#16a34a'); ball(c, x + dx, y, 20 + i * 3, 4, ['#ef4444', '#f59e0b', '#ec4899'][i], '#fff'); }); },
  ],
  summer: [
    (c, x, y) => { // şemsiye
      box(c, x - 1.5, y - 1.5, 3, 3, 0, 60, '#e5e7eb');
      const sx = px(x, y), sy = py(x, y, 60);
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : '#ef4444'; c.beginPath(); c.moveTo(sx, sy - 12); c.arc(sx, sy, 28, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); c.closePath(); c.fill(); }
    },
    (c, x, y) => { ball(c, x, y, 7, 8, '#38bdf8', '#e0f2fe'); box(c, x + 14, y - 6, 22, 14, 0, 2, '#fb7185'); },
  ],
};

export const SEASON_PROPS = {
  sdecor(c, f, S, t = 0) { const d = DECOR[S?.season]?.[f.v]; if (d) d(c, f.x + f.w / 2, f.y + f.h / 2, t); },
};
