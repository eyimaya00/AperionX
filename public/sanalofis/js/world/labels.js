// Departman tabelaları: koyu hap rozetler (metin yönetim panelinden değişebilir). Çizim önbelleğe alınır.
const cache = new Map();
const R = 2;

export function signPill(text, color) {
  const key = `${text}|${color}`;
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 40) cache.clear();
  const m = document.createElement('canvas').getContext('2d');
  m.font = '800 12px system-ui, -apple-system, "Segoe UI", sans-serif';
  const w = Math.ceil(m.measureText(text).width + text.length * 1.2 + 44), h = 30;
  const cv = document.createElement('canvas');
  cv.width = w * R; cv.height = h * R;
  const c = cv.getContext('2d');
  c.scale(R, R);
  c.shadowColor = 'rgba(15,23,42,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 2;
  c.fillStyle = '#161a2b'; c.beginPath(); c.roundRect(3, 2, w - 6, h - 8, 8); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = color; c.beginPath(); c.roundRect(12, 7, 4, h - 18, 2); c.fill();
  c.fillStyle = '#fff'; c.font = '800 12px system-ui, -apple-system, "Segoe UI", sans-serif';
  c.textBaseline = 'middle'; c.textAlign = 'left';
  if ('letterSpacing' in c) c.letterSpacing = '1.2px';
  c.fillText(text, 24, h / 2 - 3);
  const o = { cv, w, h };
  cache.set(key, o);
  return o;
}
