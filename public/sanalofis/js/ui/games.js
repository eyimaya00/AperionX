// Mola oyunları paneli: XOX, Taş-Kağıt-Makas ve zar. Durum sunucuda tutulur, herkese canlı yayınlanır.
import { h } from '../dom.js';

const ICON = { r: '✊', p: '✋', s: '✌️' };
const NAME = { r: 'Taş', p: 'Kağıt', s: 'Makas' };

export function createGames(root, { send, getMyId, getGames, say }) {
  let opened = false, tab = 'xox';
  const panel = h('div', { class: 'panel glass games' });
  root.append(panel);
  root.addEventListener('click', e => { if (e.target === root) close(); });
  const act = (g, op, extra = {}) => send('game', { g, op, ...extra });

  function xoxView(x) {
    const me = getMyId(), mark = x.X?.id === me ? 'X' : x.O?.id === me ? 'O' : null;
    const who = k => (x[k] ? `${x[k].name}${x[k].id === me ? ' (sen)' : ''}` : '— boş —');
    const info = x.winner === 'D' ? 'Berabere!' : x.winner ? `Kazanan: ${who(x.winner)} 🎉` : !x.X || !x.O ? 'İkinci oyuncu bekleniyor…' : `Sıra: ${x.turn} (${who(x.turn)})`;
    const cells = x.cells.map((v, i) => h('button', {
      class: `cell${x.line?.includes(i) ? ' win' : ''}`, text: v, disabled: !mark || !!v || !!x.winner || x.turn !== mark || !x.X || !x.O,
      onclick: () => act('xox', 'move', { i }),
    }));
    return h('div', { class: 'game' },
      h('p', { class: 'muted', text: `X: ${who('X')}  ·  O: ${who('O')}` }),
      h('div', { class: 'xox' }, cells), h('p', { class: 'ginfo', text: info }),
      h('div', { class: 'foot' },
        !mark && h('button', { class: 'btn primary', disabled: !!(x.X && x.O), onclick: () => act('xox', 'join'), text: 'Oyuna katıl' }),
        mark && h('button', { class: 'btn', onclick: () => act('xox', 'reset'), text: 'Yeni oyun' }),
        mark && h('button', { class: 'btn', onclick: () => act('xox', 'leave'), text: 'Ayrıl' })));
  }

  function tkmView(k) {
    const me = getMyId(), mine = k.A?.id === me ? 'A' : k.B?.id === me ? 'B' : null, res = k.result;
    const line = s => (k[s] ? `${k[s].name}${k[s].id === me ? ' (sen)' : ''} ${res ? ICON[res[s.toLowerCase()]] : k[s].picked ? '✅ seçti' : '…'}` : '— boş —');
    const info = res ? (res.winner === 'D' ? 'Berabere!' : `Kazanan: ${k[res.winner].name} 🎉`) : !k.A || !k.B ? 'İkinci oyuncu bekleniyor…' : 'İkiniz de seçin (seçimler birlikte açılır)';
    return h('div', { class: 'game' },
      h('p', { class: 'muted', text: `${line('A')}   vs   ${line('B')}` }), h('p', { class: 'ginfo', text: info }),
      h('div', { class: 'foot center' }, ['r', 'p', 's'].map(v => h('button', {
        class: 'btn big', title: NAME[v], text: ICON[v], disabled: !mine || !k.A || !k.B || !!res || !!k[mine].picked, onclick: () => act('tkm', 'pick', { v }),
      }))),
      h('div', { class: 'foot' },
        !mine && h('button', { class: 'btn primary', disabled: !!(k.A && k.B), onclick: () => act('tkm', 'join'), text: 'Oyuna katıl' }),
        mine && h('button', { class: 'btn', onclick: () => act('tkm', 'reset'), text: 'Yeni tur' }),
        mine && h('button', { class: 'btn', onclick: () => act('tkm', 'leave'), text: 'Ayrıl' })));
  }

  function diceView() {
    return h('div', { class: 'game' }, h('p', { class: 'muted', text: 'Zar at: sonucu bulunduğun bölgedekilerin sohbetinde görünür.' }),
      h('div', { class: 'foot center' }, h('button', { class: 'btn big', text: '🎲', onclick: () => { const n = 1 + Math.floor(Math.random() * 6); say(`🎲 zar attı: ${n}`); } })));
  }

  function render() {
    if (!opened) return;
    const g = getGames();
    const tabBtn = (id, label) => h('button', { class: `tab${tab === id ? ' on' : ''}`, onclick: () => { tab = id; render(); }, text: label });
    panel.replaceChildren(
      h('div', { class: 'p-head' }, h('h2', { text: '🎮 Mola Oyunları' }), h('button', { class: 'btn mini', onclick: close, title: 'Kapat (Esc)' }, '✕')),
      h('div', { class: 'tabs' }, tabBtn('xox', 'XOX'), tabBtn('tkm', 'Taş-Kağıt-Makas'), tabBtn('dice', 'Zar')),
      g ? (tab === 'xox' ? xoxView(g.xox) : tab === 'tkm' ? tkmView(g.tkm) : diceView()) : h('p', { class: 'muted', text: 'Yükleniyor…' }));
  }
  function open() { opened = true; root.classList.remove('hidden'); render(); }
  function close() { opened = false; root.classList.add('hidden'); }
  return { open, close, isOpen: () => opened, refresh: render };
}
