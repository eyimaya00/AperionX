// Giriş ekranı: isim, rol ve karakter görünümü seçimi. Karakter lobi kapısında doğar.
import { h } from '../dom.js';
import { ROLES, SKINS, HAIRS, OUTFITS } from '../config.js';
import { drawFigure } from '../world/avatar.js';

const KEY = 'aperionx-profile';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* özel pencere */ }
}

export function showLogin(root) {
  const saved = load();
  const look = { skin: SKINS[1], hair: HAIRS[0], outfit: OUTFITS[0], ...(saved.look || {}) };

  const preview = h('canvas', { width: 130, height: 150, class: 'preview', title: 'Döndürmek için tıkla' });
  const pctx = preview.getContext('2d');
  let dir = 0;
  const dirs = ['down', 'right', 'up', 'left'];
  function paint() {
    pctx.clearRect(0, 0, 130, 150);
    pctx.save(); pctx.translate(65, 128); pctx.scale(2.3, 2.3);
    drawFigure(pctx, { d: dirs[dir], look }, 0);
    pctx.restore();
  }
  preview.addEventListener('click', () => { dir = (dir + 1) % 4; paint(); });

  const swatches = (label, key, list) => {
    const row = h('div', { class: 'swatches' });
    const render = () => {
      row.replaceChildren(...list.map(col => h('button', {
        type: 'button', class: `sw${look[key] === col ? ' on' : ''}`, style: `background:${col}`,
        'aria-label': col, onclick: () => { look[key] = col; render(); paint(); },
      })));
    };
    render();
    return h('div', { class: 'field' }, h('label', { text: label }), row);
  };

  const name = h('input', { type: 'text', maxlength: 20, placeholder: 'Adın', value: saved.name || '' });
  const role = h('select', {}, ROLES.map(r => h('option', { value: r, text: r, selected: r === saved.role })));

  return new Promise(resolve => {
    const go = () => {
      const n = name.value.trim();
      if (!n) { name.focus(); name.classList.add('err'); return; }
      const profile = { name: n, role: role.value, look: { ...look } };
      save(profile);
      root.classList.add('hidden');
      resolve(profile);
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    root.append(h('div', { class: 'login-card glass' },
      h('img', { src: 'img/logo.png', class: 'logo-img', alt: 'AperionX' }),
      h('h1', { text: 'Sanal Ofis' }),
      h('p', { class: 'muted', text: 'Karakterini oluştur, lobi kapısından içeri gir.' }),
      preview,
      h('div', { class: 'field' }, h('label', { text: 'İsim' }), name),
      h('div', { class: 'field' }, h('label', { text: 'Rol' }), role),
      swatches('Ten', 'skin', SKINS), swatches('Saç', 'hair', HAIRS), swatches('Kıyafet rengi', 'outfit', OUTFITS),
      h('button', { class: 'btn primary', onclick: go, text: 'Ofise Gir' }),
      h('p', { class: 'hint', text: 'Yürü: WASD / ok tuşları ya da haritaya tıkla · Etkileşim: E · Tepkiler: 1-4 · Mikrofon: M' }),
    ));
    paint();
    name.focus();
  });
}
