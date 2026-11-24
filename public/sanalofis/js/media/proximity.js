// Kiminle ses/görüntü bağlantısı kurulacağını belirleyen saf mantık.
import { PROX } from '../config.js';
import { isPrivate } from '../world/map.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Dönüş: Map<id, {gain}>. prev: önceki turda bağlı olanlar (histerezis için).
// En fazla PROX.maxPeers kişi, en yakınlar öncelikli.
export function computePeers(me, others, prev) {
  const cand = [];
  const myPriv = isPrivate(me.z);
  for (const o of others) {
    const oPriv = isPrivate(o.z), d = dist(me, o);
    if (!(myPriv && oPriv && me.z === o.z) && (me.dnd || o.dnd)) continue; // rahatsız etme: açık alan bağlantısı kurulmaz
    if (myPriv || oPriv) {
      // Özel oda: yalnızca aynı odadakiler, tam ses. Dışarıyla tam izolasyon.
      if (myPriv && oPriv && me.z === o.z) cand.push({ id: o.id, gain: 1, d });
      continue;
    }
    const limit = prev.has(o.id) ? PROX.disconnect : PROX.connect;
    if (d > limit) continue;
    const gain = d <= PROX.full ? 1 : Math.max(0, (PROX.disconnect - d) / (PROX.disconnect - PROX.full));
    cand.push({ id: o.id, gain, d });
  }
  cand.sort((a, b) => a.d - b.d);
  return new Map(cand.slice(0, PROX.maxPeers).map(c => [c.id, { gain: c.gain }]));
}

// Açık alanda birbirine yaklaşmış oyuncuların id'leri (etkileşim halkası için).
export function ringIds(me, others) {
  const set = new Set();
  const all = [me, ...others].filter(p => !isPrivate(p.z) && !p.dnd);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (dist(all[i], all[j]) <= PROX.connect) { set.add(all[i].id); set.add(all[j].id); }
    }
  }
  return set;
}
