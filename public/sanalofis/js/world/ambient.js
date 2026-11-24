// Atmosfer: gün/gece ışığı (yerel saate göre), ışık hâleleri ve mevsim parçacıkları (yaprak, kar, taç yaprağı).
import { px, py } from './iso.js';
import { isClosed } from './map.js';

const TAU = Math.PI * 2;
// Işık hâleleri: dünya konumu, yükseklik, yarıçap (ekran px), renk. Yalnızca gece görünür.
const GLOWS = [
  [780, 20, 150, 170, '255,214,140'], [605, 20, 134, 90, '170,190,255'], [1340, 20, 134, 190, '170,200,255'],
  [575, 823, 36, 80, '255,200,120'], [455, 705, 64, 90, '255,240,220'], [594, 1058, 40, 90, '255,215,120'], [986, 1058, 40, 90, '255,215,120'],
  [1450, 1020, 60, 110, '190,120,255', 'aktivite'], [260, 1090, 110, 190, '255,214,150', 'mutfak'], [270, 1280, 110, 170, '255,214,150', 'mutfak'], [1250, 1070, 110, 190, '120,230,225', 'aktivite'], [1300, 1280, 110, 170, '255,230,170', 'aktivite'],
  [260, 190, 120, 210, '255,225,170'], [1340, 190, 120, 210, '255,225,170'], [800, 190, 120, 210, '255,230,190'], [250, 600, 120, 200, '255,215,200'], [1340, 600, 120, 200, '255,235,200'],
];

// mode: 'auto' | 'day' | 'night'. Dönüş: { dark: 0..0.42, dusk: 0..1 }
export function lightOf(mode, d = new Date()) {
  if (mode === 'day') return { dark: 0, dusk: 0 };
  if (mode === 'night') return { dark: 0.42, dusk: 0 };
  const h = d.getHours() + d.getMinutes() / 60, ramp = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const dark = h >= 20 || h < 5.5 ? 1 : h >= 17.5 ? ramp(17.5, 20, h) : h < 7.5 ? 1 - ramp(5.5, 7.5, h) : 0;
  const duskish = (h >= 17.5 && h < 20) || (h >= 5.5 && h < 7.5);
  return { dark: dark * 0.42, dusk: duskish ? 1 - Math.abs(dark - 0.5) * 2 : 0 };
}

export function drawLight(ctx, w, h, light) {
  if (light.dark <= 0.005) return;
  ctx.fillStyle = `rgba(${light.dusk ? '55,30,80' : '10,18,58'},${light.dark})`;
  ctx.fillRect(0, 0, w, h);
  if (light.dusk > 0.1) { ctx.fillStyle = `rgba(255,130,60,${0.1 * light.dusk})`; ctx.fillRect(0, 0, w, h); }
}

export function drawGlows(ctx, light, t) {
  if (light.dark < 0.08) return;
  const a = Math.min(1, light.dark / 0.42);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, z, r, col, area] of GLOWS) {
    if (area && isClosed(area)) continue;
    const sx = px(x, y), sy = py(x, y, z), k = 1 + Math.sin(t * 2 + x) * 0.03, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * k);
    g.addColorStop(0, `rgba(${col},${0.42 * a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(sx - r * 1.1, sy - r * 1.1, r * 2.2, r * 2.2);
  }
  ctx.restore();
}

const STYLE = {
  autumn: { cols: ['#dc2626', '#f59e0b', '#b45309', '#ea580c'], w: 6, h: 3.2, fall: 38, sway: 40, rot: true },
  winter: { cols: ['#ffffff', '#e0f2fe'], w: 3, h: 3, fall: 34, sway: 20, rot: false },
  spring: { cols: ['#f9a8d4', '#fbcfe8', '#fff'], w: 5, h: 2.6, fall: 26, sway: 34, rot: true },
  summer: { cols: ['rgba(255,244,190,.8)'], w: 2.2, h: 2.2, fall: -9, sway: 14, rot: false },
};

export function createParticles(season, count) {
  const st = STYLE[season] || STYLE.summer;
  const ps = Array.from({ length: count }, (_, i) => ({ x: Math.random(), y: Math.random(), ph: Math.random() * TAU, sz: 0.6 + Math.random() * 0.9, c: st.cols[i % st.cols.length] }));
  return {
    draw(ctx, w, h, dt, t) {
      for (const p of ps) {
        p.y += (st.fall * p.sz * dt) / h;
        if (p.y > 1.03) p.y = -0.03; else if (p.y < -0.03) p.y = 1.03;
        const x = (p.x + Math.sin(t * 0.6 + p.ph) * st.sway / w) * w, y = p.y * h;
        ctx.fillStyle = p.c; ctx.beginPath();
        ctx.ellipse(x, y, st.w * p.sz, st.h * p.sz, st.rot ? t * 0.9 + p.ph : 0, 0, TAU); ctx.fill();
      }
    },
  };
}
