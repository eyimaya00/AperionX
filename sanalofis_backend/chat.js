// Yazılı sohbet: "all" herkese, "room" yalnızca aynı bölgedekilere (özel odalar kendi içinde kalır).
const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

function createChat(players) {
  const history = [];
  return {
    history: () => history,
    handle(p, m) {
      const now = Date.now();
      const text = clean(m.text, 300);
      if (!text || now - (p.lastChat || 0) < 400) return;
      p.lastChat = now;
      const scope = m.scope === 'room' ? 'room' : 'all';
      const msg = { t: 'chat', id: p.id, name: p.name, role: p.role, scope, room: p.z, text, ts: now };
      const raw = JSON.stringify(msg);
      if (scope === 'all') {
        history.push(msg); if (history.length > 50) history.shift();
        for (const q of players.values()) q.conn.send(raw);
      } else {
        for (const q of players.values()) if (q.z === p.z) q.conn.send(raw);
      }
    },
  };
}

module.exports = { createChat };
