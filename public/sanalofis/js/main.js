// Uygulama girişi: modülleri bağlar; oyun döngüsü, tıkla-yürü, nesne etkileşimleri ve ağ olayları.
import { $ } from './dom.js';
import { EMOTES } from './config.js';
import { showLogin } from './ui/login.js';
import { createHud } from './ui/hud.js';
import { createRoster } from './ui/roster.js';
import { createTiles } from './ui/tiles.js';
import { createBoard } from './ui/board.js';
import { createPeri } from './ui/peri.js';
import { createAdmin } from './ui/admin.js';
import { createPresent } from './ui/present.js';
import { createSocket } from './net/socket.js';
import { createMedia } from './media/peers.js';
import { computePeers, ringIds } from './media/proximity.js';
import { createRenderer } from './world/renderer.js';
import { createPlayer } from './world/player.js';
import { createRemotes } from './world/remotes.js';
import { createInput } from './world/input.js';
import { createAutoStatus } from './world/autostatus.js';
import { ZONES, SPOTS, CHAIRS, zoneName, freeSpotNear } from './world/map.js';
import { px, py, unproject } from './world/iso.js';

const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const [profile, logo, peri] = await Promise.all([showLogin($('#login')), loadImg('img/logo.png'), loadImg('img/peri.png')]);

// Sahne durumu: çizim katmanı dinamik metinleri buradan okur.
const S = { cfg: null, boards: {}, present: { note: '', sharer: null, video: null }, assets: { logo, peri } };
const net = createSocket();
const remotes = createRemotes();
const input = createInput();
const canvas = $('#game');
const renderer = createRenderer(canvas, S.assets);
const send = (t, d) => net.send(t, d);
let P = null, started = false, prevWant = new Set(), lastProx = 0, last = performance.now(), hover = null;

const census = () => {
  const all = [P.me, ...remotes.all()];
  return {
    total: all.length,
    rooms: ZONES.map(z => ({ id: z.id, name: z.name, people: all.filter(p => p.z === z.id).map(p => ({ name: p.name, role: p.role })) })),
  };
};

const tiles = createTiles($('#tiles'), id => remotes.map.get(id));
const board = createBoard($('#board'), { send, getBoards: () => S.boards });
const periCard = createPeri($('#peri'), { getData: () => ({ ...census(), msg: S.cfg?.peri.msg, announce: S.cfg?.peri.announce }) });
const admin = createAdmin($('#admin'), { send, getCfg: () => S.cfg, getBoards: () => S.boards, getCensus: census });
const hud = createHud($('#hud'), {
  onStatus: s => setStatus(s), onEmote: e => emote(e),
  onMic: () => media.toggleMic(), onCam: () => media.toggleCam(), onShare: () => media.toggleShare(),
});
const media = createMedia({ send, tiles, onChange: () => hud.setMedia(media.state()) });
const present = createPresent($('#present'), {
  send, getNote: () => S.present.note, inRoom: () => P.me.z === 'toplanti',
  isSharing: () => media.state().share, onShare: () => media.toggleShare(),
  getStream: () => S.present.video?.srcObject || null, getSharer: () => S.present.sharer,
});
const roster = createRoster($('#roster'), {
  onWalk: id => { const p = spotBeside(id); if (p && P) P.walkTo(p.x, p.y); },
  onTeleport: id => { const p = spotBeside(id); if (p && P) P.teleport(p.x, p.y); },
});
const auto = createAutoStatus(s => setStatus(s), () => P?.me.status);
const panels = [board, periCard, admin, present];
const modal = () => panels.some(p => p.isOpen());

function spotBeside(id) {
  const r = remotes.map.get(id);
  return r && freeSpotNear(r.x + 36, r.y);
}
function setStatus(s) {
  if (!P) return;
  P.me.status = s; hud.setStatus(s); send('status', { status: s });
}
function emote(icon) {
  if (!P) return;
  P.me.emote = { icon, t0: performance.now() / 1000 };
  send('emote', { e: icon });
}

// Nesne eylemleri
function runAction(a) {
  if (a === 'peri') periCard.open();
  else if (a.startsWith('board:')) board.open(a.slice(6));
  else if (a === 'present') present.open();
  else if (a === 'admin') admin.open();
  else if (a === 'coffee') { setStatus('Molada ☕'); emote('☕'); }
}
const occupied = ch => remotes.all().some(o => o.s && Math.hypot(o.x - ch.x, o.y - ch.y) < 8);

function useSpot(s) {
  if (s.action === 'peri') { periCard.open(); return; } // Peri'ye tıklayınca anında konuşur
  if (Math.hypot(P.me.x - s.x, P.me.y - s.y) < s.r * 0.6) runAction(s.action);
  else P.walkTo(s.x, s.y, () => runAction(s.action));
}
function useChair(ch) {
  if (occupied(ch)) return;
  P.walkTo(ch.x, ch.y, () => { if (!occupied(ch)) P.sit(ch); });
}
function interact() {
  const hint = P.nearest(remotes.all());
  if (!hint) return;
  if (hint.kind === 'chair') P.sit(hint.ref); else useSpot(hint.ref);
}

