// Hacimli sade karakter figürü, rol rozeti, etkileşim halkası, ipucu işareti ve emoji.
import { COLORS } from '../config.js';
import { px, py, shade, floorRing } from './iso.js';
import { drawHair, drawAcc, drawTop } from './avatar-parts.js';

const TAU = Math.PI * 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const STATUS_COLOR = {
  'Müsait': COLORS.signal, 'Odaklandım, rahatsız etmeyin': '#ef4444',
  'Toplantıda': COLORS.accent, 'Molada ☕': '#f59e0b',
};

const grad = (c, x0, y0, x1, y1, a, b) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
const dot = (c, x, y, r, fill) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };

// Ayakların bulunduğu nokta (0,0) olacak şekilde figürü çizer (giriş ekranı önizlemesi de bunu kullanır).
export function drawFigure(c, p, t) {
  const look = p.look || {}, skin = look.skin || '#e0a97a', hair = look.hair || '#1f2937', outfit = look.outfit || '#6366f1', pants = look.pants || '#334155';
  const walking = !!(p.m || p.walk) && !p.s, ph = t * 12;
  const sw = walking ? Math.sin(ph) : 0, bob = walking ? -Math.abs(Math.sin(ph)) * 1.8 : 0;
  const d = p.d || 'down', back = d === 'up', side = d === 'left' || d === 'right', fl = d === 'left' ? -1 : 1;
  const mug = /☕/.test(p.status || '');

  c.save();
  c.scale(1.2, 1.2);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 1, 11, 4.5, 0, 0, TAU); c.fill();
  if (p.s) c.translate(0, 2);
  else {
    for (const i of [-1, 1]) {
      const lx = i * 3.6, sy = side ? sw * i * 2.5 : 0;
      c.fillStyle = pants; c.beginPath(); c.roundRect(lx - 2.6 + sy, -14, 5.2, 13, 2); c.fill();
      c.fillStyle = '#f8fafc'; c.beginPath(); c.ellipse(lx + sy + (side ? fl * 1.5 : 0), -0.5, 3.6, 2.2, 0, 0, TAU); c.fill();
    }
  }
  // gövde
  c.fillStyle = grad(c, -8, 0, 8, 0, shade(outfit, 1.2), shade(outfit, 0.74));
  c.beginPath(); c.roundRect(-8, -32 + bob, 16, 21, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.roundRect(-6, -30 + bob, 5, 14, 3); c.fill();
  drawTop(c, look.top | 0, outfit, back, bob);
  // kollar ve eller
  const handY = -15 + bob;
  for (const i of [-1, 1]) {
    const ax = side ? fl * (i === 1 ? 2 : -1) : i * 9.6, ay = handY + sw * i * (side ? 0 : 2.2);
    if (!side) { c.fillStyle = shade(outfit, 0.9); c.beginPath(); c.roundRect(i * 8.2 - 2.2, -30 + bob, 4.4, 14 + sw * i * 1.5, 2); c.fill(); }
    dot(c, ax, ay, 2.6, skin);
  }
  if (mug) { // elinde kahve
    const mx = side ? fl * 6 : 11, my = handY - 6;
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(mx - 3.4, my, 6.8, 7, 1.5); c.fill();
    c.fillStyle = '#7c4a2d'; c.fillRect(mx - 2.6, my + 0.8, 5.2, 1.6);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(mx - 1, my - 1); c.quadraticCurveTo(mx + 1, my - 4 - Math.sin(t * 5) * 1.5, mx - 1, my - 7); c.stroke();
  }
  // boyun ve baş
  c.fillStyle = shade(skin, 0.85); c.fillRect(-3, -34 + bob, 6, 5);
  const hy = -43 + bob, hx = side ? fl * 0.8 : 0;
  const hg = c.createRadialGradient(hx - 3.5, hy - 4, 1, hx, hy, 11);
  hg.addColorStop(0, shade(skin, 1.15)); hg.addColorStop(1, shade(skin, 0.8));
  c.fillStyle = hg; c.beginPath(); c.arc(hx, hy, 10.5, 0, TAU); c.fill();
  drawHair(c, look.hairStyle | 0, hair, hx, hy, d);
  if (!back) {
    if (side) { dot(c, fl * 5, hy + 0.5, 1.7, '#111827'); dot(c, fl * 5.5, hy, 0.6, '#fff'); }
    else {
      for (const i of [-1, 1]) { dot(c, i * 3.8, hy + 1, 1.8, '#111827'); dot(c, i * 3.8 + 0.6, hy + 0.3, 0.6, '#fff'); }
      c.strokeStyle = shade(skin, 0.6); c.lineWidth = 1; c.beginPath(); c.arc(hx, hy + 4.2, 2.2, 0.2, Math.PI - 0.2); c.stroke();
    }
  }
  drawAcc(c, look.acc | 0, hx, hy, d, bob);
  c.restore();
}

