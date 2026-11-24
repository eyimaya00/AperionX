// Harita verisi: bölgeler, cam duvarlar, mobilya, sandalyeler, tıklanabilir noktalar ve çarpışma (düz 2B).
import { WORLD } from '../config.js';
import { EXTRA_ZONES, EXTRA_WALLS, EXTRA_DOORS, EXTRA_RUGS, buildRooms } from './map-rooms.js';

const { w: W, h: H } = WORLD;
const T = 20;

// Sıra önemli: özel odalar ve açık bölgeler önce, "koridor" (taban) en sonda.
export const ZONES = [
  { id: 'yayin', name: 'Yayın Kurulu & Dergi', x: 20, y: 20, w: 480, h: 320, private: true, floor: '#e2def2', tex: 'carpet', sign: { x: 420, y: 340, z: 84, color: '#6366f1' } },
  { id: 'toplanti', name: 'Toplantı Salonu', x: 1100, y: 20, w: 480, h: 320, private: true, floor: '#efe5d2', tex: 'carpet', sign: { x: 1180, y: 340, z: 84, color: '#f59e0b' } },
  { id: 'sosyal', name: 'Sosyal Medya Odası', x: 20, y: 452, w: 480, h: 308, private: true, floor: '#f4dfd8', tex: 'carpet', sign: { x: 420, y: 440, z: 84, color: '#ec4899' } },
  { id: 'yonetim', name: 'Yönetim Ofisi', x: 1100, y: 452, w: 480, h: 308, private: true, floor: '#e4e0d6', tex: 'carpet', sign: { x: 1180, y: 440, z: 84, color: '#0ea5e9' } },
  { id: 'lobi', name: 'Lobi', x: 512, y: 20, w: 576, h: 320, private: false, floor: '#f1ebe0', tex: 'tile', sign: { x: 800, y: 336, z: 70, color: '#8b5cf6' } },
  { id: 'mola', name: 'Mola Alanı', x: 520, y: 790, w: 560, h: 640, private: false, floor: '#d5e7d8', tex: 'carpet', sign: { x: 1072, y: 790, z: 70, color: '#22c55e' } },
  ...EXTRA_ZONES,
  { id: 'koridor', name: 'Ortak Alan', base: true, private: false },
];

// İlk 4 duvar dış sınırdır (çizimde yalnızca kuzey/batı görünür). Gerisi cam bölme.
export const WALLS = [
  { x: 0, y: 0, w: W, h: T }, { x: 0, y: H - T, w: W, h: T },
  { x: 0, y: 0, w: T, h: H }, { x: W - T, y: 0, w: T, h: H },
  // Yayın Kurulu (kapı: x 380–460)
  { x: 500, y: 20, w: 12, h: 332 }, { x: 20, y: 340, w: 360, h: 12 }, { x: 460, y: 340, w: 52, h: 12 },
  // Toplantı Salonu (kapı: x 1140–1220)
  { x: 1088, y: 20, w: 12, h: 332 }, { x: 1088, y: 340, w: 52, h: 12 }, { x: 1220, y: 340, w: 360, h: 12 },
  // Sosyal Medya (kapı: x 380–460)
  { x: 500, y: 440, w: 12, h: 332 }, { x: 20, y: 440, w: 360, h: 12 }, { x: 460, y: 440, w: 52, h: 12 }, { x: 20, y: 760, w: 492, h: 12 },
  // Yönetim Ofisi (kapı: x 1140–1220)
  { x: 1088, y: 440, w: 12, h: 332 }, { x: 1088, y: 440, w: 52, h: 12 }, { x: 1220, y: 440, w: 360, h: 12 }, { x: 1088, y: 760, w: 492, h: 12 },
  ...EXTRA_WALLS,
];
// room: kilitlenebilen özel odanın kapısı.
export const DOORS = [
  { x: 380, y: 340, w: 80, h: 12, room: 'yayin' }, { x: 1140, y: 340, w: 80, h: 12, room: 'toplanti' },
  { x: 380, y: 440, w: 80, h: 12, room: 'sosyal' }, { x: 1140, y: 440, w: 80, h: 12, room: 'yonetim' },
  ...EXTRA_DOORS,
];

export const RUGS = [
  { x: 640, y: 80, w: 320, h: 190, color: '#cfc9f0', round: true },
  { x: 740, y: 288, w: 120, h: 38, color: '#6d5fd6', label: 'GİRİŞ' },
  { x: 650, y: 480, w: 300, h: 190, color: '#dccfb2' },
  { x: 1180, y: 70, w: 320, h: 235, color: '#d9cdb3', round: true },
  { x: 1220, y: 540, w: 260, h: 180, color: '#b9b2a6' },
  { x: 600, y: 830, w: 460, h: 140, color: '#bcdcc4' },
  { x: 40, y: 500, w: 360, h: 220, color: '#f0c9bd' },
  { x: 50, y: 70, w: 270, h: 230, color: '#cfc8ec' },
  ...EXTRA_RUGS,
];

