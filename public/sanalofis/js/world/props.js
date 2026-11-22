// Özel nesneler: ekranlar, panolar, kahve makinesi, yönetim masası ve Peri. Dinamik içerik S (sahne durumu) üzerinden okunur.
import { K, px, py, box, onWall, wrapText } from './iso.js';
import { shadow } from './furniture.js';

const TAU = Math.PI * 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function screenText(g, w, h, title, text, accent) {
  g.fillStyle = '#0b1020'; g.beginPath(); g.roundRect(-4, -4, w + 8, h + 8, 6); g.fill();
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(1, '#312e81');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = accent; g.font = `700 8px ${FONT}`; g.textAlign = 'left'; g.fillText(title, 8, 13);
  g.fillStyle = '#f1f5f9'; g.font = `600 11px ${FONT}`;
  wrapText(g, text, w - 16, 4).forEach((l, i) => g.fillText(l, 8, 30 + i * 14));
}

export const PROPS = {
  // Duvar ekranı: 'present' = toplantı sunum ekranı (ekran paylaşımı varsa canlı görüntü), 'lobby' = lobi duyuru ekranı.
  tv(c, f, S) {
    const w = f.w * K, h = 112, isPresent = f.id === 'present';
    const vid = isPresent ? S.present?.video : null;
    const live = !!(vid && vid.readyState >= 2 && vid.videoWidth);
    const text = isPresent
      ? (S.present?.sharer ? `🖥️ ${S.present.sharer} ekranını paylaşıyor` : (S.present?.note || 'Sunum notu yok. Ekrana tıkla.'))
      : (S.cfg?.lobby || '');
    onWall(c, 'y', 20, f.x, 134, g => {
      if (!live) { screenText(g, w, h, isPresent ? 'SUNUM EKRANI' : 'DUYURU', text, isPresent ? '#fbbf24' : '#a5b4fc'); return; }
      g.fillStyle = '#0b1020'; g.beginPath(); g.roundRect(-4, -4, w + 8, h + 8, 6); g.fill();
      const r = Math.min(w / vid.videoWidth, h / vid.videoHeight), dw = vid.videoWidth * r, dh = vid.videoHeight * r;
      g.drawImage(vid, (w - dw) / 2, (h - dh) / 2, dw, dh);
      g.fillStyle = 'rgba(15,23,42,.75)'; g.beginPath(); g.roundRect(5, 5, Math.min(w - 10, 10 + (S.present.sharer || '').length * 5.2 + 20), 14, 7); g.fill();
      g.fillStyle = '#fbbf24'; g.font = `700 8px ${FONT}`; g.textAlign = 'left'; g.fillText(`🖥️ ${S.present.sharer || ''}`, 10, 15);
    });
  },

  // Ayaklı pano: güney yüzünde başlık ve sütun sayıları (içerik tıklayınca açılan panelde).
  pano(c, f, S) {
    const b = S.boards?.[f.board];
    shadow(c, f.x, f.y, f.w, f.h);
    box(c, f.x + 8, f.y, 6, f.h, 0, 40, '#9aa3b2');
    box(c, f.x + f.w - 14, f.y, 6, f.h, 0, 40, '#9aa3b2');
    box(c, f.x, f.y, f.w, f.h, 30, 106, '#f8fafc', { east: '#cbd5e1', top: '#e2e8f0' });
    onWall(c, 'y', f.y + f.h, f.x, 106, g => {
      const w = f.w * K, h = 76;
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6366f1'; g.fillRect(0, 0, w, 15);
      g.fillStyle = '#fff'; g.font = `700 8px ${FONT}`; g.textAlign = 'left';
      g.fillText((b?.title || '').slice(0, 30), 5, 10.5);
      const n = b?.cols.length || 3, cw = (w - 8) / n;
      for (let i = 0; i < n; i++) {
        const cnt = b ? b.cards.filter(k => k.col === i).length : 0;
        g.fillStyle = ['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0'][i % 4]; g.fillRect(4 + i * cw, 21, cw - 3, 48);
        g.fillStyle = '#1e293b'; g.font = `800 16px ${FONT}`; g.textAlign = 'center'; g.fillText(String(cnt), 4 + i * cw + (cw - 3) / 2, 44);
        g.font = `600 6.5px ${FONT}`; g.fillText((b?.cols[i] || '').slice(0, 11), 4 + i * cw + (cw - 3) / 2, 60);
      }
    });
  },

  coffee(c, f, S, t) {
    const { x, y, w, h } = f;
    shadow(c, x, y, w, h);
    box(c, x, y, w, h, 0, 30, '#e8e0d0', { top: '#f6f0e4' });
    box(c, x + 14, y + 8, 34, 28, 30, 64, '#1f2937', { south: '#374151', top: '#4b5563' });
    box(c, x + 22, y + 36, 18, 2, 40, 48, '#0b1220', { south: '#0b1220' });
    const lx = px(x + 20, y + 36), ly = py(x + 20, y + 36, 58);
    c.fillStyle = '#22c55e'; c.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
    c.beginPath(); c.arc(lx, ly, 2.2, 0, TAU); c.fill();
    c.globalAlpha = 1;
    const sx = px(x + 36, y + 20), sy = py(x + 36, y + 20, 66);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.7 + i * 0.5) % 1;
      c.globalAlpha = 1 - ph;
      c.beginPath(); c.moveTo(sx + i * 6 - 3, sy - ph * 18); c.quadraticCurveTo(sx + i * 6 + 3, sy - ph * 18 - 6, sx + i * 6 - 3, sy - ph * 18 - 12); c.stroke();
    }
    c.globalAlpha = 1;
  },

  // Yönetim çalışma masası: koyu ahşap, iki monitör, lamba.
  adesk(c, f) {
    const { x, y, w, h } = f, cx = x + w / 2;
    shadow(c, x, y, w, h, 0.2);
    box(c, x + 6, y + 6, 14, h - 12, 0, 24, '#3f2e22'); box(c, x + w - 20, y + 6, 14, h - 12, 0, 24, '#3f2e22');
    box(c, x, y, w, h, 24, 31, '#5b4636', { top: '#7a5f49' });
    [-44, 12].forEach(dx => box(c, cx + dx, y + 10, 32, 3, 33, 56, '#111827', { south: '#2f5bd6' }));
    box(c, cx - 14, y + 44, 28, 9, 31, 33, '#cfd5de', { top: '#e5e9f0' });
    box(c, x + w - 34, y + 14, 6, 6, 31, 52, '#facc15');
    box(c, x + 14, y + 40, 22, 14, 31, 33, '#6366f1', { top: '#818cf8' });
  },

  // Peri maskotu: şeffaf PNG sprite, hafif nefes alma hareketi ve "tıkla" balonu.
  peri(c, f, S, t) {
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2, sx = px(cx, cy), sy = py(cx, cy), img = S.assets?.peri;
    c.fillStyle = 'rgba(60,30,90,.25)'; c.beginPath(); c.ellipse(sx, sy + 3, 34, 12, 0, 0, TAU); c.fill();
    const h = 142;
    if (img) {
      const w = h * img.width / img.height, bob = Math.sin(t * 2.2) * 2;
      c.drawImage(img, sx - w / 2, sy - h + 10 + bob, w, h - bob * 0.2);
    }
    const by = sy - h - 4 + Math.sin(t * 3) * 2, bx = sx + 36;
    c.fillStyle = '#fff'; c.strokeStyle = '#6366f1'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(bx, by, 11, 0, TAU); c.fill(); c.stroke();
    c.font = '12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#6366f1'; c.fillText('💬', bx, by + 1);
  },
};
