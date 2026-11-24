// Yazılı sohbet paneli: "Genel" herkese, "Oda" yalnızca bulunduğun bölgedekilere. Okunmamış sayacı ve daraltma.
import { h } from '../dom.js';

const hhmm = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export function createChat(root, { send, getMyId }) {
  const lists = { all: [], room: [] };
  let tab = 'all', open = false, unread = 0, roomName = 'Oda';
  const badge = h('span', { class: 'badge hidden' });
  const toggleBtn = h('button', { class: 'btn chat-toggle', onclick: () => setOpen(!open), title: 'Sohbet (T)' }, '💬 Sohbet', badge);
  const tabs = h('div', { class: 'tabs' });
  const log = h('div', { class: 'chat-log' });
  const input = h('input', { type: 'text', maxlength: 300, placeholder: 'Mesaj yaz, Enter ile gönder…', enterkeyhint: 'send' });
  const box = h('div', { class: 'chat-box glass hidden' },
    h('div', { class: 'chat-head' }, tabs, h('button', { class: 'btn mini', onclick: () => setOpen(false), title: 'Küçült' }, '—')),
    log, h('div', { class: 'chat-in' }, input, h('button', { class: 'btn mini primary', onclick: submit }, '➤')));
  root.append(box, toggleBtn);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  function submit() {
    const text = input.value.trim();
    if (!text) return;
    send('chat', { text, scope: tab });
    input.value = '';
  }
  function setBadge() {
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.classList.toggle('hidden', !unread);
  }
  function renderTabs() {
    tabs.replaceChildren(
      h('button', { class: `tab${tab === 'all' ? ' on' : ''}`, onclick: () => setTab('all'), text: 'Genel' }),
      h('button', { class: `tab${tab === 'room' ? ' on' : ''}`, onclick: () => setTab('room'), text: `Oda · ${roomName}` }));
  }
  function renderLog() {
    const mine = getMyId();
    const rows = lists[tab].map(m => h('div', { class: `msg${m.id === mine ? ' mine' : ''}` },
      h('small', { text: `${m.name} · ${m.role} · ${hhmm(m.ts)}` }), h('p', { text: m.text })));
    log.replaceChildren(...(rows.length ? rows : [h('p', { class: 'muted empty', text: tab === 'all' ? 'Henüz mesaj yok. Herkese açık sohbet burada.' : 'Bu mesajları yalnızca bulunduğun bölgedekiler görür.' })]));
    log.scrollTop = log.scrollHeight;
  }
  function setTab(t) { tab = t; if (t === 'all' || t === 'room') unread = 0; setBadge(); renderTabs(); renderLog(); }
  function setOpen(v) {
    open = v; box.classList.toggle('hidden', !v); toggleBtn.classList.toggle('hidden', v);
    if (v) { unread = 0; setBadge(); renderLog(); input.focus(); }
  }
  renderTabs();

  return {
    isOpen: () => open,
    open: () => setOpen(true), close: () => { if (open) setOpen(false); },
    history(msgs) { lists.all = msgs.slice(-50); if (open) renderLog(); },
    add(m) {
      const l = lists[m.scope === 'room' ? 'room' : 'all'];
      l.push(m); if (l.length > 80) l.shift();
      if (!open) { if (m.id !== getMyId()) { unread++; setBadge(); } } else if ((m.scope === 'room' ? 'room' : 'all') === tab) renderLog();
      else { unread++; setBadge(); }
    },
    // Bölge değişince "Oda" sohbeti sıfırlanır (eski odanın mesajları yeni odaya taşınmaz).
    setRoom(name) { if (name === roomName) return; roomName = name; lists.room = []; renderTabs(); if (open && tab === 'room') renderLog(); },
  };
}
