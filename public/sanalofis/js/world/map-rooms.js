// Yeni bölgeler: Mutfak, Aktivite Alanı, gölet, mola barı ve oyun masaları (veri + mobilya yerleşimi).
export const EXTRA_ZONES = [
  { id: 'mutfak', name: 'Mutfak', x: 20, y: 962, w: 480, h: 468, private: false, floor: '#efe3cf', tex: 'tile', sign: { x: 260, y: 962, z: 84, color: '#f97316' }, area: 'mutfak' },
  { id: 'aktivite', name: 'Aktivite Alanı', x: 1100, y: 962, w: 480, h: 468, private: false, floor: '#d8ecee', tex: 'carpet', sign: { x: 1340, y: 962, z: 84, color: '#14b8a6' }, area: 'aktivite' },
];
// Kapılar yan duvarda (y 900–972), açık bölgedir, kilitlenmez.
const AM = { area: 'mutfak' }, AA = { area: 'aktivite' };
export const EXTRA_WALLS = [
  { x: 500, y: 962, w: 12, h: 128, ...AM }, { x: 500, y: 1162, w: 12, h: 268, ...AM },
  { x: 1088, y: 962, w: 12, h: 128, ...AA }, { x: 1088, y: 1162, w: 12, h: 268, ...AA },
  { x: 20, y: 962, w: 480, h: 12, ...AM }, { x: 1100, y: 962, w: 480, h: 12, ...AA },
];
export const EXTRA_DOORS = [{ x: 500, y: 1090, w: 12, h: 72, ...AM }, { x: 1088, y: 1090, w: 12, h: 72, ...AA }];
export const EXTRA_RUGS = [
  { x: 140, y: 982, w: 330, h: 310, color: '#e9d4ab', ...AM }, { x: 70, y: 1300, w: 380, h: 120, color: '#d8cfee', ...AM },
  { x: 1150, y: 990, w: 200, h: 130, color: '#9fd3cf', ...AA }, { x: 1350, y: 1080, w: 190, h: 150, color: '#e8c9d6', round: true, ...AA },
  { x: 1110, y: 1220, w: 300, h: 190, color: '#f2dcae', ...AA },
];

