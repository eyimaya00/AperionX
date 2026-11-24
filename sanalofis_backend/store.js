// Ofis durumu (Peri mesajı, tabelalar, panolar) ve yönetici PIN'i. Kalıcı veri data/sanalofis/ içinde durur.
// Eski sürümlerin data/ içindeki dosyaları yalnızca OKUNUR (silinmez, üzerine yazılmaz); kayıtlar data/sanalofis/ içine yapılır.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..', 'data');
const dir = path.join(root, 'sanalofis');
const file = path.join(dir, 'office.json');
const pinFile = path.join(dir, 'admin-pin.txt');
const readFirst = names => {
  for (const f of names) { try { return fs.readFileSync(f, 'utf8'); } catch { /* sıradaki */ } }
  return null;
};
const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
// Mevsim modu: auto = takvime göre, off = mevsim süsleri/efektleri kapalı, diğerleri sabit mevsim.
const CLOSABLE = ['mutfak', 'aktivite'];
const SEASONS = ['auto', 'off', 'autumn', 'winter', 'spring', 'summer'];
const ROOM_IDS = ['lobi', 'yayin', 'sosyal', 'toplanti', 'mola', 'yonetim', 'mutfak', 'aktivite'];
let timer = null;

const defaults = () => ({
  config: {
    peri: {
      msg: 'Merhaba! Ben Peri, AperionX ofisinin maskotuyum. Takıldığın bir yer olursa yardımcı olurum.',
      announce: 'Bugünün öncelikleri yönetim tarafından burada duyurulur.',
    },
    signs: {
      lobi: 'LOBİ', yayin: 'YAYIN KURULU & DERGİ', sosyal: 'SOSYAL MEDYA',
      toplanti: 'TOPLANTI SALONU', mola: 'MOLA ALANI', yonetim: 'YÖNETİM OFİSİ', mutfak: 'MUTFAK', aktivite: 'AKTİVİTE ALANI',
    },
    lobby: 'AperionX Sanal Ofis’e hoş geldiniz!',
    season: 'auto',
    closed: [],
    officePass: '1965',
  },
  boards: {
    yayin: { title: 'Dergi Yayın Akışı', cols: ['Taslak', 'Editör Kontrolü', 'Dizgi', 'Yayına Hazır'], cards: [] },
    sosyal: { title: 'Paylaşım Takvimi & İçerik Fikirleri', cols: ['İçerik Fikirleri', 'Planlandı', 'Paylaşıldı'], cards: [] },
  },
});

// Yönetici değişikliklerini doğrulayarak uygular (bilinmeyen alanlar yok sayılır).
function applyAdminPatch(state, p) {
  if (!p || typeof p !== 'object') return;
  const c = state.config;
  if (p.peri && typeof p.peri === 'object') {
    if ('msg' in p.peri) c.peri.msg = clean(p.peri.msg, 400);
    if ('announce' in p.peri) c.peri.announce = clean(p.peri.announce, 400);
  }
  if (p.signs && typeof p.signs === 'object') {
    for (const id of ROOM_IDS) if (id in p.signs) c.signs[id] = clean(p.signs[id], 32) || c.signs[id];
  }
  if ('lobby' in p) c.lobby = clean(p.lobby, 200);
  if (typeof p.officePass === 'string') {
    const op = p.officePass.trim();
    if (op.length >= 1 && op.length <= 32) c.officePass = op;
  }
  if (SEASONS.includes(p.season)) c.season = p.season;
  if (Array.isArray(p.closed)) c.closed = CLOSABLE.filter(id => p.closed.includes(id));
  if (p.boards && typeof p.boards === 'object') {
    for (const [id, b] of Object.entries(state.boards)) {
      const q = p.boards[id];
      if (!q || typeof q !== 'object') continue;
      if ('title' in q) b.title = clean(q.title, 50) || b.title;
      if (Array.isArray(q.cols)) q.cols.forEach((n, i) => { if (i < b.cols.length) b.cols[i] = clean(n, 24) || b.cols[i]; });
    }
  }
}

// Pano işlemleri (herkes yapabilir): ekle, taşı, düzenle, sil.
function applyBoardOp(state, who, m) {
  const b = state.boards[m.board];
  if (!b) return false;
  const col = v => Math.min(b.cols.length - 1, Math.max(0, Number.isFinite(+v) ? +v | 0 : 0));
  if (m.op === 'add') {
    const text = clean(m.text, 140);
    if (!text || b.cards.length >= 100) return false;
    b.cards.push({ id: crypto.randomBytes(3).toString('hex'), text, col: col(m.col), by: clean(who, 20), when: clean(m.when, 24) });
    return true;
  }
  const c = b.cards.find(x => x.id === m.id);
  if (!c) return false;
  if (m.op === 'move') c.col = col(m.col);
  else if (m.op === 'edit') { c.text = clean(m.text, 140) || c.text; c.when = clean(m.when, 24); }
  else if (m.op === 'del') b.cards = b.cards.filter(x => x.id !== m.id);
  else return false;
  return true;
}

function loadState() {
  const st = defaults();
  try {
    const raw = readFirst([file, path.join(root, 'office.json')]);
    if (raw) {
      const s = JSON.parse(raw);
      applyAdminPatch(st, { ...s.config, boards: s.boards });
      for (const [id, b] of Object.entries(st.boards)) {
        const cards = s.boards?.[id]?.cards;
        if (!Array.isArray(cards)) continue;
        b.cards = cards.slice(0, 100).map(c => ({
          id: clean(c.id, 12) || crypto.randomBytes(3).toString('hex'), text: clean(c.text, 140),
          col: Math.min(b.cols.length - 1, Math.max(0, +c.col | 0)), by: clean(c.by, 20), when: clean(c.when, 24),
        })).filter(c => c.text);
      }
    }
  } catch { /* ilk çalıştırma */ }
  return st;
}

function saveState(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(state));
    } catch (e) { console.warn('Ofis durumu kaydedilemedi:', e.message); }
  }, 300);
}

// PIN: ADMIN_PIN ortam değişkeni > data/admin-pin.txt > yeni üretilir ve dosyaya yazılır.
function loadPin() {
  if (process.env.ADMIN_PIN) return { pin: String(process.env.ADMIN_PIN), src: 'ADMIN_PIN ortam değişkeni' };
  const old = readFirst([pinFile, path.join(root, 'admin-pin.txt')]);
  if (old && old.trim()) return { pin: old.trim(), src: 'data/sanalofis/admin-pin.txt' };
  const pin = String(crypto.randomInt(100000, 1000000));
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(pinFile, pin); } catch { /* yazılamadı */ }
  return { pin, src: 'yeni üretildi → data/sanalofis/admin-pin.txt' };
}

function pinMatches(a, b) {
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
}

module.exports = {
  SEASONS,
  ROOM_IDS,
  applyAdminPatch,
  applyBoardOp,
  loadState,
  saveState,
  loadPin,
  pinMatches
};
