// Peri'nin konuşma kartı: karşılama mesajı, genel durum duyurusu ve canlı ofis sayıları.
import { h } from '../dom.js';

export function createPeri(root, { getData }) {
  let opened = false, timer = null;
  const card = h('div', { class: 'peri-card glass' });
  root.append(card);
  root.addEventListener('click', e => { if (e.target === root) close(); });

  function render() {
    const d = getData();
    const rooms = d.rooms.map(r => h('div', { class: `room-chip${r.people.length ? ' has' : ''}` },
      h('span', { text: r.name }), h('b', { text: String(r.people.length) })));
    card.replaceChildren(
      h('img', { src: 'img/peri.png', class: 'peri-img', alt: 'Peri' }),
      h('div', { class: 'peri-body' },
        h('div', { class: 'peri-head' }, h('b', { text: 'Peri' }), h('span', { class: 'muted', text: 'AperionX maskotu' }),
          h('button', { class: 'btn mini', onclick: close, title: 'Kapat (Esc)' }, '✕')),
        h('p', { class: 'say', text: d.msg || '…' }),
        h('div', { class: 'stat' }, h('span', { class: 'live-dot' }), `Şu an ofiste `, h('b', { text: String(d.total) }), ' kişi aktif'),
        h('div', { class: 'rooms' }, rooms),
        h('div', { class: 'ann' }, h('small', { text: 'GENEL DURUM DUYURUSU' }), h('p', { text: d.announce || 'Şu an duyuru yok.' }))));
  }

  function close() { opened = false; root.classList.add('hidden'); clearInterval(timer); }
  return {
    open() { opened = true; root.classList.remove('hidden'); render(); clearInterval(timer); timer = setInterval(render, 1000); },
    close,
    isOpen: () => opened,
  };
}
