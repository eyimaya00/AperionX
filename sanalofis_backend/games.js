// Mola oyunları: XOX ve Taş-Kağıt-Makas. Durum bellekte tutulur (kalıcı değildir), herkese yayınlanır.
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const BEATS = { r: 's', p: 'r', s: 'p' };

function createGames() {
  const xox = { cells: Array(9).fill(''), turn: 'X', X: null, O: null, winner: '', line: null };
  const tkm = { A: null, B: null, result: null };
  const slot = (o, id, keys) => keys.find(k => o[k]?.id === id);

  function xoxReset() { xox.cells.fill(''); xox.turn = 'X'; xox.winner = ''; xox.line = null; }
  function xoxCheck() {
    for (const l of LINES) {
      const v = xox.cells[l[0]];
      if (v && v === xox.cells[l[1]] && v === xox.cells[l[2]]) { xox.winner = v; xox.line = l; return; }
    }
    if (xox.cells.every(Boolean)) xox.winner = 'D';
  }
  function tkmResolve() {
    const a = tkm.A.pick, b = tkm.B.pick;
    tkm.result = { a, b, winner: a === b ? 'D' : BEATS[a] === b ? 'A' : 'B' };
  }

  return {
    pub: () => ({
      xox: { ...xox, X: xox.X && { id: xox.X.id, name: xox.X.name }, O: xox.O && { id: xox.O.id, name: xox.O.name } },
      tkm: { A: tkm.A && { id: tkm.A.id, name: tkm.A.name, picked: !!tkm.A.pick }, B: tkm.B && { id: tkm.B.id, name: tkm.B.name, picked: !!tkm.B.pick }, result: tkm.result },
    }),
    drop(id) {
      for (const k of ['X', 'O']) if (xox[k]?.id === id) { xox[k] = null; xoxReset(); }
      for (const k of ['A', 'B']) if (tkm[k]?.id === id) { tkm[k] = null; tkm.result = null; if (tkm.A) tkm.A.pick = null; if (tkm.B) tkm.B.pick = null; }
    },
    // Dönüş: değişiklik olduysa true.
    handle(p, m) {
      const me = { id: p.id, name: p.name };
      if (m.g === 'xox') {
        const mark = slot(xox, p.id, ['X', 'O']);
        if (m.op === 'join' && !mark) {
          const k = !xox.X ? 'X' : !xox.O ? 'O' : null;
          if (!k) return false;
          xox[k] = me; xoxReset(); return true;
        }
        if (m.op === 'leave' && mark) { xox[mark] = null; xoxReset(); return true; }
        if (m.op === 'reset' && mark) { xoxReset(); return true; }
        if (m.op === 'move' && mark && !xox.winner && xox.turn === mark && xox.X && xox.O) {
          const i = m.i | 0;
          if (i < 0 || i > 8 || xox.cells[i]) return false;
          xox.cells[i] = mark; xox.turn = mark === 'X' ? 'O' : 'X'; xoxCheck(); return true;
        }
      } else if (m.g === 'tkm') {
        const k = slot(tkm, p.id, ['A', 'B']);
        if (m.op === 'join' && !k) {
          const s = !tkm.A ? 'A' : !tkm.B ? 'B' : null;
          if (!s) return false;
          tkm[s] = { ...me, pick: null }; tkm.result = null; return true;
        }
        if (m.op === 'leave' && k) { tkm[k] = null; tkm.result = null; if (tkm.A) tkm.A.pick = null; if (tkm.B) tkm.B.pick = null; return true; }
        if (m.op === 'reset' && k) { tkm.result = null; if (tkm.A) tkm.A.pick = null; if (tkm.B) tkm.B.pick = null; return true; }
        if (m.op === 'pick' && k && tkm.A && tkm.B && !tkm.result && ['r', 'p', 's'].includes(m.v) && !tkm[k].pick) {
          tkm[k].pick = m.v;
          if (tkm.A.pick && tkm.B.pick) tkmResolve();
          return true;
        }
      }
      return false;
    },
  };
}

module.exports = { createGames };
