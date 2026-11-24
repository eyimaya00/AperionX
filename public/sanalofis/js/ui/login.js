// Giriş ekranı: isim, rol ve karakter görünümü seçimi. Karakter lobi kapısında doğar.
import { h } from '../dom.js';
import { ROLES } from '../config.js';
import { createLookEditor } from './look-editor.js';

const KEY = 'aperionx-profile';
export const loadProfile = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const saveProfile = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* özel pencere */ } };

export function showLogin(root) {
  const saved = loadProfile();
  const editor = createLookEditor(saved.look);
  const name = h('input', { type: 'text', maxlength: 20, placeholder: 'Adın', value: saved.name || '' });
  const role = h('select', {}, ROLES.map(r => h('option', { value: r, text: r, selected: r === saved.role })));

  return new Promise(resolve => {
    const go = () => {
      const n = name.value.trim();
      if (!n) { name.focus(); name.classList.add('err'); return; }
      const profile = { name: n, role: role.value, look: { ...editor.look } };
      saveProfile(profile);
      root.classList.add('hidden');
      resolve(profile);
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    root.append(h('div', { class: 'login-card glass' },
      h('img', { src: 'img/logo.png', class: 'logo-img', alt: 'AperionX' }),
      h('h1', { text: 'Sanal Ofis' }),
      h('p', { class: 'muted', text: 'Karakterini oluştur, lobi kapısından içeri gir.' }),
      h('div', { class: 'field' }, h('label', { text: 'İsim' }), name),
      h('div', { class: 'field' }, h('label', { text: 'Rol' }), role),
      editor.el,
      h('button', { class: 'btn primary', onclick: go, text: 'Ofise Gir' }),
      h('p', { class: 'hint', text: 'Yürü: WASD / ok tuşları ya da haritaya tıkla (telefonda sol alttaki çubuk) · Etkileşim: E · Tepkiler: 1-4 · Mikrofon: M' }),
    ));
    name.focus();
  });
}