// api: map.js'in add/plant/sofa/chair yardımcıları. Dönüş: yeni tıklanabilir noktalar.
export function buildRooms({ add, plant, sofa, chair, setArea }) {
  setArea('mutfak');
  // Mutfak: duvar boyunca buzdolabı/tezgâh, ortada yemek masası, güneyde ada ve oturma köşesi
  add({ t: 'fridge', x: 24, y: 980, w: 50, h: 46 });
  add({ t: 'kcounter', x: 24, y: 1032, w: 50, h: 170 });
  add({ t: 'table', x: 240, y: 1000, w: 180, h: 70 });
  [270, 330, 390].forEach(x => { chair(x, 982, 'down'); chair(x, 1078, 'up'); });
  chair(222, 1035, 'right'); chair(438, 1035, 'left');
  add({ t: 'island', x: 150, y: 1180, w: 230, h: 70 });
  [190, 255, 320].forEach(x => { chair(x, 1162, 'down'); chair(x, 1268, 'up'); });
  sofa(230, 1350, 200, 56, 'bottom', [270, 330, 390], 'up');
  add({ t: 'ctable', x: 270, y: 1300, w: 120, h: 30 });
  add({ t: 'beanbag', x: 100, y: 1320, w: 50, h: 50 }, false);
  add({ t: 'beanbag', x: 150, y: 1365, w: 50, h: 50, alt: true }, false);
  [[86, 980], [470, 980], [470, 1290], [34, 1380], [470, 1380]].forEach(([x, y]) => plant(x, y));

  setArea('aktivite');
  // Aktivite Alanı: kuzeyde oyun makineleri, ortada masa tenisi ve oyun masası, güneyde dinlenme
  add({ t: 'pingpong', x: 1170, y: 1010, w: 160, h: 90 });
  add({ t: 'arcade', x: 1380, y: 980, w: 46, h: 40 });
  add({ t: 'arcade', x: 1440, y: 980, w: 46, h: 40, alt: true });
  add({ t: 'arcade', x: 1500, y: 980, w: 46, h: 40 });
  add({ t: 'dart', x: 1545, y: 1070, w: 30, h: 14 });
  add({ t: 'gametable', x: 1380, y: 1110, w: 110, h: 64 });
  [1410, 1465].forEach(x => { chair(x, 1092, 'down'); chair(x, 1194, 'up'); });
  sofa(1180, 1230, 200, 56, 'bottom', [1220, 1280, 1340], 'up');
  add({ t: 'beanbag', x: 1120, y: 1340, w: 50, h: 50, alt: true }, false);
  add({ t: 'beanbag', x: 1440, y: 1300, w: 50, h: 50 }, false);
  add({ t: 'beanbag', x: 1500, y: 1340, w: 50, h: 50, alt: true }, false);
  [[1108, 980], [1550, 980], [1550, 1190], [1550, 1380], [1108, 1395]].forEach(([x, y]) => plant(x, y));

  setArea(null);
  // Mola: oyun masası, bar ve yemek masası, içecek dolabı
  add({ t: 'gametable', x: 900, y: 846, w: 100, h: 44 });

  // Mevsimlik süsler (çizimi S.season'a göre değişir, çarpışmaz)
  add({ t: 'sdecor', v: 0, x: 580, y: 60, w: 40, h: 40 }, false);
  add({ t: 'sdecor', v: 1, x: 1020, y: 70, w: 30, h: 30 }, false);
  add({ t: 'sdecor', v: 1, x: 580, y: 392, w: 30, h: 30 }, false);

  // Gölet: Mola Alanı'nda mor koltukların önünde (arada boşluk kalır); iki yan boşlukta süs bitkileri
  add({ t: 'pond', x: 545, y: 1060, w: 490, h: 230 });
  [[546, 1020], [1040, 1020], [546, 1320], [1040, 1320]].forEach(([x, y]) => plant(x, y));
  [[60, 800], [460, 800], [250, 880], [60, 920], [460, 920], [1120, 800], [1560, 800], [1340, 880], [1120, 930], [1560, 930]].forEach(([x, y]) => plant(x, y));

  return [
    { id: 'buzdolabi', area: 'mutfak', action: 'emote:🥤', label: 'Buzdolabından içecek al', x: 112, y: 1016, r: 70, hit: [{ x: 50, y: 1003, z: 62, r: 44 }] },
    { id: 'ocak', area: 'mutfak', action: 'emote:🍳', label: 'Yemek hazırla', x: 112, y: 1088, r: 66, hit: [{ x: 50, y: 1088, z: 38, r: 40 }] },
    { id: 'pingpong', area: 'aktivite', action: 'emote:🏓', label: 'Masa tenisi oyna', x: 1250, y: 1135, r: 70, hit: [{ x: 1250, y: 1055, z: 28, r: 64 }] },
    { id: 'dart', area: 'aktivite', action: 'emote:🎯', label: 'Dart at', x: 1530, y: 1120, r: 66, hit: [{ x: 1560, y: 1076, z: 44, r: 28 }] },
    { id: 'arcade1', area: 'aktivite', action: 'games', label: 'Oyun makinesi', x: 1450, y: 1042, r: 70, hit: [1403, 1463, 1523].map(x => ({ x, y: 1002, z: 40, r: 30 })) },
    { id: 'oyun-aktivite', area: 'aktivite', action: 'games', label: 'Oyun masası (XOX, Taş-Kağıt-Makas)', x: 1525, y: 1145, r: 70, hit: [{ x: 1435, y: 1142, z: 24, r: 48 }] },
    { id: 'oyun-mola', action: 'games', label: 'Oyun masası (XOX, Taş-Kağıt-Makas)', x: 950, y: 822, r: 70, hit: [{ x: 950, y: 868, z: 22, r: 44 }] },
    { id: 'golet', action: 'say:🦢 Gölette kuğu ve koi balıkları yüzüyor', label: 'Göleti seyret', x: 790, y: 1020, r: 90, hit: [{ x: 790, y: 1175, z: 6, r: 130 }] },
  ];
}
