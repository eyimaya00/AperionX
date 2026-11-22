// Oda panoları (Yayın akışı / Paylaşım takvimi): sunucu üzerinden herkesle canlı senkron, tıklayarak düzenlenir.
import { h } from '../dom.js';

export function createBoard(root, { send, getBoards }) {
  let id = null, opened = false, titleEl = null, heads = [], boxes = [];
  const panel = h('div', { class: 'panel glass' });
  root.append(panel);
  root.addEventListener('click', e => { if (e.target === root) close(); });

  const move = (c, col) => send('board', { board: id, op: 'move', id: c.id, col });

  function card(c, b) {
    const view = h('div', { class: 'card' });
    const show = () => {
      view.replaceChildren(
        h('p', { text: c.text }),
        c.when && h('span', { class: 'chip-when', text: `📅 ${c.when}` }),
        h('div', { class: 'meta' }, h('span', { text: `✍ ${c.by || '—'}` }),
          h('span', { class: 'acts' },
            c.col > 0 && h('button', { title: 'Sola taşı', onclick: () => move(c, c.col - 1) }, '◀'),
            c.col < b.cols.length - 1 && h('button', { title: 'Sağa taşı', onclick: () => move(c, c.col + 1) }, '▶'),
            h('button', { title: 'Düzenle', onclick: edit }, '✎'),
            h('button', { title: 'Sil', onclick: () => send('board', { board: id, op: 'del', id: c.id }) }, '✕'))));
    };
    function edit() {
      const t = h('input', { value: c.text, maxlength: 140 }), w = h('input', { class: 'when', value: c.when || '', maxlength: 24, placeholder: '📅 tarih/saat' });
      const ok = () => send('board', { board: id, op: 'edit', id: c.id, text: t.value, when: w.value });
      [t, w].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); }));
      view.replaceChildren(t, w, h('div', { class: 'meta' }, h('span'), h('span', { class: 'acts' },
        h('button', { onclick: ok }, '✓'), h('button', { onclick: show }, '✕'))));
      t.focus();
    }
    show();
    return view;
  }

  function render() {
    const b = getBoards()[id];
    if (!b || !titleEl) return;
    titleEl.textContent = `📋 ${b.title}`;
    boxes.forEach((box, i) => {
      const cards = b.cards.filter(c => c.col === i);
      heads[i].textContent = `${b.cols[i]} (${cards.length})`;
      box.replaceChildren(...cards.map(c => card(c, b)));
    });
  }

  function build() {
    const b = getBoards()[id];
    if (!b) return;
    titleEl = h('h2'); heads = []; boxes = [];
    const cols = b.cols.map((_, i) => {
      const head = h('h3'), box = h('div', { class: 'cards' });
      const text = h('input', { placeholder: 'Yeni kart… (Enter)', maxlength: 140 });
      const when = h('input', { class: 'when', placeholder: '📅 tarih/saat', maxlength: 24 });
      const add = () => {
        if (!text.value.trim()) return;
        send('board', { board: id, op: 'add', col: i, text: text.value.trim(), when: when.value.trim() });
        text.value = ''; when.value = '';
      };
      [text, when].forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); }));
      heads.push(head); boxes.push(box);
      return h('section', { class: 'col' }, head, box, h('div', { class: 'addrow' }, text, when));
    });
    panel.replaceChildren(
      h('div', { class: 'p-head' }, titleEl, h('button', { class: 'btn mini', onclick: close, title: 'Kapat (Esc)' }, '✕')),
      h('div', { class: 'cols', style: `--n:${b.cols.length}` }, cols));
    render();
  }

  function close() { opened = false; root.classList.add('hidden'); }
  return {
    open(boardId) { id = boardId; opened = true; root.classList.remove('hidden'); build(); },
    close,
    isOpen: () => opened,
    refresh() { if (opened) render(); },
  };
}
