// Canvas çizimi: statik katman önbelleği, kamera, derinlik sıralı sahne, tabelalar.
import { COLORS } from '../config.js';
import { ZONES } from './map.js';
import { SW, SH, px, py } from './iso.js';
import { buildStatic } from './floor.js';
import { OBJECTS } from './objects.js';
import { drawAvatar, drawLabel, drawRing, drawPulse } from './avatar.js';
import { signPill } from './labels.js';

const SS = 2, MAX_ZOOM = 1.15, MARGIN = 260;

export function createRenderer(canvas, assets) {
  const ctx = canvas.getContext('2d');
  const stat = buildStatic(assets, SS);
  const cam = { x: 0, y: 0 };
  let dpr = 1, zoom = MAX_ZOOM, vw = 0, vh = 0, snap = true;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    zoom = Math.min(MAX_ZOOM, Math.max(0.65, innerWidth / 1250));
    vw = innerWidth / zoom; vh = innerHeight / zoom; snap = true;
  }
  addEventListener('resize', resize);
  resize();

  const clampCam = (v, max) => (max <= 0 ? max / 2 : Math.max(0, Math.min(max, v)));

  function frame({ dt, t, me, others, rings, hint, marker, S }) {
    const tx = clampCam(px(me.x, me.y) - vw / 2, SW - vw), ty = clampCam(py(me.x, me.y) - vh * 0.6, SH - vh);
    if (snap) { cam.x = tx; cam.y = ty; snap = false; }
    else { const k = 1 - Math.exp(-dt * 8); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; }

    const s = zoom * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
    ctx.drawImage(stat, 0, 0, SW, SH);

    if (hint) drawPulse(ctx, hint.x, hint.y, t);
    if (marker) drawPulse(ctx, marker.x, marker.y, t, '#00ff41');
    const people = [me, ...others];
    for (const p of people) if (rings.has(p.id)) drawRing(ctx, p, t);
    if (me.isMe) { ctx.save(); ctx.strokeStyle = 'rgba(99,102,241,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px(me.x, me.y), py(me.x, me.y) + 1, 15, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }

    // Derinlik sıralaması: nesneler önceden sıralı; karakterler (x+y) anahtarıyla araya girer.
    const avs = people.map(p => ({ key: p.x + p.y, p })).sort((a, b) => a.key - b.key);
    let ai = 0;
    const flush = key => { while (ai < avs.length && avs[ai].key <= key) drawAvatar(ctx, avs[ai++].p, t); };
    const x0 = cam.x - MARGIN, x1 = cam.x + vw + MARGIN, y0 = cam.y - MARGIN, y1 = cam.y + vh + MARGIN;
    for (const o of OBJECTS) {
      flush(o.key);
      if (!o.nocull && (o.sx < x0 || o.sx > x1 || o.sy < y0 || o.sy > y1)) continue;
      o.draw(ctx, S, t);
    }
    flush(Infinity);

    for (const z of ZONES) {
      const txt = z.sign && S.cfg?.signs?.[z.id];
      if (!txt) continue;
      const pill = signPill(txt, z.sign.color);
      ctx.drawImage(pill.cv, px(z.sign.x, z.sign.y) - pill.w / 2, py(z.sign.x, z.sign.y, z.sign.z) - pill.h / 2, pill.w, pill.h);
    }
    for (const p of [...people].sort((a, b) => a.y - b.y)) drawLabel(ctx, p, t);
  }

  // Tarayıcı koordinatını sahne (izometrik piksel) koordinatına çevirir.
  const scenePoint = (cx, cy) => ({ sx: cx / zoom + cam.x, sy: cy / zoom + cam.y });
  return { frame, resize, scenePoint };
}
