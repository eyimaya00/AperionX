// Oyuncu durumu, mesaj aktarımı (relay), WebRTC sinyalleşmesi, panolar, sunum notu ve yönetici işlemleri.
const crypto = require('crypto');
const { loadState, saveState, applyAdminPatch, applyBoardOp, loadPin, pinMatches } = require('./store');

const DIRS = ['up', 'down', 'left', 'right'];
const EMOTES = ['👋', '☕', '👍', '🎉'];
const COLOR = /^#[0-9a-f]{6}$/i;
const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : lo);
const color = (v, d) => (COLOR.test(String(v)) ? v : d);

function createHub() {
  const players = new Map();
  const state = loadState();
  const present = { note: '' };
  const { pin, src } = loadPin();
  console.log(`[SanalOfis] Yönetici PIN'i: ${pin} (${src})`);

  const pub = p => ({
    id: p.id, name: p.name, role: p.role, look: p.look, status: p.status,
    x: p.x, y: p.y, d: p.d, m: p.m, s: p.s, z: p.z, sharing: p.sharing,
  });

  function broadcast(obj, exceptId) {
    const txt = JSON.stringify(obj);
    for (const p of players.values()) if (p.id !== exceptId) p.conn.send(txt);
  }

  function join(id, conn, m) {
    const look = m.look || {};
    const p = {
      id, conn,
      name: clean(m.name, 20) || 'Misafir',
      role: clean(m.role, 28) || 'Ekip',
      look: { skin: color(look.skin, '#e0a97a'), hair: color(look.hair, '#1f2937'), outfit: color(look.outfit, '#6366f1') },
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
        const prevZ = p.z;
        p.x = num(m.x, 0, 1600); p.y = num(m.y, 0, 1000);
        p.d = DIRS.includes(m.d) ? m.d : 'down';
        p.m = !!m.m; p.s = !!m.s; p.z = clean(m.z, 12) || 'koridor';
        broadcast({ t: 'move', id: p.id, x: p.x, y: p.y, d: p.d, m: p.m, s: p.s, z: p.z }, p.id);
        if (prevZ === 'toplanti' && p.z !== 'toplanti') checkPresent();
        break;
      }
      case 'status':
        p.status = clean(m.status, 40) || 'Müsait';
        broadcast({ t: 'status', id: p.id, status: p.status }, p.id);
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
      if (me) { players.delete(id); broadcast({ t: 'left', id }); checkPresent(); }
    });
  }

  return { connect, count: () => players.size };
}

module.exports = { createHub };
