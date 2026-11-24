// Bağımsız minimal WebSocket sunucu katmanı (RFC 6455: metin çerçeveleri, ping/pong, parçalı mesaj).
const crypto = require('crypto');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_BUFFER = 1 << 20; // 1 MB

function parseFrame(b) {
  if (b.length < 2) return null;
  const fin = !!(b[0] & 0x80), op = b[0] & 0x0f, masked = !!(b[1] & 0x80);
  let len = b[1] & 0x7f, off = 2;
  if (len === 126) {
    if (b.length < 4) return null;
    len = b.readUInt16BE(2); off = 4;
  } else if (len === 127) {
    if (b.length < 10) return null;
    len = Number(b.readBigUInt64BE(2)); off = 10;
  }
  const maskLen = masked ? 4 : 0;
  if (b.length < off + maskLen + len) return null;
  let payload = b.subarray(off + maskLen, off + maskLen + len);
  if (masked) {
    const m = b.subarray(off, off + 4), out = Buffer.alloc(len);
    for (let i = 0; i < len; i++) out[i] = payload[i] ^ m[i & 3];
    payload = out;
  }
  return { fin, op, payload, size: off + maskLen + len };
}

function encode(op, payload) {
  const n = payload.length;
  let head;
  if (n < 126) head = Buffer.from([0x80 | op, n]);
  else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([head, payload]);
}

class Connection {
  constructor(socket, head) {
    this.socket = socket;
    this.buf = head && head.length ? Buffer.from(head) : Buffer.alloc(0);
    this.frags = [];
    this.open = true;
    this.handlers = { message: [], close: [] };
    socket.on('data', d => this._read(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
  }

  on(ev, fn) { this.handlers[ev].push(fn); }

  send(text) {
    if (this.open) this.socket.write(encode(0x1, Buffer.from(text)));
  }

  close() {
    if (!this.open) return;
    try { this.socket.write(encode(0x8, Buffer.alloc(0))); this.socket.end(); } catch { /* yok say */ }
    this._closed();
  }

  _closed() {
    if (!this.open) return;
    this.open = false;
    this.handlers.close.forEach(fn => fn());
  }

  _read(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    if (this.buf.length > MAX_BUFFER) { this.socket.destroy(); return; }
    for (;;) {
      const f = parseFrame(this.buf);
      if (!f) break;
      this.buf = this.buf.subarray(f.size);
      this._frame(f);
    }
  }

  _frame(f) {
    if (f.op === 0x8) { this.close(); return; }
    if (f.op === 0x9) { this.socket.write(encode(0xa, f.payload)); return; }
    if (f.op !== 0x1 && f.op !== 0x0) return; // ikili ve diğerleri yok sayılır
    this.frags.push(f.payload);
    if (!f.fin) return;
    const text = Buffer.concat(this.frags).toString('utf8');
    this.frags = [];
    this.handlers.message.forEach(fn => fn(text));
  }
}

function acceptUpgrade(req, socket, head, onConnection) {
  if (typeof head === 'function') {
    onConnection = head;
    head = null;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '', '',
  ].join('\r\n'));
  socket.setNoDelay(true);
  const conn = new Connection(socket, head);
  onConnection(conn);
  if (conn.buf.length > 0) {
    conn._read(Buffer.alloc(0));
  }
}

module.exports = {
  acceptUpgrade,
  Connection
};
