// Oyun içi "Görünüm" paneli: karakteri değiştirir, kaydeder ve herkese yayınlar.
import { h } from '../dom.js';
import { createLookEditor } from './look-editor.js';

export function createLook(root, { getLook, onSave }) {
  let opened = false;
  const panel = h('div', { class: 'panel glass look-panel' });
  root.append(panel);
  root.addEventListener('click', e => { if (e.target === root) close(); });
  function open() {
    opened = true; root.classList.remove('hidden');
    const ed = createLookEditor(getLook());
    panel.replaceChildren(
      h('div', { class: 'p-head' }, h('h2', { text: '👕 Görünümü Değiştir' }), h('button', { class: 'btn mini', onclick: close, title: 'Kapat (Esc)' }, '✕')),
      ed.el,
      h('div', { class: 'foot' }, h('button', { class: 'btn primary', onclick: () => { onSave({ ...ed.look }); close(); }, text: 'Kaydet' })));
  }
  function close() { opened = false; root.classList.add('hidden'); }
  return { open, close, isOpen: () => opened };
}
