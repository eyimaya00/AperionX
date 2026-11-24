// Kedi çizimi: yürüyen, oturan ve uyuyan pozlar. Ayak noktası (0,0).
import { px, py, shade } from './iso.js';

const TAU = Math.PI * 2;
export const CAT_LOOKS = [
  { body: '#f59e0b', stripe: '#b45309', belly: '#fde68a', name: 'Tarçın' },
  { body: '#64748b', stripe: '#334155', belly: '#e2e8f0', name: 'Duman' },
  { body: '#f8fafc', stripe: '#1f2937', belly: '#ffffff', name: 'Pamuk' },
];

function sitting(c, k, t) {
  const sw = Math.sin(t * 1.6) * 2.5;
  c.strokeStyle = k.body; c.lineWidth = 3.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-5, -2); c.quadraticCurveTo(-13, -1 + sw * 0.3, -11, -8 + sw); c.stroke(); // kuyruk
  c.fillStyle = k.body; c.beginPath(); c.ellipse(0, -7, 6.5, 8, 0, 0, TAU); c.fill();
  c.fillStyle = k.belly; c.beginPath(); c.ellipse(1, -6, 3.2, 5, 0, 0, TAU); c.fill();
  head(c, k, 1.5, -17);
}
function head(c, k, x, y) {
  c.fillStyle = k.body; c.beginPath(); c.arc(x, y, 5.2, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 5, y - 2); c.lineTo(x - 4, y - 8.5); c.lineTo(x - 0.6, y - 4.5); c.fill();
  c.beginPath(); c.moveTo(x + 5, y - 2); c.lineTo(x + 4, y - 8.5); c.lineTo(x + 0.6, y - 4.5); c.fill();
  c.fillStyle = '#111827'; c.fillRect(x - 3, y - 1, 1.5, 1.8); c.fillRect(x + 1.6, y - 1, 1.5, 1.8);
  c.fillStyle = '#f9a8d4'; c.fillRect(x - 0.7, y + 1.6, 1.4, 1);
  c.strokeStyle = k.stripe; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 1.5, y - 5); c.lineTo(x - 1.5, y - 3); c.moveTo(x + 1.5, y - 5); c.lineTo(x + 1.5, y - 3); c.stroke();
}
function lying(c, k, t) {
  c.fillStyle = k.body; c.beginPath(); c.ellipse(0, -4, 11, 5.5, 0, 0, TAU); c.fill();
  c.fillStyle = k.stripe; c.beginPath(); c.ellipse(-3, -6, 4, 1.4, 0, 0, TAU); c.fill();
  head(c, k, 8, -6);
  c.fillStyle = 'rgba(51,65,85,.8)'; c.font = '700 9px system-ui'; c.textAlign = 'center';
  c.fillText('z', 6, -20 - ((t * 6) % 6)); c.fillText('Z', 11, -26 - ((t * 5) % 6));
}
function walking(c, k, t) {
  const ph = t * 10, sw = Math.sin(ph) * 2.6;
  c.fillStyle = shade(k.body, 0.8);
  [[-6, sw], [-3, -sw], [4, -sw], [7, sw]].forEach(([lx, o]) => c.fillRect(lx - 1.2 + o, -5, 2.4, 5));
  c.strokeStyle = k.body; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-10, -9); c.quadraticCurveTo(-16, -14 + Math.sin(t * 5) * 2, -14, -19); c.stroke();
  c.fillStyle = k.body; c.beginPath(); c.ellipse(0, -9, 11, 5.2, 0, 0, TAU); c.fill();
  c.fillStyle = k.stripe; for (const x of [-5, 0, 5]) c.fillRect(x - 0.8, -13.5, 1.6, 4);
  head(c, k, 11, -12);
}

// cat: { x, y, mode:'walk'|'sit'|'sleep', flip, look, heart }
export function drawCat(c, cat, t) {
  const k = CAT_LOOKS[cat.look % CAT_LOOKS.length];
  c.save();
  c.translate(px(cat.x, cat.y), py(cat.x, cat.y));
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 0.5, 11, 3.6, 0, 0, TAU); c.fill();
  c.scale(cat.flip * 1.05, 1.05);
  if (cat.mode === 'walk') walking(c, k, t); else if (cat.mode === 'sleep') lying(c, k, t); else sitting(c, k, t);
  c.restore();
  if (cat.say && t - cat.say < 2.2) { // "Miyav!" balonu
    c.save(); c.font = '700 11px system-ui'; c.textAlign = 'center';
    const x = px(cat.x, cat.y), y = py(cat.x, cat.y) - 34 - (t - cat.say) * 6;
    c.globalAlpha = Math.min(1, 2.2 - (t - cat.say)); c.fillStyle = '#fff';
    c.beginPath(); c.roundRect(x - 26, y - 11, 52, 17, 8); c.fill();
    c.fillStyle = '#334155'; c.fillText('Miyav! 💕', x, y + 1.5);
    c.restore();
  }
}
