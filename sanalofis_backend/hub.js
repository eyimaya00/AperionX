// Oyuncu durumu, mesaj aktarımı (relay), WebRTC sinyalleşmesi, panolar, sunum notu ve yönetici işlemleri.
const crypto = require('crypto');
const { loadState, saveState, applyAdminPatch, applyBoardOp, loadPin, pinMatches } = require('./store');
const { privateAt, PRIVATE_IDS } = require('./zones');
const { createChat } = require('./chat');
const { createGames } = require('./games');

const DIRS = ['up', 'down', 'left', 'right'];
const EMOTES = ['👋', '☕', '👍', '🎉', '🐱', '🥪', '🧋', '🎯', '💡', '🎮'];
const COLOR = /^#[0-9a-f]{6}$/i;
const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : lo);
const color = (v, d) => (COLOR.test(String(v)) ? v : d);
const idx = (v, n) => (Number.isFinite(+v) ? Math.min(n - 1, Math.max(0, +v | 0)) : 0);
// Görünüm: renkler ve stil numaraları doğrulanır (bilinmeyen alan yok sayılır).
const lookOf = l => ({
  skin: color(l?.skin, '#e0a97a'), hair: color(l?.hair, '#1f2937'), outfit: color(l?.outfit, '#6366f1'), pants: color(l?.pants, '#334155'),
  hairStyle: idx(l?.hairStyle, 5), acc: idx(l?.acc, 5), top: idx(l?.top, 3),
});

