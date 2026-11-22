// Uzak oyuncular: sunucudan gelen hedef konuma istemcide yumuşak geçiş (lerp) uygulanır.
export function createRemotes() {
  const map = new Map();

  return {
    map,
    all: () => [...map.values()],
    clear: () => map.clear(),
    remove: id => map.delete(id),
    add(p) {
      map.set(p.id, { ...p, tx: p.x, ty: p.y, walk: false, live: false, emote: null });
    },
    update(id, m) {
      const r = map.get(id);
      if (!r) return;
      r.tx = m.x; r.ty = m.y; r.d = m.d; r.m = m.m; r.s = m.s; r.z = m.z;
    },
    step(dt) {
      const k = 1 - Math.exp(-dt * 12);
      for (const r of map.values()) {
        const dx = r.tx - r.x, dy = r.ty - r.y, d2 = dx * dx + dy * dy;
        if (d2 > 250 * 250) { r.x = r.tx; r.y = r.ty; r.walk = false; continue; }
        r.x += dx * k; r.y += dy * k;
        r.walk = d2 > 0.8;
      }
    },
  };
}
