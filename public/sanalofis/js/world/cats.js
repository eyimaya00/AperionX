// Dolaşan kediler: rotalar tohumlu rastgeleyle bir kez hesaplanır; konum sunucu saatiyle zamanın bir
// fonksiyonudur, böylece herkes kedileri aynı yerde görür (ağ trafiği yok). Kapı kilitlerine takılmazlar.
import { collides } from './map.js';
import { findPath } from './path.js';
import { WORLD } from '../config.js';
import { px, py } from './iso.js';
import { CAT_LOOKS } from './cat-draw.js';

const SPEED = 46, LEGS = 26;
const rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function spots() {
  const out = [];
  for (let y = 40; y < WORLD.h - 30; y += 48) for (let x = 40; x < WORLD.w - 30; x += 48) if (!collides(x, y, 13)) out.push({ x, y });
  return out;
}

function timeline(seed, pois) {
  const r = rng(seed), start = pois[Math.floor(r() * pois.length)];
  const segs = [];
  let cur = start, t0 = 0;
  for (let i = 0; i <= LEGS; i++) {
    const dest = i === LEGS ? start : pois[Math.floor(r() * pois.length)];
    const path = findPath(cur.x, cur.y, dest.x, dest.y);
    if (!path || !path.length) continue;
    const pts = [cur, ...path], cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const len = cum[cum.length - 1], walk = len / SPEED, sleepy = r() < 0.28, rest = sleepy ? 14 + r() * 16 : 3 + r() * 8;
    segs.push({ t0, walk, rest, pts, cum, len, mode: sleepy ? 'sleep' : 'sit' });
    t0 += walk + rest; cur = pts[pts.length - 1];
  }
  return { segs, total: Math.max(1, t0) };
}

export function createCats(now) {
  const cats = CAT_LOOKS.map((look, i) => ({ id: i, look: i, x: 0, y: 0, flip: 1, mode: 'sit', say: 0, tl: null, idx: 0, off: i * 137 }));
  // Harita değişince (bölge kapanıp açılınca) rotalar yeniden hesaplanır.
  function reset() { const pois = spots(); cats.forEach((c, i) => { c.tl = timeline(7919 * (i + 1), pois); c.idx = 0; }); }
  reset();

  function place(c, T) {
    const { segs, total } = c.tl, m = (T + c.off) % total;
    if (m < segs[c.idx].t0) c.idx = 0;
    while (c.idx < segs.length - 1 && m >= segs[c.idx + 1].t0) c.idx++;
    const s = segs[c.idx], local = m - s.t0;
    if (local >= s.walk) { const p = s.pts[s.pts.length - 1]; c.x = p.x; c.y = p.y; c.mode = s.mode; return; }
    const d = (local / s.walk) * s.len;
    let k = 1; while (k < s.cum.length - 1 && s.cum[k] < d) k++;
    const a = s.pts[k - 1], b = s.pts[k], u = (d - s.cum[k - 1]) / Math.max(1e-6, s.cum[k] - s.cum[k - 1]);
    c.x = a.x + (b.x - a.x) * u; c.y = a.y + (b.y - a.y) * u; c.mode = 'walk';
    const sx = (b.x - a.x) - (b.y - a.y);
    if (Math.abs(sx) > 0.01) c.flip = sx > 0 ? 1 : -1;
  }

  return {
    cats, reset,
    update() { const T = now(); cats.forEach(c => place(c, T)); },
    // Ekran noktasındaki kediyi bulur (sevmek için tıklama).
    pick(sx, sy) { return cats.find(c => Math.hypot(sx - px(c.x, c.y), sy - py(c.x, c.y, 10)) < 20) || null; },
  };
}
