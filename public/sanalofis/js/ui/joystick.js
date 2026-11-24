// Dokunmatik cihazlar için sanal joystick: ekran yönünde (x,y) üretir. Dokunma yoksa görünmez.
import { h } from '../dom.js';

export function createJoystick(root, onAxis) {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const knob = h('div', { class: 'stick-knob' });
  const pad = h('div', { class: 'stick' }, knob);
  root.append(pad);
  const R = 42;
  let id = null;
  function move(e) {
    const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.min(R, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
    onAxis(d < 8 ? 0 : Math.cos(a) * Math.min(1, d / R), d < 8 ? 0 : Math.sin(a) * Math.min(1, d / R));
  }
  function end() { id = null; knob.style.transform = ''; onAxis(0, 0); }
  pad.addEventListener('pointerdown', e => { id = e.pointerId; pad.setPointerCapture(id); move(e); e.preventDefault(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
}
