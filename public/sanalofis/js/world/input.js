// Klavye girişi: sürekli tuşlar (hareket) ve tek seferlik tuşlar (E, M, 1-4, Esc).
const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export function createInput() {
  const keys = new Set();
  let stick = { x: 0, y: 0 }; // dokunmatik joystick (ekran yönü)
  const once = [];

  addEventListener('keydown', e => {
    if (e.code === 'Escape') { once.push('Escape'); if (typing(e)) e.target.blur(); return; } // yazarken de panel kapanır
    if (typing(e)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) once.push(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const any = (...codes) => codes.some(c => keys.has(c));
  return {
    axis() {
      const x = (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0);
      const y = (any('KeyS', 'ArrowDown') ? 1 : 0) - (any('KeyW', 'ArrowUp') ? 1 : 0);
      return x || y ? { x, y } : stick;
    },
    take: () => once.splice(0),
    setStick: (x, y) => { stick = { x, y }; },
  };
}
