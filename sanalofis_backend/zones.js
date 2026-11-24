// Özel oda dikdörtgenleri (istemcideki map.js ile aynı). Sunucu bölgeyi konumdan kendisi bulur:
// istemci özel odada olduğunu iddia edemez, kilitli odaya giremez.
const PRIVATE = [
  { id: 'yayin', x: 20, y: 20, w: 480, h: 320 },
  { id: 'toplanti', x: 1100, y: 20, w: 480, h: 320 },
  { id: 'sosyal', x: 20, y: 452, w: 480, h: 308 },
  { id: 'yonetim', x: 1100, y: 452, w: 480, h: 308 },
];
const PRIVATE_IDS = new Set(PRIVATE.map(r => r.id));
const privateAt = (x, y) => PRIVATE.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)?.id || null;

module.exports = {
  PRIVATE_IDS,
  privateAt
};
