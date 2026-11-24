// Gölet: taş kenar, su, nilüfer, koi balıkları ve kuğu. Ölçüler gölet boyutuna göre ayarlanır; hareket zamana bağlıdır.
import { px, py, P, poly, box } from './iso.js';
import { shadow, ball } from './furniture.js';

const TAU = Math.PI * 2;
const ring = (cx, cy, z, rx, ry, n = 48) => Array.from({ length: n }, (_, i) => P(cx + rx * Math.cos(i / n * TAU), cy + ry * Math.sin(i / n * TAU), z));
const trace = (c, pts) => { c.beginPath(); pts.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };

// rx/ry: su elipsinin yarıçaplarına oran
const KOI = [
  { a: 0, sp: 0.5, fx: 0.78, fy: 0.72, col: '#f97316', spot: '#fff7ed' },
  { a: 2.1, sp: -0.42, fx: 0.52, fy: 0.5, col: '#fafafa', spot: '#ef4444' },
  { a: 4.0, sp: 0.36, fx: 0.88, fy: 0.82, col: '#f59e0b', spot: '#fff' },
  { a: 1.0, sp: -0.58, fx: 0.32, fy: 0.34, col: '#ef4444', spot: '#fde68a' },
  { a: 3.2, sp: 0.44, fx: 0.66, fy: 0.62, col: '#fb923c', spot: '#fff' },
];

function fish(c, cx, cy, wx, wy, k, t) {
  const a = k.a + t * k.sp, e = 0.06 * Math.sign(k.sp), rx = wx * k.fx, ry = wy * k.fy;
  const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), x2 = cx + rx * Math.cos(a + e), y2 = cy + ry * Math.sin(a + e);
  const sx = px(x, y), sy = py(x, y, 4), ang = Math.atan2(py(x2, y2, 4) - sy, px(x2, y2) - sx);
  c.save(); c.translate(sx, sy); c.rotate(ang); c.scale(1.55, 1.55); c.globalAlpha = 0.94;
  const wig = Math.sin(t * 9 + k.a) * 2;
  c.fillStyle = k.col;
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-15, -4 + wig); c.lineTo(-14, wig * 0.4); c.lineTo(-15, 4 + wig); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(0, 0, 9, 3.8, 0, 0, TAU); c.fill();
  c.fillStyle = k.spot; c.beginPath(); c.ellipse(-1, -0.6, 3.6, 2, 0, 0, TAU); c.fill();
  c.fillStyle = '#111'; c.fillRect(5, -1.6, 1.3, 1.3);
  c.restore();
}

// Kuğu: yerel koordinatlarda çizilir (ölçek 1.8), boynu ve gagası her zaman tam görünür.
function swan(c, cx, cy, wx, wy, t) {
  const a = t * 0.13 + 1, e = 0.04, rx = wx * 0.58, ry = wy * 0.5;
  const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), x2 = cx + rx * Math.cos(a + e), y2 = cy + ry * Math.sin(a + e);
  const sx = px(x, y), sy = py(x, y, 5) + Math.sin(t * 2) * 0.8, dx = px(x2, y2) - sx, dy = py(x2, y2, 5) - py(x, y, 5);
  const face = dx >= 0 ? 1 : -1, tilt = Math.atan2(dy, Math.abs(dx)) * 0.5 * face;
  c.save(); c.translate(sx, sy); c.scale(1.8 * face, 1.8);
  c.fillStyle = 'rgba(10,50,80,.28)'; c.beginPath(); c.ellipse(0, 1, 17, 5.5, 0, 0, TAU); c.fill(); // su gölgesi
  c.save(); c.rotate(tilt * face);
  c.fillStyle = '#f8fafc'; c.strokeStyle = '#cbd5e1'; c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(-17, -7); c.quadraticCurveTo(-12, -2, 0, -1); c.quadraticCurveTo(13, -1, 15, -8); c.quadraticCurveTo(7, -14, -4, -13); c.quadraticCurveTo(-13, -13, -17, -7); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#e2e8f0'; c.beginPath(); c.ellipse(-3, -8, 8, 4.3, -0.15, 0, TAU); c.fill(); // kanat
  c.restore();
  c.strokeStyle = '#f8fafc'; c.lineWidth = 3.6; c.lineCap = 'round'; // boyun (S eğrisi)
  c.beginPath(); c.moveTo(11, -9); c.bezierCurveTo(18, -11, 19, -20, 13, -24); c.bezierCurveTo(10, -26, 12, -29, 15, -29); c.stroke();
  c.strokeStyle = '#cbd5e1'; c.lineWidth = 0.6; c.stroke();
  c.fillStyle = '#f8fafc'; c.beginPath(); c.arc(15.5, -29.5, 3.1, 0, TAU); c.fill();
  c.fillStyle = '#f97316'; c.beginPath(); c.moveTo(18, -30.5); c.lineTo(23, -28.8); c.lineTo(18, -27.6); c.closePath(); c.fill();
  c.fillStyle = '#111'; c.fillRect(15.6, -30.8, 1, 1);
  c.restore();
}

export function drawPond(c, f, S, t = 0) {
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2, wx = rx - 10, wy = ry - 10;
  shadow(c, x + 6, y + 6, w - 12, h - 12, 0.18);
  poly(c, ring(cx, cy, 0, rx, ry), '#78716c');
  poly(c, ring(cx, cy, 9, rx, ry), '#d6d3d1', '#a8a29e', 1.2);
  poly(c, ring(cx, cy, 5, wx, wy), '#1f7d9c');
  const gx = px(cx, cy), gy = py(cx, cy, 5), g = c.createRadialGradient(gx, gy, 6, gx, gy, wx * 0.72);
  g.addColorStop(0, 'rgba(130,230,245,.7)'); g.addColorStop(1, 'rgba(20,110,150,.12)');
  poly(c, ring(cx, cy, 5, wx, wy), g);
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.2; // dalga halkaları
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.22 + i / 3) % 1, ox = (i - 1) * wx * 0.5;
    c.globalAlpha = 1 - k; trace(c, ring(cx + ox, cy + (i % 2 ? -4 : 5), 5, 8 + k * 30, 4 + k * 12, 28)); c.stroke();
  }
  c.globalAlpha = 1;
  KOI.forEach(k => fish(c, cx, cy, wx, wy, k, t));
  [[-0.5, -0.1], [0.12, 0.35], [0.42, -0.25], [-0.15, 0.1], [0.72, 0.15], [-0.78, 0.2]].forEach(([fx, fy], i) => { // nilüfer
    const lx = cx + fx * wx, ly = cy + fy * wy;
    poly(c, ring(lx, ly, 5.5, 11, 9, 18), '#2f9e5b', '#1e7a44', 0.8);
    if (i % 2 === 0) ball(c, lx, ly, 8, 3.2, '#f9a8d4', '#fff');
  });
  [0.2, 1.1, 1.9, 2.8, 3.6, 4.3, 5.1, 5.8].forEach(a => ball(c, cx + Math.cos(a) * (rx - 4), cy + Math.sin(a) * (ry - 4), 11, 7.5, '#a8a29e', '#e7e5e4')); // kenar taşları
  [-0.8, 0.8].forEach(s => { // arka köşelerde fenerler
    const lx = cx + s * rx * 0.8, ly = cy - ry - 4;
    box(c, lx - 2, ly - 2, 4, 4, 0, 34, '#44403c'); ball(c, lx, ly, 40, 6, '#fde68a', '#fffbeb');
  });
  swan(c, cx, cy, wx, wy, t); // en son: kuğu hiçbir şeyin arkasında kalmaz
}