// Tıklanabilir hedefler: ekrandaki daireler (sahne pikseli) önceden hesaplanır.
const TARGETS = [
  ...CHAIRS.map(ch => ({ kind: 'chair', ref: ch, label: 'Otur', circles: [{ x: px(ch.x, ch.y), y: py(ch.x, ch.y, 14), r: 17 }] })),
  ...SPOTS.map(s => ({ kind: 'spot', ref: s, label: s.label, circles: s.hit.map(h => ({ x: px(h.x, h.y), y: py(h.x, h.y, h.z), r: h.r })) })),
];
function pick(e) {
  const { sx, sy } = renderer.scenePoint(e.clientX, e.clientY);
  let best = null, bs = Infinity;
  for (const t of TARGETS) for (const c of t.circles) {
    const score = Math.hypot(sx - c.x, sy - c.y) / c.r;
    if (score <= 1 && score < bs) { bs = score; best = t; }
  }
  return { target: best, world: unproject(sx, sy) };
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || modal() || !P) return;
  const { target, world } = pick(e);
  if (target?.kind === 'chair') useChair(target.ref);
  else if (target) useSpot(target.ref);
  else P.walkTo(world.x, world.y);
});
canvas.addEventListener('pointermove', e => {
  hover = modal() ? null : pick(e).target;
  canvas.style.cursor = hover ? 'pointer' : 'default';
});

function onKey(code) {
  if (code === 'Escape') { panels.forEach(p => p.close()); return; }
  if (modal()) return;
  if (code === 'KeyE') interact();
  else if (code === 'KeyM') media.toggleMic();
  else { const e = EMOTES.find(x => `Digit${x.key}` === code); if (e) emote(e.icon); }
}

// Yakınlık: kiminle ses/görüntü bağlı olmalı? (~200 ms'de bir)
function proximityTick(me, others) {
  const want = computePeers(me, others, prevWant);
  prevWant = new Set(want.keys());
  media.sync(want);
  const live = media.liveIds();
  others.forEach(o => { o.live = live.has(o.id); });
  me.live = live.size > 0;
  hud.setZone(zoneName(me.z));
  auto(me.z);
  roster.render(me, others);
  const sharer = [me, ...others].find(p => p.z === 'toplanti' && (p.isMe ? media.state().share : p.sharing));
  S.present.sharer = sharer ? sharer.role : null;
  const vid = sharer ? (sharer.isMe ? media.shareEl() : media.videoOf(sharer.id)) : null;
  S.present.video = vid; S.present.stream = vid ? vid.srcObject : null;
}

function tick(dt, t, ms) {
  const me = P.me, isModal = modal();
  const { x, y } = input.axis();
  input.take().forEach(onKey);
  P.update(dt, isModal ? 0 : x + y, isModal ? 0 : y - x); // ekran yönü → dünya yönü
  net.sendMove(me);
  remotes.step(dt);
  const others = remotes.all();
  if (ms - lastProx > 200) { lastProx = ms; proximityTick(me, others); }
  const near = isModal ? null : P.nearest(others);
  const label = hover ? `Tıkla · ${hover.label}` : near ? `E · ${near.label}` : '';
  hud.setPrompt(me.s ? 'Kalkmak için bir yön tuşuna bas' : label);
  renderer.frame({ dt, t, me, others, rings: ringIds(me, others), hint: near, marker: P.target(), S });
}

function loop(ms) {
  const dt = Math.min(0.05, (ms - last) / 1000);
  last = ms;
  if (P) tick(dt, ms / 1000, ms);
  requestAnimationFrame(loop);
}

net.on('open', () => { hud.setConn(true); send('join', profile); });
net.on('close', () => hud.setConn(false));
net.on('welcome', m => {
  remotes.clear(); media.closeAll(); prevWant = new Set();
  media.setSelf(m.id);
  P = createPlayer(m.me);
  m.players.forEach(p => remotes.add(p));
  S.cfg = m.config; S.boards = m.boards; S.present.note = m.present.note;
  hud.setStatus(P.me.status);
  if (!started) { started = true; requestAnimationFrame(loop); }
});
net.on('joined', m => remotes.add(m.p));
net.on('left', m => { remotes.remove(m.id); media.drop(m.id); });
net.on('move', m => remotes.update(m.id, m));
net.on('status', m => { const r = remotes.map.get(m.id); if (r) r.status = m.status; });
net.on('emote', m => { const r = remotes.map.get(m.id); if (r) r.emote = { icon: m.e, t0: performance.now() / 1000 }; });
net.on('share', m => { const r = remotes.map.get(m.id); if (r) r.sharing = m.on; tiles.mark(m.id, m.on); });
net.on('signal', m => media.signal(m.from, m.data));
net.on('boards', m => { S.boards = m.boards; board.refresh(); });
net.on('config', m => { S.cfg = m.config; S.boards = m.boards; board.refresh(); });
net.on('present', m => { S.present.note = m.note; });
net.on('admin', m => admin.result(m));
net.on('notice', m => hud.notice(m.text));

net.connect();
media.init().then(stream => { tiles.setSelf(stream); hud.setMedia(media.state()); });