export const FURN = [];
export const CHAIRS = [];
export const SOLIDS = [...WALLS];

const FACE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
let curArea = null;
const setArea = a => { curArea = a; };
const chair = (x, y, dir) => CHAIRS.push({ x, y, f: FACE[dir], area: curArea });
const chairToward = (x, y, tx, ty) => {
  const dx = tx - x, dy = ty - y, l = Math.hypot(dx, dy);
  CHAIRS.push({ x, y, f: [dx / l, dy / l] });
};
function add(item, solid = true) {
  item.area = curArea; FURN.push(item);
  if (solid === true) SOLIDS.push({ x: item.x, y: item.y, w: item.w, h: item.h, area: curArea });
  else if (solid) SOLIDS.push({ ...solid, area: curArea });
}
const plant = (x, y) => add({ t: 'plant', x, y, w: 28, h: 28 });
const sofa = (x, y, w, h, back, seats, dir) => {
  const strip = back === 'top' ? { x, y, w, h: 16 } : { x, y: y + h - 16, w, h: 16 };
  add({ t: 'sofa', x, y, w, h, back }, strip);
  seats.forEach(sx => chair(sx, back === 'top' ? y + h / 2 + 8 : y + h / 2 - 8, dir));
};

// --- Lobi ---
add({ t: 'peri', x: 780, y: 122, w: 40, h: 30 });
add({ t: 'tv', id: 'lobby', x: 540, y: 20, w: 130, h: 12 }, false);
sofa(540, 250, 170, 56, 'bottom', [575, 625, 675], 'up');
sofa(890, 250, 170, 56, 'bottom', [925, 975, 1025], 'up');
[[530, 36], [1042, 36], [530, 300], [1042, 300], [664, 36], [906, 36]].forEach(([x, y]) => plant(x, y));

// --- Yayın Kurulu & Dergi ---
[[60, 90], [200, 90], [60, 200], [200, 200]].forEach(([x, y]) => { add({ t: 'desk', x, y, w: 96, h: 50 }); chair(x + 48, y + 68, 'up'); });
add({ t: 'pano', board: 'yayin', x: 310, y: 56, w: 170, h: 12 });
[[34, 300], [466, 300], [290, 40]].forEach(([x, y]) => plant(x, y));

// --- Sosyal Medya Odası ---
[[60, 540], [260, 600]].forEach(([x, y]) => {
  add({ t: 'table', x, y, w: 120, h: 60 });
  [x + 30, x + 90].forEach(cx => { chair(cx, y - 18, 'down'); chair(cx, y + 78, 'up'); });
});
add({ t: 'pano', board: 'sosyal', x: 100, y: 468, w: 170, h: 12 });
add({ t: 'beanbag', x: 60, y: 690, w: 50, h: 50 }, false);
add({ t: 'beanbag', x: 130, y: 700, w: 50, h: 50, alt: true }, false);
chair(85, 715, 'up'); chair(155, 725, 'up');
add({ t: 'ringlight', x: 440, y: 690, w: 30, h: 30 });
[[30, 722], [468, 462], [440, 730]].forEach(([x, y]) => plant(x, y));

// --- Toplantı Salonu: ön duvarda ekran, karşısında yarım ay koltuklar ---
add({ t: 'tv', id: 'present', x: 1170, y: 20, w: 340, h: 12 }, false);
[[125, [25, 50, 75, 105, 130, 155]], [195, [35, 62, 118, 145]]].forEach(([r, angs]) => {
  angs.forEach(a => chairToward(1340 + r * Math.cos(a * Math.PI / 180), 50 + r * Math.sin(a * Math.PI / 180), 1340, 40));
});
[[1112, 36], [1546, 36], [1112, 306], [1546, 306]].forEach(([x, y]) => plant(x, y));

// --- Yönetim Ofisi ---
add({ t: 'adesk', x: 1250, y: 560, w: 200, h: 80 });
chair(1350, 538, 'down'); chair(1305, 668, 'up'); chair(1395, 668, 'up');
sofa(1120, 690, 150, 56, 'bottom', [1155, 1195, 1235], 'up');
[[1104, 470], [1546, 470], [1546, 716], [1300, 470]].forEach(([x, y]) => plant(x, y));

// --- Mola Alanı (kuzey: kahve + oturma, güney: bar + masa; oyun masası ve bar buildRooms içinde) ---
add({ t: 'coffee', x: 540, y: 800, w: 70, h: 46 });
sofa(640, 850, 180, 56, 'top', [675, 730, 785], 'down');
add({ t: 'ctable', x: 680, y: 928, w: 100, h: 30 });
sofa(860, 905, 170, 56, 'bottom', [895, 945, 995], 'up');
[[1050, 800], [830, 960], [1046, 1340], [534, 1340]].forEach(([x, y]) => plant(x, y));

