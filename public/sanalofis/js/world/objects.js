// Derinliğe göre sıralanan sahne nesneleri: cam duvar parçaları, mobilya, sandalyeler. Karakterler çizimde araya katılır.
import { WALLS, FURN, CHAIRS } from './map.js';
import { P, px, py, poly, ROOM_H } from './iso.js';
import { FDRAW, FPARTS, chairSeat, chairBack, chairBackKey } from './furniture.js';
import { PROPS } from './props.js';

const DRAW = { ...FDRAW, ...PROPS };
export const OBJECTS = [];
const add = (key, cx, cy, draw, nocull = false) => OBJECTS.push({ key, sx: px(cx, cy), sy: py(cx, cy), draw, nocull });

// Cam bölme: 36 birimlik parçalara bölünür ki karakterler duvarın önünde/arkasında doğru sıralansın.
// Cam dolgusu duvar başına tek parça çizilir (parça birleşimlerinde çizgi kalmasın); çerçeve parçalara bölünür.
function glassFill(c, x, y, w, h) {
  const Z = ROOM_H;
  poly(c, [P(x, y + h, 0), P(x + w, y + h, 0), P(x + w, y + h, Z), P(x, y + h, Z)], 'rgba(190,232,250,.22)');
  poly(c, [P(x + w, y, 0), P(x + w, y + h, 0), P(x + w, y + h, Z), P(x + w, y, Z)], 'rgba(150,200,228,.27)');
}

function glass(c, s) {
  const { x, y, w, h } = s, Z = ROOM_H;
  poly(c, [P(x, y, Z), P(x + w, y, Z), P(x + w, y + h, Z), P(x, y + h, Z)], '#0b1220');
  c.strokeStyle = '#0b1220'; c.lineWidth = 2.5; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(...P(x, y + h, 0)); c.lineTo(...P(x + w, y + h, 0)); c.lineTo(...P(x + w, y, 0));
  c.stroke();
  const post = (X, Y) => { c.beginPath(); c.moveTo(...P(X, Y, 0)); c.lineTo(...P(X, Y, Z)); c.stroke(); };
  if (s.first) { post(x, y + h); post(x + w, y); }
  if (s.last) post(x + w, y + h);
}

const STEP = 36;
for (const w of WALLS.slice(4)) {
  const alongX = w.w >= w.h, len = alongX ? w.w : w.h;
  add(w.x + w.w / 2 + w.y + w.h / 2 - 2, w.x + w.w / 2, w.y + w.h / 2, c => glassFill(c, w.x, w.y, w.w, w.h), true);
  for (let o = 0; o < len; o += STEP) {
    const l = Math.min(STEP, len - o);
    const s = alongX ? { x: w.x + o, y: w.y, w: l, h: w.h } : { x: w.x, y: w.y + o, w: w.w, h: l };
    s.first = o === 0; s.last = o + l >= len;
    add(s.x + s.w / 2 + s.y + s.h / 2, s.x + s.w / 2, s.y + s.h / 2, c => glass(c, s));
  }
}

for (const f of FURN) {
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2, parts = FPARTS[f.t]?.(f);
  if (parts) parts.forEach(p => add(p.key, cx, cy, p.draw));
  else if (DRAW[f.t]) add(f.t === 'tv' ? cx + 20 : cx + cy, cx, cy, (c, S, t) => DRAW[f.t](c, f, S, t));
}

for (const ch of CHAIRS) {
  add(ch.x + ch.y - 1, ch.x, ch.y, c => chairSeat(c, ch));
  add(chairBackKey(ch), ch.x, ch.y, c => chairBack(c, ch));
}

OBJECTS.sort((a, b) => a.key - b.key);
