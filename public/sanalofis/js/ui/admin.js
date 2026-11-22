// Ofis Yönetim & Kontrol Paneli: PIN ile açılır; Peri/tabela/pano metinleri, canlı istatistik ve duyuru gönderme.
import { h } from '../dom.js';
import { zoneName } from '../world/map.js';

const SIGN_IDS = ['lobi', 'yayin', 'sosyal', 'toplanti', 'mola', 'yonetim'];

export function createAdmin(root, { send, getCfg, getBoards, getCensus }) {
  let opened = false, authed = false, timer = null, msgEl = null, live = null;
  const panel = h('div', { class: 'panel glass admin' });
  root.append(panel);
  root.addEventListener('click', e => { if (e.target === root) close(); });

  const field = (label, el) => h('div', { class: 'field' }, h('label', { text: label }), el);
  const head = title => h('div', { class: 'p-head' }, h('h2', { text: title }), h('button', { class: 'btn mini', onclick: close, title: 'Kapat (Esc)' }, '✕'));

  function pinForm(error) {
    const pin = h('input', { type: 'password', placeholder: 'Yönetici PIN', inputmode: 'numeric', autocomplete: 'off', maxlength: 32 });
    const go = () => { if (pin.value) send('admin_login', { pin: pin.value }); };
    pin.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    panel.replaceChildren(head('🔒 Yönetim Masası'),
      h('p', { class: 'muted', text: 'Ofis Yönetim & Kontrol Paneli yalnızca yetkili kullanıcılar içindir.' }),
      field('PIN', pin), error && h('p', { class: 'err-text', text: error }),
      h('button', { class: 'btn primary', onclick: go, text: 'Giriş' }));
    pin.focus();
  }

  function stats() {
    const d = getCensus();
    live.replaceChildren(h('div', { class: 'stat' }, h('span', { class: 'live-dot' }), 'Çevrimiçi: ', h('b', { text: String(d.total) })),
      ...d.rooms.filter(r => r.people.length).map(r => h('div', { class: 'live-room' },
        h('b', { text: `${r.name} (${r.people.length})` }),
        h('span', { class: 'muted', text: r.people.map(p => `${p.name} · ${p.role}`).join(', ') }))));
  }

  function form() {
    const cfg = getCfg(), boards = getBoards();
    const msg = h('textarea', { rows: 3, maxlength: 400 }); msg.value = cfg.peri.msg;
    const ann = h('textarea', { rows: 3, maxlength: 400 }); ann.value = cfg.peri.announce;
    const lobby = h('input', { maxlength: 200, value: cfg.lobby });
    const signs = SIGN_IDS.map(id => [id, h('input', { maxlength: 32, value: cfg.signs[id] })]);
    const bf = Object.entries(boards).map(([id, b]) => ({
      id, title: h('input', { maxlength: 50, value: b.title }), cols: b.cols.map(n => h('input', { maxlength: 24, value: n })),
    }));
    const notice = h('input', { maxlength: 200, placeholder: 'Tüm ofise duyuru metni…' });
    msgEl = h('span', { class: 'saved' });
    live = h('div', { class: 'live-box' });

    const save = () => {
      send('admin_set', { patch: {
        peri: { msg: msg.value, announce: ann.value }, lobby: lobby.value,
        signs: Object.fromEntries(signs.map(([id, el]) => [id, el.value])),
        boards: Object.fromEntries(bf.map(b => [b.id, { title: b.title.value, cols: b.cols.map(c => c.value) }])),
      } });
      msgEl.textContent = '✓ Kaydedildi'; setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 2500);
    };
    const sendNotice = () => { if (notice.value.trim()) { send('admin_notice', { text: notice.value.trim() }); notice.value = ''; } };

    panel.replaceChildren(head('🛠️ Ofis Yönetim & Kontrol Paneli'),
      h('div', { class: 'admin-grid' },
        h('section', {}, h('h3', { text: 'Peri' }), field('Karşılama mesajı', msg), field('Genel durum duyurusu', ann)),
        h('section', {}, h('h3', { text: 'Canlı İstatistik' }), live,
          h('h3', { text: 'Duyuru Gönder' }), h('div', { class: 'addrow' }, notice, h('button', { class: 'btn', onclick: sendNotice, text: 'Gönder' }))),
        h('section', {}, h('h3', { text: 'Oda Tabelaları' }),
          ...signs.map(([id, el]) => field(zoneName(id), el)), field('Lobi duyuru ekranı', lobby)),
        h('section', {}, h('h3', { text: 'Pano Yazıları' }),
          ...bf.map(b => h('div', { class: 'bf' }, field('Başlık', b.title), h('div', { class: 'colsrow' }, b.cols))))),
      h('div', { class: 'foot' }, msgEl, h('button', { class: 'btn primary', onclick: save, text: 'Kaydet' })));
    stats();
  }

  function close() { opened = false; root.classList.add('hidden'); clearInterval(timer); live = null; msgEl = null; }
  return {
    open() {
      opened = true; root.classList.remove('hidden');
      if (authed) { form(); clearInterval(timer); timer = setInterval(() => live && stats(), 1000); } else pinForm();
    },
    close,
    isOpen: () => opened,
    result(m) {
      if (!opened) return;
      if (m.ok) { authed = true; form(); clearInterval(timer); timer = setInterval(() => live && stats(), 1000); }
      else pinForm(m.locked ? 'Çok fazla hatalı deneme. 1 dakika bekleyin.' : 'PIN hatalı.');
    },
  };
}