// --- Ortak alan (koridor) ---
add({ t: 'table', x: 690, y: 520, w: 220, h: 90 });
[730, 800, 870].forEach(x => { chair(x, 500, 'down'); chair(x, 630, 'up'); });
[[560, 420], [1010, 420]].forEach(([x, y]) => plant(x, y));

const EXTRA_SPOTS = buildRooms({ add, plant, sofa, chair, setArea });

// Tıklanabilir noktalar. x,y: yaklaşma noktası, r: E tuşu/etkileşim yarıçapı,
// hit: ekranda tıklama dairesi (dünya konumu + yükseklik z + piksel yarıçapı).
export const SPOTS = [
  { id: 'peri', action: 'peri', label: 'Peri ile konuş', x: 800, y: 200, r: 80, hit: [{ x: 800, y: 138, z: 62, r: 52 }] },
  { id: 'pano-yayin', action: 'board:yayin', label: 'Yayın akış panosunu aç', x: 395, y: 112, r: 70, hit: [{ x: 395, y: 68, z: 66, r: 46 }, { x: 440, y: 68, z: 66, r: 30 }] },
  { id: 'pano-sosyal', action: 'board:sosyal', label: 'Paylaşım panosunu aç', x: 185, y: 524, r: 70, hit: [{ x: 185, y: 480, z: 66, r: 46 }, { x: 230, y: 480, z: 66, r: 30 }] },
  { id: 'sunum', action: 'present', label: 'Sunum ekranı', x: 1340, y: 112, r: 90, hit: [{ x: 1260, y: 20, z: 94, r: 54 }, { x: 1340, y: 20, z: 94, r: 54 }, { x: 1420, y: 20, z: 94, r: 54 }] },
  { id: 'kahve', action: 'coffee', label: 'Kahve yap', x: 575, y: 868, r: 62, hit: [{ x: 575, y: 823, z: 36, r: 36 }] },
  { id: 'yonetim', action: 'admin', label: 'Yönetim masası', x: 1350, y: 695, r: 80, hit: [{ x: 1350, y: 600, z: 30, r: 64 }] },
  ...EXTRA_SPOTS,
];

// Yönetici bazı bölgeleri kapatabilir (Mutfak, Aktivite): o bölgenin zemin/duvar/mobilya/noktaları listelerden çıkar.
export const AREAS = ['mutfak', 'aktivite'];
const ALL = { zones: [...ZONES], walls: [...WALLS], doors: [...DOORS], rugs: [...RUGS], furn: [...FURN], chairs: [...CHAIRS], solids: [...SOLIDS], spots: [...SPOTS] };
const LIVE = [[ZONES, 'zones'], [WALLS, 'walls'], [DOORS, 'doors'], [RUGS, 'rugs'], [FURN, 'furn'], [CHAIRS, 'chairs'], [SOLIDS, 'solids'], [SPOTS, 'spots']];
let closed = new Set();
export const isClosed = a => closed.has(a);
export function setClosed(list) {
  const next = new Set((list || []).filter(a => AREAS.includes(a)));
  if (next.size === closed.size && [...next].every(a => closed.has(a))) return false;
  closed = next;
  for (const [dst, key] of LIVE) { const src = ALL[key].filter(o => !closed.has(o.area)); dst.length = 0; dst.push(...src); }
  return true;
}

// Kapı kilidi: kilitli özel odaya DIŞARIDAN giriş engellenir (içeridekiler çıkabilir).
const GATES = DOORS.filter(d => d.room).map(d => ({ ...d, on: false }));
let inside = null;
export const setLock = (room, on) => { const g = GATES.find(x => x.room === room); if (g) g.on = on; };
export const isLocked = room => GATES.some(g => g.room === room && g.on);
export const anyLock = () => GATES.some(g => g.on);
export const setInside = z => { inside = z; };

export const zoneAt = (x, y) =>
  ZONES.find(z => !z.base && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) || ZONES.find(z => z.base);
export const zoneById = id => ALL.zones.find(z => z.id === id) || ALL.zones.find(z => z.base);
export const isPrivate = id => !!zoneById(id).private;
export const zoneName = id => zoneById(id).name;

export function collides(x, y, half) {
  for (const r of SOLIDS) {
    if (x + half > r.x && x - half < r.x + r.w && y + half > r.y && y - half < r.y + r.h) return true;
  }
  for (const r of GATES) {
    if (r.on && inside !== r.room && x + half > r.x && x - half < r.x + r.w && y + half > r.y && y - half < r.y + r.h) return true;
  }
  return false;
}

// (x,y) boş değilse çevresinde çarpışmasız en yakın noktayı bulur.
export function freeSpotNear(x, y, half = 9) {
  if (!collides(x, y, half)) return { x, y };
  for (const rad of [34, 50, 70, 95]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (!collides(px, py, half)) return { x: px, y: py };
    }
  }
  return { x: 800, y: 280 };
}
