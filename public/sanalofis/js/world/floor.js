// Statik katman: ahşap parke, oda halıları, paspaslar, arka duvarlar (pencere, ışıklı logo, dekor). Bir kez çizilip önbelleğe alınır.
import { WORLD } from '../config.js';
import { ZONES, RUGS, DOORS } from './map.js';
import { K, OX, OY, SW, SH, WALL_H, P, poly, box, onWall } from './iso.js';

const W = WORLD.w, H = WORLD.h, X0 = 20, Y0 = 20, X1 = W - 20, Y1 = H - 20;
const quad = (c, x, y, w, h, fill, stroke, lw) => poly(c, [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], fill, stroke, lw);
const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const line = (c, a, b) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };

function slab(c) {
  poly(c, [P(X0, Y1), P(X1, Y1), P(X1, Y1, -18), P(X0, Y1, -18)], '#6b4326');
  poly(c, [P(X1, Y0), P(X1, Y1), P(X1, Y1, -18), P(X1, Y0, -18)], '#4f3119');
}

function wood(c) {
  const tones = ['#d98a45', '#d0803b', '#e09450', '#d6853f'], r = rnd(7);
  c.lineWidth = 0.8;
  for (let y = Y0, i = 0; y < Y1; y += 16, i++) {
    quad(c, X0, y, X1 - X0, 16, tones[i % 4]);
    c.strokeStyle = 'rgba(90,45,15,.22)';
    line(c, P(X0, y), P(X1, y));
    for (let x = X0 + r() * 120; x < X1; x += 90 + r() * 160) line(c, P(x, y), P(x, y + 16));
  }
}

function zones(c) {
  for (const z of ZONES) {
    if (z.base) continue;
    quad(c, z.x, z.y, z.w, z.h, z.floor);
    const r = rnd(z.x + z.y + 1);
    if (z.tex === 'carpet') {
      for (let x = z.x; x < z.x + z.w; x += 12) for (let y = z.y; y < z.y + z.h; y += 12) {
        const v = r();
        if (v < 0.3) quad(c, x, y, 12, 12, 'rgba(255,255,255,.09)');
        else if (v > 0.82) quad(c, x, y, 12, 12, 'rgba(0,0,0,.035)');
      }
    } else {
      c.strokeStyle = 'rgba(140,115,80,.22)'; c.lineWidth = 1;
      for (let x = z.x; x <= z.x + z.w; x += 64) line(c, P(x, z.y), P(x, z.y + z.h));
      for (let y = z.y; y <= z.y + z.h; y += 64) line(c, P(z.x, y), P(z.x + z.w, y));
    }
    quad(c, z.x, z.y, z.w, z.h, null, 'rgba(60,40,20,.16)', 1.5);
  }
}

function rugs(c) {
  for (const r of RUGS) {
    c.save();
    c.transform(K, K / 2, -K, K / 2, OX, OY); // yer düzlemine yerel çizim
    const rad = Math.min(r.w, r.h) / 2;
    c.fillStyle = r.color; c.beginPath(); c.roundRect(r.x, r.y, r.w, r.h, r.round ? rad : 14); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.10)'; c.lineWidth = 1.5; c.beginPath();
    c.roundRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, r.round ? rad - 8 : 8); c.stroke();
    if (r.label) {
      c.fillStyle = 'rgba(255,255,255,.92)'; c.font = '700 16px system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    }
    c.restore();
  }
  DOORS.forEach(d => quad(c, d.x, d.y - 4, d.w, d.h + 8, 'rgba(99,102,241,.35)'));
}

const pane = (g, w, h) => {
  g.fillStyle = '#fdf9ef'; g.fillRect(-3, -3, w + 6, h + 6);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#d8effa'); gr.addColorStop(1, '#9bcfe8');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath();
  g.moveTo(w * 0.15, h); g.lineTo(w * 0.45, 0); g.lineTo(w * 0.6, 0); g.lineTo(w * 0.3, h); g.fill();
  g.fillStyle = '#fdf9ef'; g.fillRect(w / 2 - 1.5, 0, 3, h);
};

// Lobi duvarında ışıklı APERIONX tabelası.
function plaque(c, logo, SS) {
  onWall(c, 'y', 20, 690, 150, g => {
    const w = 168, h = 66;
    g.shadowColor = '#818cf8'; g.shadowBlur = 26 * SS;
    g.fillStyle = '#12102e'; g.beginPath(); g.roundRect(0, 0, w, h, 8); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = '#6366f1'; g.lineWidth = 2; g.stroke();
    if (logo) {
      const lw = w - 36, lh = lw * logo.height / logo.width;
      g.shadowColor = '#a5b4fc'; g.shadowBlur = 14 * SS;
      g.drawImage(logo, 18, 12, lw, lh);
      g.shadowBlur = 0;
    }
    g.fillStyle = 'rgba(199,210,254,.85)'; g.font = '700 7px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('S A N A L   O F İ S', w / 2, h - 8);
  });
}

function decor(c) {
  // Yayın odası: çerçeveli dergi kapakları
  ['#6366f1', '#f59e0b', '#ec4899'].forEach((col, i) => onWall(c, 'y', 20, 70 + i * 90, 122, g => {
    g.fillStyle = '#fffdf8'; g.fillRect(-3, -3, 42, 58); g.fillStyle = col; g.fillRect(0, 0, 36, 52);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(4, 5, 28, 6); g.fillRect(4, 40, 18, 3); g.fillRect(4, 46, 12, 3);
  }));
  // Sosyal medya odası: ilham panosu (batı duvarı)
  onWall(c, 'x', 20, 560, 112, g => {
    g.fillStyle = '#fffdf8'; g.fillRect(-4, -4, 120, 64);
    ['#f472b6', '#facc15', '#38bdf8', '#34d399', '#fb923c', '#c084fc', '#f87171', '#60a5fa'].forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(4 + (i % 4) * 27, 4 + Math.floor(i / 4) * 28, 22, 22);
    });
  });
}

function backWalls(c, logo, SS) {
  box(c, 0, 0, W, 20, 0, WALL_H, '#efe8dc', { top: '#fffaf0' });
  box(c, 0, 0, 20, H, 0, WALL_H, '#e8dfd0', { top: '#fffaf0' });
  onWall(c, 'y', 20, 0, WALL_H, g => { g.fillStyle = '#d3c6ad'; g.fillRect(0, WALL_H - 12, W * K, 12); });
  onWall(c, 'x', 20, 0, WALL_H, g => { g.fillStyle = '#cbbda3'; g.fillRect(0, WALL_H - 12, H * K, 12); });
  [70, 210, 350, 960, 1525].forEach(x => onWall(c, 'y', 20, x, 140, g => pane(g, 72, 62)));
  [50, 190, 330, 470, 750, 890].forEach(y => onWall(c, 'x', 20, y, 140, g => pane(g, 72, 62)));
  plaque(c, logo, SS);
  decor(c);
}

export function buildStatic(assets, SS = 2) {
  const cv = document.createElement('canvas');
  cv.width = SW * SS; cv.height = SH * SS;
  const c = cv.getContext('2d');
  c.scale(SS, SS);
  slab(c); wood(c); zones(c); rugs(c); backWalls(c, assets.logo, SS);
  return cv;
}
