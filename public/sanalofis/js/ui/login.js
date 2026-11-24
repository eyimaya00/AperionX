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
  const pass = h('input', { type: 'password', maxlength: 30, placeholder: 'Giriş Şifresi', value: saved.pass || '' });
  const role = h('select', {}, ROLES.map(r => h('option', { value: r, text: r, selected: r === saved.role })));
  const errEl = h('p', { class: 'err-text', style: 'display:none; color:#ef4444; font-size:12px; margin-top:-4px;' });

  return new Promise(resolve => {
    const go = () => {
      name.classList.remove('err');
      pass.classList.remove('err');
      errEl.style.display = 'none';

      const n = name.value.trim();
      const p = pass.value.trim();

      if (!n) {
        name.focus();
        name.classList.add('err');
        errEl.innerText = 'Lütfen adını yaz.';
        errEl.style.display = 'block';
        return;
      }
      if (p !== '1965') {
        pass.focus();
        pass.classList.add('err');
        errEl.innerText = 'Hatalı giriş şifresi!';
        errEl.style.display = 'block';
        return;
      }

      const profile = { name: n, role: role.value, look: { ...editor.look }, pass: p };
      saveProfile(profile);
      root.classList.add('hidden');
      resolve(profile);
    };

    name.addEventListener('keydown', e => { if (e.key === 'Enter') pass.focus(); });
    pass.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

    root.append(h('div', { class: 'login-card glass' },
      h('img', { src: 'img/logo.png', class: 'logo-img', alt: 'AperionX' }),
      h('h1', { text: 'Sanal Ofis' }),
      h('p', { class: 'muted', text: 'Karakterini oluştur, giriş şifreni yaz ve ofise katıl.' }),
      h('div', { class: 'field' }, h('label', { text: 'İsim' }), name),
      h('div', { class: 'field' }, h('label', { text: 'Giriş Şifresi' }), pass),
      errEl,
      h('div', { class: 'field' }, h('label', { text: 'Rol' }), role),
      editor.el,
      h('button', { class: 'btn primary', onclick: go, text: 'Ofise Gir' }),
      h('p', { class: 'hint', text: 'Yürü: WASD / ok tuşları ya da haritaya tıkla (telefonda sol alttaki çubuk) · Etkileşim: E · Tepkiler: 1-4 · Mikrofon: M' }),
    ));
    if (!saved.name) name.focus(); else if (!saved.pass) pass.focus();
  });
}
