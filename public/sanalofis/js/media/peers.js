// WebRTC ses/görüntü yöneticisi: bağlantı kur/kapat, ses seviyesi, mikrofon/kamera, ekran paylaşımı.
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];
const STALE_MS = 7000;

export function createMedia({ send, tiles, onChange = () => {} }) {
  let myId = null, local = null, shareTrack = null, micOn = true, camOn = true, desired = new Map();
  const peers = new Map(), pendingOffers = new Map();
  const now = () => performance.now();
  let lastN = 0, shareEl = null;

  // Kendi paylaştığın ekranı sunum ekranında göstermek için yerel video elemanı.
  function localShareEl() {
    if (!shareTrack) { shareEl = null; return null; }
    if (!shareEl || shareEl.__track !== shareTrack) {
      const v = document.createElement('video');
      v.muted = true; v.autoplay = true; v.playsInline = true;
      v.srcObject = new MediaStream([shareTrack]); v.__track = shareTrack;
      v.play().catch(() => {});
      shareEl = v;
    }
    return shareEl;
  }

  // Kişi sayısı arttıkça video bit hızını düşürür (mesh yükü uplink'i doldurmasın).
  function quality() {
    const n = peers.size;
    const base = n <= 2 ? 500000 : n <= 4 ? 300000 : n <= 6 ? 200000 : 120000;
    const bps = shareTrack ? base * 3 : base, scale = n > 6 && !shareTrack ? 2 : 1;
    for (const p of peers.values()) {
      const s = p.pc.getTransceivers().find(t => t.receiver.track.kind === 'video')?.sender;
      if (!s) continue;
      const pr = s.getParameters();
      if (!pr.encodings || !pr.encodings.length) continue;
      pr.encodings[0].maxBitrate = bps;
      pr.encodings[0].scaleResolutionDownBy = scale;
      s.setParameters(pr).catch(() => {});
    }
  }

  const audioTrack = () => local?.getAudioTracks()[0] || null;
  const camTrack = () => local?.getVideoTracks()[0] || null;
  const outTrack = kind => (kind === 'audio' ? audioTrack() : shareTrack || camTrack());

  async function init() {
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    try {
      local = await navigator.mediaDevices.getUserMedia({ audio, video: { width: 320, height: 240, frameRate: 15 } });
    } catch {
      try { local = await navigator.mediaDevices.getUserMedia({ audio }); } catch { local = null; }
    }
    onChange();
    return local;
  }

  function applyGain(p) {
    if (p.el) p.el.volume = Math.max(0, Math.min(1, desired.get(p.id)?.gain ?? 1));
  }

  async function flush(p) {
    p.ready = true;
    for (const c of p.queue.splice(0)) { try { await p.pc.addIceCandidate(c); } catch { /* geç kalmış aday */ } }
  }

  function makePeer(id) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer = { id, pc, stream: new MediaStream(), el: null, queue: [], ready: false, t0: now() };
    pc.onicecandidate = e => { if (e.candidate) send('signal', { to: id, data: { c: e.candidate } }); };
    pc.ontrack = e => {
      peer.stream.addTrack(e.track);
      if (!peer.el) {
        const el = document.createElement('video');
        el.autoplay = true; el.playsInline = true; el.srcObject = peer.stream;
        peer.el = el;
        applyGain(peer);
        tiles.add(id, el);
      }
      peer.el.play?.().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if ((pc.connectionState === 'failed' || pc.connectionState === 'closed') && peers.get(id) === peer) close(id, true);
      if (pc.connectionState === 'connected') quality();
      onChange();
    };
    peers.set(id, peer);
    return peer;
  }

  // Akışları anında kapatır: uzak track'ler durdurulur, element temizlenir, bağlantı kapanır.
  function close(id, notify) {
    pendingOffers.delete(id);
    const p = peers.get(id);
    if (!p) return;
    peers.delete(id);
    if (notify) send('signal', { to: id, data: { bye: 1 } });
    try { p.pc.getSenders().forEach(s => s.replaceTrack(null).catch(() => {})); } catch { /* kapalı */ }
    p.stream.getTracks().forEach(t => { t.stop(); p.stream.removeTrack(t); });
    if (p.el) { p.el.pause(); p.el.srcObject = null; tiles.remove(id); }
    p.pc.ontrack = null; p.pc.onicecandidate = null; p.pc.onconnectionstatechange = null;
    p.pc.close();
    onChange();
  }

  async function call(id) {
    const peer = makePeer(id), pc = peer.pc;
    try {
      for (const kind of ['audio', 'video']) {
        const t = outTrack(kind);
        if (t) pc.addTransceiver(t, { direction: 'sendrecv' });
        else pc.addTransceiver(kind, { direction: 'sendrecv' });
      }
      await pc.setLocalDescription(await pc.createOffer());
      send('signal', { to: id, data: { sdp: pc.localDescription } });
    } catch { close(id, false); }
  }

  async function answer(id, sdp) {
    const peer = makePeer(id), pc = peer.pc;
    try {
      await pc.setRemoteDescription(sdp);
      await flush(peer);
      for (const t of pc.getTransceivers()) {
        t.direction = 'sendrecv';
        await t.sender.replaceTrack(outTrack(t.receiver.track.kind));
      }
      await pc.setLocalDescription(await pc.createAnswer());
      send('signal', { to: id, data: { sdp: pc.localDescription } });
    } catch { close(id, false); }
  }

  async function signal(from, data) {
    try {
      if (data.bye) { close(from, false); return; }
      if (data.sdp) {
        if (data.sdp.type === 'offer') {
          if (!desired.has(from)) { pendingOffers.set(from, { data, t: now() }); return; } // izolasyon: istenmeyen çağrı kabul edilmez
          if (peers.has(from)) close(from, false);
          await answer(from, data.sdp);
        } else {
          const p = peers.get(from);
          if (!p) return;
          await p.pc.setRemoteDescription(data.sdp);
          await flush(p);
        }
      } else if (data.c) {
        const p = peers.get(from);
        if (!p) return;
        if (p.ready) await p.pc.addIceCandidate(data.c); else p.queue.push(data.c);
      }
    } catch (e) { console.warn('sinyal hatası', e); }
  }

  // Yakınlık modülünün istediği eşleşmeleri uygular: fazlalıkları kapatır, eksikleri arar.
  function sync(want) {
    desired = want;
    for (const id of [...peers.keys()]) if (!want.has(id)) close(id, true);
    for (const id of want.keys()) {
      const p = peers.get(id);
      if (p) {
        applyGain(p);
        if (myId < id && p.pc.connectionState !== 'connected' && now() - p.t0 > STALE_MS) close(id, true);
        continue;
      }
      const o = pendingOffers.get(id);
      if (o) {
        pendingOffers.delete(id);
        if (now() - o.t < 6000) { signal(id, o.data); continue; }
      }
      if (myId < id) call(id); // çakışmayı önlemek için küçük id arar
    }
    for (const [id, o] of pendingOffers) if (now() - o.t > 6000) pendingOffers.delete(id);
    if (peers.size !== lastN) { lastN = peers.size; quality(); }
  }

  function swapVideo() {
    for (const p of peers.values()) {
      const tr = p.pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
      tr?.sender.replaceTrack(outTrack('video')).catch(() => {});
    }
    quality();
  }
  function stopShare() {
    if (!shareTrack) return;
    shareTrack.onended = null; shareTrack.stop(); shareTrack = null;
    swapVideo(); send('share', { on: false }); onChange();
  }
  async function toggleShare() {
    if (shareTrack) { stopShare(); return false; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      shareTrack = s.getVideoTracks()[0];
      shareTrack.onended = stopShare;
      swapVideo(); send('share', { on: true }); onChange();
      return true;
    } catch { return false; }
  }

  function toggle(track, on) { if (track) track.enabled = on; onChange(); }

  return {
    init, sync, signal, toggleShare, stopShare,
    setSelf: id => { myId = id; },
    drop: id => close(id, false),
    videoOf: id => peers.get(id)?.el || null,
    closeAll: () => { for (const id of [...peers.keys()]) close(id, false); pendingOffers.clear(); },
    toggleMic() { if (audioTrack()) { micOn = !micOn; toggle(audioTrack(), micOn); } },
    toggleCam() { if (camTrack()) { camOn = !camOn; toggle(camTrack(), camOn); } },
    liveIds: () => new Set([...peers].filter(([, p]) => p.pc.connectionState === 'connected').map(([id]) => id)),
    get localStream() { return local; },
    shareEl: localShareEl,
    peerEl: id => peers.get(id)?.el || null,
    state: () => ({
      mic: micOn && !!audioTrack(), cam: camOn && !!camTrack(), share: !!shareTrack,
      hasAudio: !!audioTrack(), hasVideo: !!camTrack(), peers: peers.size,
    }),
  };
}