export function drawAvatar(c, p, t) {
  c.save();
  c.translate(px(p.x, p.y), py(p.x, p.y));
  drawFigure(c, p, t);
  c.restore();
}

// İsim + küçük beyaz rol rozeti (+ durum noktası). Bağlantı varsa rozet yeşil çerçeveli.
export function drawLabel(c, p, t) {
  const sx = px(p.x, p.y), sy = py(p.x, p.y) - (p.s ? 0 : 2);
  const role = p.role || '', name = p.name || '?';
  c.save();
  c.textBaseline = 'middle'; c.textAlign = 'center';
  c.font = `600 9px ${FONT}`;
  const w = Math.max(34, c.measureText(role).width + 22), h = 16, y = sy - 82;
  c.shadowColor = 'rgba(15,23,42,.25)'; c.shadowBlur = 5; c.shadowOffsetY = 1;
  c.fillStyle = '#fff'; c.beginPath(); c.roundRect(sx - w / 2, y - h / 2, w, h, h / 2); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = p.live ? COLORS.signal : 'rgba(99,102,241,.45)'; c.lineWidth = p.live ? 2 : 1; c.stroke();
  dot(c, sx - w / 2 + 9, y, 3, p.dnd ? '#ef4444' : STATUS_COLOR[p.status] || '#94a3b8');
  c.fillStyle = '#334155'; c.textAlign = 'left'; c.fillText(role, sx - w / 2 + 15, y + 0.5);
  c.textAlign = 'center'; c.font = `700 12px ${FONT}`;
  c.lineWidth = 3.5; c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineJoin = 'round';
  c.strokeText(name, sx, y - 15); c.fillStyle = '#1e293b'; c.fillText(name, sx, y - 15);
  if (p.sharing) { c.font = '12px system-ui'; c.fillText('🖥️', sx + w / 2 + 8, y); }
  if (p.dnd) { c.font = '12px system-ui'; c.fillText('🔕', sx - w / 2 - 8, y); }
  if (p.say && t - p.say.t0 < 7) { // yazılı sohbet balonu
    c.font = `500 11px ${FONT}`;
    const txt = p.say.text.length > 46 ? `${p.say.text.slice(0, 45)}…` : p.say.text, bw = Math.min(190, c.measureText(txt).width + 18), by = y - 58;
    c.globalAlpha = Math.min(1, (7 - (t - p.say.t0)) / 0.6);
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(sx - bw / 2, by - 11, bw, 20, 9); c.moveTo(sx - 4, by + 9); c.lineTo(sx, by + 15); c.lineTo(sx + 4, by + 9); c.fill();
    c.fillStyle = '#1e293b'; c.fillText(txt, sx, by); c.globalAlpha = 1;
  }
  if (p.emote) {
    const age = t - p.emote.t0;
    if (age < 2.6) {
      c.globalAlpha = Math.min(1, (2.6 - age) / 0.8);
      c.font = '24px system-ui';
      c.fillText(p.emote.icon, sx + Math.sin(age * 5) * 3, y - 34 - age * 14);
    } else p.emote = null;
  }
  c.restore();
}

// Yakınlık etkileşim halkası: zeminde ince, yanıp sönen, "aktif sinyal" yeşili.
export function drawRing(c, p, t) {
  c.save();
  floorRing(c, p.x, p.y, 38 + Math.sin(t * 3) * 2);
  c.fillStyle = 'rgba(0,255,65,.08)'; c.fill();
  c.strokeStyle = 'rgba(0,200,60,.85)'; c.lineWidth = 1.6; c.setLineDash([6, 5]); c.lineDashOffset = -t * 18; c.stroke();
  c.restore();
}

// Zeminde nabız atan halka (yakındaki nesne ya da yürüme hedefi).
export function drawPulse(c, x, y, t, color = COLORS.accent) {
  c.save();
  floorRing(c, x, y, 16 + Math.sin(t * 5) * 3);
  c.strokeStyle = color; c.lineWidth = 2.2; c.globalAlpha = 0.65 + Math.sin(t * 5) * 0.3; c.stroke();
  c.restore();
}
