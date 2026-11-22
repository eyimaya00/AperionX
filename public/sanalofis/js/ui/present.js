// Sunum paneli: paylaşılan ekranı büyük gösterir; ekran paylaşımı ve sunum notu yansıtma.
import { h } from '../dom.js';

export function createPresent(root, { send, getNote, inRoom, isSharing, onShare, getStream, getSharer }) {
  let opened = false, timer = null, shownStream = null;
  const panel = h('div', { class: 'panel glass present' });
  const stage = h('div', { class: 'stage' });
  root.append(panel);
  root.addEventListener('click', e => { if (e.target === root) close(); });

  // Paylaşım sonradan başlasa/bitse de büyük görünüm 1 sn içinde güncellenir (yazılan not bozulmaz).
  function updateStage() {
    const st = getStream();
    if (st === shownStream && (st || !stage.firstChild)) return;
    shownStream = st;
    if (!st) { stage.replaceChildren(h('p', { class: 'muted', text: 'Şu an paylaşılan bir ekran yok.' })); return; }
    const v = h('video', { autoplay: true, playsinline: true });
    v.muted = true; v.srcObject = st; // ses ayrı elemandan çalıyor, çift ses olmasın
    v.play().catch(() => {});
    stage.replaceChildren(h('div', { class: 'stage-cap', text: `🖥️ ${getSharer() || ''} ekranını paylaşıyor` }), v);
  }

  function render() {
    const inside = inRoom();
    const note = h('textarea', { rows: 3, maxlength: 240, placeholder: 'Ekrana yansıyacak sunum notu…' });
    note.value = getNote();
    const shareBtn = h('button', {
      class: `btn${isSharing() ? ' on' : ''}`, disabled: !inside,
      onclick: async () => { await onShare(); render(); }, text: isSharing() ? '⏹ Paylaşımı durdur' : '🖥️ Ekranımı paylaş',
    });
    shownStream = undefined;
    panel.replaceChildren(
      h('div', { class: 'p-head' }, h('h2', { text: '📽️ Sunum Ekranı' }), h('button', { class: 'btn mini', onclick: close, title: 'Kapat (Esc)' }, '✕')),
      inside ? '' : h('p', { class: 'err-text', text: 'Sunum yapmak için toplantı salonunun içinde olmalısın.' }),
      h('p', { class: 'muted', text: 'Ekran paylaşımı yalnızca salondaki kişilere gider ve salon duvarındaki ekranda görünür.' }),
      stage, shareBtn,
      h('div', { class: 'field' }, h('label', { text: 'Sunum notu' }), note),
      h('div', { class: 'foot' },
        h('button', { class: 'btn', disabled: !inside, onclick: () => send('present', { note: '' }), text: 'Notu temizle' }),
        h('button', { class: 'btn primary', disabled: !inside, onclick: () => { send('present', { note: note.value }); close(); }, text: 'Ekrana yansıt' })));
    updateStage();
  }

  function close() { opened = false; root.classList.add('hidden'); clearInterval(timer); }
  return {
    open() { opened = true; root.classList.remove('hidden'); render(); clearInterval(timer); timer = setInterval(updateStage, 1000); },
    close,
    isOpen: () => opened,
  };
}
