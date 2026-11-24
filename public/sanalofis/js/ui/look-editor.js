// Karakter düzenleyici: önizleme + renk ve stil seçimi (giriş ekranı ile oyun içi "Görünüm" paneli ortak kullanır).
import { h } from '../dom.js';
import { SKINS, HAIRS, OUTFITS, PANTS, HAIR_STYLES, ACCS, TOPS, DEFAULT_LOOK } from '../config.js';
import { drawFigure } from '../world/avatar.js';

export function createLookEditor(initial) {
  const look = { ...DEFAULT_LOOK, ...(initial || {}) };
  const preview = h('canvas', { width: 130, height: 170, class: 'preview', title: 'Döndürmek için tıkla' });
  const pctx = preview.getContext('2d'), dirs = ['down', 'right', 'up', 'left'];
  let dir = 0, t0 = 0;
  function paint() {
    pctx.clearRect(0, 0, 130, 170);
    pctx.save(); pctx.translate(65, 152); pctx.scale(2.15, 2.15);
    drawFigure(pctx, { d: dirs[dir], look }, t0);
    pctx.restore();
  }
  preview.addEventListener('click', () => { dir = (dir + 1) % 4; paint(); });

  const rows = [];
  const swatches = (label, key, list) => {
    const row = h('div', { class: 'swatches' });
    const render = () => row.replaceChildren(...list.map(col => h('button', {
      type: 'button', class: `sw${look[key] === col ? ' on' : ''}`, style: `background:${col}`, 'aria-label': col,
      onclick: () => { look[key] = col; render(); paint(); },
    })));
    render();
    return h('div', { class: 'field' }, h('label', { text: label }), row);
  };
  const choices = (label, key, list) => {
    const row = h('div', { class: 'chips' });
    const render = () => row.replaceChildren(...list.map((n, i) => h('button', {
      type: 'button', class: `pick${look[key] === i ? ' on' : ''}`, text: n, onclick: () => { look[key] = i; render(); paint(); },
    })));
    render();
    return h('div', { class: 'field' }, h('label', { text: label }), row);
  };
  rows.push(
    swatches('Ten', 'skin', SKINS), swatches('Saç rengi', 'hair', HAIRS), choices('Saç stili', 'hairStyle', HAIR_STYLES),
    choices('Üst', 'top', TOPS), swatches('Kıyafet rengi', 'outfit', OUTFITS), swatches('Pantolon', 'pants', PANTS), choices('Aksesuar', 'acc', ACCS),
  );
  paint();
  return { el: h('div', { class: 'look-editor' }, preview, h('div', { class: 'look-rows' }, rows)), look, paint };
}
