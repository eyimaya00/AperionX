// Avatar parçaları: saç stilleri, aksesuarlar ve kıyafet detayları (drawFigure tarafından kullanılır).
import { shade } from './iso.js';

const TAU = Math.PI * 2;

export function drawHair(c, style, hair, hx, hy, d) {
  const back = d === 'up', side = d === 'left' || d === 'right', fl = d === 'left' ? -1 : 1;
  const g = c.createLinearGradient(0, hy - 11, 0, hy + 6);
  g.addColorStop(0, shade(hair, 1.25)); g.addColorStop(1, shade(hair, 0.75));
  c.fillStyle = g;
  if (style === 1) { // uzun saç: omuzlara iner
    if (back) { c.beginPath(); c.roundRect(hx - 11, hy - 11, 22, 32, 9); c.fill(); }
    else if (side) { c.beginPath(); c.roundRect(hx - fl * 11 - 6, hy - 6, 12, 26, 6); c.fill(); }
    else for (const i of [-1, 1]) { c.beginPath(); c.roundRect(hx + i * 10 - 3, hy - 3, 6, 20, 3); c.fill(); }
  }
  c.beginPath();
  if (back) c.arc(hx, hy, 11, 0, TAU);
  else if (side) { c.arc(hx, hy, 11, Math.PI * 0.55, Math.PI * 2.05, fl > 0); c.arc(hx - fl * 3, hy + 1, 9, 0, TAU); }
  else { c.arc(hx, hy, 11, Math.PI, 0); c.lineTo(hx + 9, hy - 2); c.quadraticCurveTo(hx, hy - 8, hx - 9, hy - 2); }
  c.fill();
  if (style === 2) { c.beginPath(); c.arc(hx, hy - 12.5, 5, 0, TAU); c.fill(); } // topuz
  if (style === 3) for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(hx + Math.cos(Math.PI + i * 0.52) * 10.5, hy - 1 + Math.sin(Math.PI + i * 0.52) * 10, 4.2, 0, TAU); c.fill(); } // kıvırcık
  if (style === 4) { // şapka: saç rengi şapka rengi olur
    c.fillStyle = shade(hair, 0.95); c.beginPath(); c.arc(hx, hy - 2, 11.6, Math.PI, 0); c.fill();
    c.fillStyle = shade(hair, 0.7);
    if (!back) { c.beginPath(); c.ellipse(hx + (side ? fl * 8 : 0), hy - 2.5, side ? 7 : 11, 2.6, 0, 0, TAU); c.fill(); }
  }
}

export function drawAcc(c, acc, hx, hy, d, by, accent = '#6366f1') {
  const back = d === 'up', side = d === 'left' || d === 'right', fl = d === 'left' ? -1 : 1;
  if (acc === 4) { // atkı
    c.fillStyle = '#ef4444'; c.beginPath(); c.roundRect(-8, -35 + by, 16, 5, 2.5); c.fill();
    if (!back) { c.fillRect(side ? fl * 3 - 2 : 2, -32 + by, 4, 8); }
    return;
  }
  if (acc === 3) { // kulaklık
    c.strokeStyle = '#1f2937'; c.lineWidth = 2.4; c.beginPath(); c.arc(hx, hy - 1, 11.6, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
    c.fillStyle = accent;
    if (side) { c.beginPath(); c.arc(hx - fl * 1, hy + 1, 3.6, 0, TAU); c.fill(); }
    else for (const i of [-1, 1]) { c.beginPath(); c.roundRect(hx + i * 11 - 2.2, hy - 2, 4.4, 7, 2); c.fill(); }
    return;
  }
  if (back || !acc) return;
  c.strokeStyle = '#111827'; c.lineWidth = 1.1; c.fillStyle = 'rgba(17,24,39,.88)';
  const eye = x => { c.beginPath(); c.arc(x, hy + 1, 3.1, 0, TAU); if (acc === 2) c.fill(); c.stroke(); };
  if (side) eye(fl * 5);
  else { eye(-3.8); eye(3.8); c.beginPath(); c.moveTo(-0.7, hy + 0.8); c.lineTo(0.7, hy + 0.8); c.stroke(); }
}

export function drawTop(c, top, outfit, back, bob) {
  if (top === 1) { // hoodie: kapüşon ve cep
    c.fillStyle = shade(outfit, 0.82); c.beginPath(); c.ellipse(0, -33 + bob, 8.6, 3.4, 0, 0, TAU); c.fill();
    if (!back) { c.beginPath(); c.roundRect(-5.5, -19 + bob, 11, 6, 2); c.fill(); }
  } else if (top === 2 && !back) { // blazer: beyaz gömlek yaka
    c.fillStyle = '#f8fafc'; c.beginPath(); c.moveTo(-3.4, -32 + bob); c.lineTo(3.4, -32 + bob); c.lineTo(0, -23 + bob); c.closePath(); c.fill();
    c.fillStyle = shade(outfit, 0.7); c.fillRect(-0.4, -23 + bob, 0.8, 11);
  }
}
