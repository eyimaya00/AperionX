// Alt çubuk: bölge, durum seçici, tepkiler, mikrofon/kamera/ekran paylaşımı; ipucu, bağlantı uyarısı ve yönetici duyurusu.
import { h } from '../dom.js';
import { STATUSES, EMOTES } from '../config.js';

export function createHud(root, cb) {
  const zone = h('div', { class: 'chip' });
  const prompt = h('div', { class: 'prompt hidden' });
  const toast = h('div', { class: 'toast hidden', text: 'Bağlantı koptu, yeniden bağlanılıyor…' });
  const notice = h('div', { class: 'notice hidden' });
  const sel = h('select', { class: 'status', title: 'Durumun', onchange: () => cb.onStatus(sel.value) },
    STATUSES.map(s => h('option', { value: s, text: s })));
  const ico = (text, title, fn) => h('button', { class: 'btn ico', title, onclick: () => fn() }, text);

  const mic = ico('🎙️', 'Mikrofon (M)', cb.onMic);
  const cam = ico('📷', 'Kamera', cb.onCam);
  const share = ico('🖥️', 'Ekranı paylaş', cb.onShare);
  const emotes = EMOTES.map(e => ico(e.icon, `${e.label} (${e.key})`, () => cb.onEmote(e.icon)));

  root.append(notice, prompt, toast, h('div', { class: 'bar glass' },
    zone, sel, h('span', { class: 'sep' }), emotes, h('span', { class: 'sep' }), mic, cam, share));

  let lastPrompt = null, noticeTimer = null;
  return {
    setZone: name => { zone.textContent = `📍 ${name}`; },
    setStatus: s => { sel.value = s; },
    setConn: ok => toast.classList.toggle('hidden', ok),
    setPrompt(text) {
      if (text === lastPrompt) return;
      lastPrompt = text;
      prompt.textContent = text || '';
      prompt.classList.toggle('hidden', !text);
    },
    setMedia(s) {
      mic.classList.toggle('off', !s.mic); mic.disabled = !s.hasAudio;
      cam.classList.toggle('off', !s.cam); cam.disabled = !s.hasVideo;
      share.classList.toggle('on', s.share);
    },
    notice(text) {
      notice.textContent = `📢 ${text}`;
      notice.classList.remove('hidden');
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => notice.classList.add('hidden'), 9000);
    },
  };
}
