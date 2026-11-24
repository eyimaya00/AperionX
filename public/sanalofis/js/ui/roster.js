// Ekip listesi: kim çevrimiçi, hangi odada; ismine tıkla → yürü, ⚡ → ışınlan.
import { h } from '../dom.js';
import { zoneName } from '../world/map.js';
import { STATUS_COLOR } from '../world/avatar.js';

export function createRoster(root, { onWalk, onTeleport }) {
  let sig = '';
  const title = h('div', { class: 'r-title' });
  const list = h('div', { class: 'r-list' });
  root.append(title, list);

  const row = (p, isMe) => h('div', { class: `r-row${isMe ? ' me' : ''}` },
    h('span', { class: 'dot', style: `background:${STATUS_COLOR[p.status] || '#94a3b8'}` }),
    h('div', { class: 'r-info', title: isMe ? '' : 'Yanına yürü', onclick: () => !isMe && onWalk(p.id) },
      h('b', { text: p.name + (isMe ? ' (Sen)' : '') }),
      h('small', { text: `${p.role} · ${zoneName(p.z)}` }),
      h('small', { class: 'st', text: p.status })),
    p.dnd && h('span', { title: 'Rahatsız etme', text: '🔕' }),
    p.live && h('span', { class: 'live', title: 'Ses/görüntü bağlı', text: '●' }),
    p.sharing && h('span', { title: 'Ekran paylaşıyor', text: '🖥️' }),
    !isMe && h('button', { class: 'btn mini', title: 'Yanına ışınlan', onclick: () => onTeleport(p.id) }, '⚡'));

  return {
    render(me, others) {
      const all = [me, ...others];
      const s = all.map(p => [p.id, p.name, p.role, p.z, p.status, p.live, p.sharing, p.dnd].join('|')).join(';');
      if (s === sig) return;
      sig = s;
      title.textContent = `Ofiste · ${all.length}`;
      list.replaceChildren(row(me, true), ...others.map(o => row(o, false)));
    },
  };
}
