// Tıkla-yürü için yol bulma: 20 birimlik ızgarada A*, ardından görüş hattı ile yol düzleştirme.
import { WORLD } from '../config.js';
import { collides } from './map.js';

const CELL = 20, R = 10;
const GW = Math.ceil(WORLD.w / CELL), GH = Math.ceil(WORLD.h / CELL), N = GW * GH;
const open = new Uint8Array(N);
// Izgara kilit durumuna göre yeniden hesaplanır (kapı kilitlenince/açılınca ya da oda değişince).
export function refreshGrid() {
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) open[j * GW + i] = collides(i * CELL + CELL / 2, j * CELL + CELL / 2, R) ? 0 : 1;
}
refreshGrid();

const cellOf = (x, y) => Math.max(0, Math.min(GH - 1, Math.floor(y / CELL))) * GW + Math.max(0, Math.min(GW - 1, Math.floor(x / CELL)));
const center = i => ({ x: (i % GW) * CELL + CELL / 2, y: Math.floor(i / GW) * CELL + CELL / 2 });

function nearestOpen(i0) {
  if (open[i0]) return i0;
  const ci = i0 % GW, cj = Math.floor(i0 / GW);
  for (let r = 1; r <= 8; r++) {
    let best = -1, bd = Infinity;
    for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
      if (i < 0 || j < 0 || i >= GW || j >= GH || (Math.abs(i - ci) !== r && Math.abs(j - cj) !== r)) continue;
      const k = j * GW + i, d = (i - ci) ** 2 + (j - cj) ** 2;
      if (open[k] && d < bd) { bd = d; best = k; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

export function lineClear(ax, ay, bx, by) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 5));
  for (let k = 1; k <= n; k++) if (collides(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, 9.5)) return false;
  return true;
}

// Basit ikili yığın (en küçük f önce).
class Heap {
  constructor() { this.a = []; }
  push(f, i) {
    const a = this.a; a.push([f, i]);
    for (let k = a.length - 1; k > 0;) { const p = (k - 1) >> 1; if (a[p][0] <= a[k][0]) break; [a[p], a[k]] = [a[k], a[p]]; k = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let k = 0; ;) {
        let m = k; const l = 2 * k + 1, r = l + 1;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k], a[m]]; k = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

// Başlangıçtan hedefe nokta listesi döner; ulaşılamazsa null. Boş liste = zaten oradasın.
export function findPath(sx, sy, tx, ty) {
  const s = nearestOpen(cellOf(sx, sy)), t = nearestOpen(cellOf(tx, ty));
  if (s < 0 || t < 0) return null;
  const g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const tc = center(t), hf = i => { const c = center(i); return Math.hypot(c.x - tc.x, c.y - tc.y) / CELL; };
  const heap = new Heap();
  g[s] = 0; heap.push(hf(s), s);
  while (heap.size) {
    const [, i] = heap.pop();
    if (done[i]) continue;
    done[i] = 1;
    if (i === t) break;
    const ci = i % GW, cj = Math.floor(i / GW);
    for (const [di, dj, cost] of NB) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
      const k = nj * GW + ni;
      if (!open[k] || done[k]) continue;
      if (di && dj && (!open[cj * GW + ni] || !open[nj * GW + ci])) continue; // köşe kesme yok
      const ng = g[i] + cost;
      if (ng < g[k]) { g[k] = ng; prev[k] = i; heap.push(ng + hf(k), k); }
    }
  }
  if (!done[t]) return null;
  const cells = [];
  for (let i = t; i >= 0; i = prev[i]) cells.push(i);
  cells.reverse();
  const pts = cells.map(center);
  pts[pts.length - 1] = collides(tx, ty, 9) ? pts[pts.length - 1] : { x: tx, y: ty };
  // Düzleştirme: görüş hattı açık olan en uzak noktaya doğrudan git.
  const out = [];
  let cur = { x: sx, y: sy }, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineClear(cur.x, cur.y, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]); cur = pts[j]; i = j + 1;
  }
  if (out.length === 1 && Math.hypot(out[0].x - sx, out[0].y - sy) < 5) return [];
  return out;
}
