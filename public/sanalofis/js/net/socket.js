// WebSocket istemcisi: olay yöneticisi, otomatik yeniden bağlanma ve 50 ms'lik konum kısıtlaması.
import { PLAYER } from '../config.js';

export function createSocket() {
  const handlers = new Map();
  let ws = null, retry = 0, pending = null, timer = null, lastKey = '', lastT = 0;

  const emit = (t, m) => (handlers.get(t) || []).forEach(fn => fn(m));
  const keyOf = s => `${Math.round(s.x)}|${Math.round(s.y)}|${s.d}|${s.m ? 1 : 0}|${s.s ? 1 : 0}|${s.z}`;
  const wsPaths = ['/sanalofis/ws', '/ws'];
  let pathIdx = 0;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const curPath = wsPaths[pathIdx % wsPaths.length];
    try {
      ws = new WebSocket(`${proto}://${location.host}${curPath}`);
    } catch {
      pathIdx++;
      setTimeout(connect, 500);
      return;
    }
    ws.onopen = () => { retry = 0; lastKey = ''; emit('open', {}); };
    ws.onmessage = e => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m && m.t) emit(m.t, m);
    };
    ws.onclose = () => {
      emit('close', {});
      pathIdx++;
      setTimeout(connect, Math.min(3000, 600 * ++retry));
    };
    ws.onerror = () => {
      try { ws.close(); } catch {}
    };
  }

  function send(t, data = {}) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t, ...data }));
  }

  // Her karede çağrılabilir; en fazla 50 ms'de bir ve yalnızca durum değiştiyse gönderir.
  function sendMove(s) {
    if (keyOf(s) === lastKey && !pending) return;
    pending = { x: Math.round(s.x), y: Math.round(s.y), d: s.d, m: !!s.m, s: !!s.s, z: s.z };
    if (timer) return;
    const wait = Math.max(0, PLAYER.sendMs - (performance.now() - lastT));
    timer = setTimeout(() => {
      timer = null;
      const p = pending;
      pending = null;
      if (!p) return;
      const k = keyOf(p);
      if (k === lastKey) return;
      lastKey = k; lastT = performance.now();
      send('move', p);
    }, wait);
  }

  return {
    connect, send, sendMove,
    on(t, fn) { if (!handlers.has(t)) handlers.set(t, []); handlers.get(t).push(fn); },
  };
}