function createHub() {
  const players = new Map();
  const state = loadState();
  const present = { note: '' };
  const locks = new Set(); // kilitli özel odalar (bellekte; oda boşalınca kendiliğinden açılır)
  const chat = createChat(players);
  const games = createGames();
  const { pin, src } = loadPin();
  console.log(`[SanalOfis] Yönetici PIN'i: ${pin} (${src})`);

  const pub = p => ({
    id: p.id, name: p.name, role: p.role, look: p.look, status: p.status,
    x: p.x, y: p.y, d: p.d, m: p.m, s: p.s, z: p.z, sharing: p.sharing, dnd: p.dnd,
  });

  function broadcast(obj, exceptId) {
    const txt = JSON.stringify(obj);
    for (const p of players.values()) if (p.id !== exceptId) p.conn.send(txt);
  }

  function join(id, conn, m) {
    const requiredPass = process.env.OFFICE_PASS || '1965';
    if (String(m.pass || '').trim() !== requiredPass) {
      conn.send(JSON.stringify({ t: 'error', msg: 'Hatalı giriş şifresi!' }));
      setTimeout(() => conn.close(), 100);
      return null;
    }
    const look = m.look || {};
    const p = {
      id, conn,
      name: clean(m.name, 20) || 'Misafir',
      role: clean(m.role, 28) || 'Ekip',
      look: lookOf(look), dnd: false,
      status: 'Müsait',
      x: 730 + Math.random() * 140, y: 262 + Math.random() * 38, // Lobi girişi
      d: 'down', m: false, s: false, z: 'lobi', sharing: false, lastMove: 0,
      admin: false, fails: 0, lockUntil: 0,
    };
    players.set(id, p);
    conn.send(JSON.stringify({
      t: 'welcome', id, me: pub(p),
      players: [...players.values()].filter(q => q.id !== id).map(pub),
      config: state.config, boards: state.boards, present,
      ts: Date.now(), locks: [...locks], chat: chat.history(), games: games.pub(),
    }));
    broadcast({ t: 'joined', p: pub(p) }, id);
    return p;
  }

  // Toplantı salonu boşalınca sunum notu temizlenir.
  function checkPresent() {
    if (!present.note) return;
    if ([...players.values()].some(q => q.z === 'toplanti')) return;
    present.note = '';
    broadcast({ t: 'present', note: '' });
  }

  // Boşalan odanın kilidi kendiliğinden açılır.
  function checkLocks() {
    for (const r of [...locks]) {
      if ([...players.values()].some(q => q.z === r)) continue;
      locks.delete(r);
      broadcast({ t: 'lock', room: r, on: false });
    }
  }

  function adminLogin(p, m) {
    const locked = () => Date.now() < p.lockUntil;
    if (locked()) { p.conn.send(JSON.stringify({ t: 'admin', ok: false, locked: true })); return; }
    const ok = pinMatches(m.pin, pin);
    if (ok) { p.admin = true; p.fails = 0; } else if (++p.fails >= 5) { p.lockUntil = Date.now() + 60000; p.fails = 0; }
    p.conn.send(JSON.stringify({ t: 'admin', ok, locked: !ok && locked() }));
  }

  function handle(p, m) {
    switch (m.t) {
      case 'move': {
        const now = Date.now();
        if (now - p.lastMove < 30) return; // istemci zaten 50 ms'de bir gönderir; taşkını kes
        p.lastMove = now;
        const prevZ = p.z, nx = num(m.x, 0, 1600), ny = num(m.y, 0, 1470);
        // Bölgeyi sunucu konumdan bulur; özel oda iddiası konumla uyuşmuyorsa ortak alan sayılır.
        const claimed = clean(m.z, 12) || 'koridor';
        const nz = privateAt(nx, ny) || (PRIVATE_IDS.has(claimed) ? 'koridor' : claimed);
        if (nz !== prevZ && locks.has(nz)) { // kilitli odaya giriş reddedilir, eski konuma döndürülür
          p.conn.send(JSON.stringify({ t: 'deny', room: nz, x: p.x, y: p.y }));
          return;
        }
        p.x = nx; p.y = ny; p.z = nz;
        p.d = DIRS.includes(m.d) ? m.d : 'down';
        p.m = !!m.m; p.s = !!m.s;
        broadcast({ t: 'move', id: p.id, x: p.x, y: p.y, d: p.d, m: p.m, s: p.s, z: p.z }, p.id);
        if (prevZ !== p.z) { if (prevZ === 'toplanti') checkPresent(); checkLocks(); }
        break;
      }
      case 'status':
        p.status = clean(m.status, 40) || 'Müsait';
        broadcast({ t: 'status', id: p.id, status: p.status }, p.id);
        break;
      case 'dnd':
        p.dnd = !!m.on;
        broadcast({ t: 'dnd', id: p.id, on: p.dnd }, p.id);
        break;
      case 'look':
        p.look = lookOf(m.look);
        broadcast({ t: 'look', id: p.id, look: p.look }, p.id);
        break;
      case 'lock': // yalnızca odanın içindeki biri kilitleyip açabilir
        if (!PRIVATE_IDS.has(p.z) || p.z !== m.room) break;
        if (m.on) locks.add(p.z); else locks.delete(p.z);
        broadcast({ t: 'lock', room: p.z, on: !!m.on });
        break;
      case 'chat':
        chat.handle(p, m);
        break;
      case 'game':
        if (games.handle(p, m)) broadcast({ t: 'games', games: games.pub() });
        break;
      case 'emote':
        if (EMOTES.includes(m.e)) broadcast({ t: 'emote', id: p.id, e: m.e }, p.id);
        break;
      case 'signal': {
        const q = players.get(m.to);
        if (q && q.id !== p.id) q.conn.send(JSON.stringify({ t: 'signal', from: p.id, data: m.data }));
        break;
      }
      case 'share':
        p.sharing = !!m.on;
        broadcast({ t: 'share', id: p.id, on: p.sharing }, p.id);
        break;
      case 'board':
        if (applyBoardOp(state, p.name, m)) { saveState(state); broadcast({ t: 'boards', boards: state.boards }); }
        break;
      case 'present': // yalnızca toplantı salonundakiler sunum notunu değiştirebilir
        if (p.z !== 'toplanti') break;
        present.note = clean(m.note, 240);
        broadcast({ t: 'present', note: present.note });
        break;
      case 'admin_login':
        adminLogin(p, m);
        break;
      case 'admin_set':
        if (!p.admin) break;
        applyAdminPatch(state, m.patch);
        saveState(state);
        broadcast({ t: 'config', config: state.config, boards: state.boards });
        break;
      case 'admin_notice': {
        const text = clean(m.text, 200);
        if (p.admin && text) broadcast({ t: 'notice', text });
        break;
      }
      default:
    }
  }

  function connect(conn) {
    const id = crypto.randomBytes(4).toString('hex');
    let me = null;
    conn.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (!msg || typeof msg.t !== 'string') return;
      if (msg.t === 'join') { if (!me) me = join(id, conn, msg); return; }
      if (me) handle(me, msg);
    });
    conn.on('close', () => {
      if (!me) return;
      players.delete(id); broadcast({ t: 'left', id }); checkPresent(); checkLocks();
      games.drop(id); broadcast({ t: 'games', games: games.pub() });
    });
  }

  return { connect, count: () => players.size };
}

module.exports = { createHub };
