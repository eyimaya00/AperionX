// Yerel oyuncu: klavye ve tıkla-yürü hareketi, çarpışma, oturma ve ışınlanma.
import { PLAYER, PROX } from '../config.js';
import { collides, CHAIRS, SPOTS, zoneAt, freeSpotNear, setInside, anyLock } from './map.js';
import { findPath, refreshGrid } from './path.js';
import { dir4, seatDir } from './iso.js';

export function createPlayer(init) {
  const me = { ...init, d: 'down', m: false, s: false, emote: null, live: false, isMe: true };
  const half = PLAYER.half;
  let path = [], goal = null, onArrive = null, stuck = 0, inited = false;

  function step(dx, dy) {
    let ok = false;
    if (dx && !collides(me.x + dx, me.y, half)) { me.x += dx; ok = true; }
    if (dy && !collides(me.x, me.y + dy, half)) { me.y += dy; ok = true; }
    return ok;
  }
  // Bölge değişince kapı kilidi "içeridekiler çıkabilir" kuralı için güncellenir.
  function zoneSync() {
    const z = zoneAt(me.x, me.y).id;
    if (z !== me.z || !inited) { me.z = z; inited = true; setInside(z); if (anyLock()) refreshGrid(); }
  }
  function cancel() { path = []; goal = null; onArrive = null; stuck = 0; }
  function arrive() {
    const cb = onArrive;
    cancel();
    if (cb) cb();
  }

  function update(dt, ax, ay) {
    let dx = ax, dy = ay;
    if (dx || dy) cancel();
    else if (path.length) {
      const t = path[0], tx = t.x - me.x, ty = t.y - me.y, dist = Math.hypot(tx, ty);
      if (dist < 5) { path.shift(); if (!path.length) arrive(); }
      else { dx = tx / dist; dy = ty / dist; }
    }
    me.m = false;
    if (me.s) { if (!dx && !dy) return; me.s = false; }
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1, sp = PLAYER.speed * dt, ox = me.x, oy = me.y;
      me.m = step((dx / len) * sp, (dy / len) * sp);
      me.d = dir4(dx, dy);
      if (path.length) { // takıldıysa yolu yeniden hesapla, olmazsa vazgeç
        stuck = Math.hypot(me.x - ox, me.y - oy) < sp * 0.25 ? stuck + dt : 0;
        if (stuck > 0.6) {
          const g = goal, cb = onArrive;
          cancel();
          if (g) walkTo(g.x, g.y, cb, true);
        }
      }
    }
    zoneSync();
  }

  function walkTo(x, y, cb, retry = false) {
    const p = findPath(me.x, me.y, x, y);
    if (!p) { if (!retry) cancel(); return false; }
    path = p; goal = { x, y }; onArrive = cb || null; stuck = 0;
    if (!p.length) arrive();
    return true;
  }
  function teleport(x, y) {
    const p = freeSpotNear(x, y, half);
    cancel();
    me.x = p.x; me.y = p.y; me.s = false; me.m = false;
    zoneSync();
  }
  function sit(ch) {
    cancel();
    me.x = ch.x; me.y = ch.y; me.d = seatDir(ch.f); me.s = true; me.m = false;
    zoneSync();
  }

  // E tuşu için yakındaki etkileşim: sandalye ya da tıklanabilir nokta.
  function nearest(others) {
    if (me.s) return null;
    let best = null, bd = Infinity;
    for (const c of CHAIRS) {
      const d = Math.hypot(c.x - me.x, c.y - me.y);
      if (d < PROX.interact && d < bd && !others.some(o => o.s && Math.hypot(o.x - c.x, o.y - c.y) < 8)) {
        best = { kind: 'chair', x: c.x, y: c.y, ref: c, label: 'Otur' }; bd = d;
      }
    }
    for (const s of SPOTS) {
      const d = Math.hypot(s.x - me.x, s.y - me.y);
      if (d < s.r && d < bd) { best = { kind: 'spot', x: s.x, y: s.y, ref: s, label: s.label }; bd = d; }
    }
    return best;
  }

  // Sunucu kilitli odaya girişi reddedince eski konuma döner.
  function snap(x, y) { cancel(); me.x = x; me.y = y; me.s = false; me.m = false; zoneSync(); }
  zoneSync();
  return { me, update, sit, teleport, snap, walkTo, cancel, nearest, target: () => goal };
}
