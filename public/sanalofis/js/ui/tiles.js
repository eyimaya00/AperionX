// Video kutuları: bağlı kişilerin görüntüsü, kendi önizlemen; tıklayınca büyür (ekran paylaşımı için).
import { h } from '../dom.js';

export function createTiles(root, info) {
  const map = new Map();
  let selfBox = null;

  function box(el, label) {
    const flipBtn = h('button', {
      class: 'tile-flip-btn',
      title: 'Kamera Aynasını Çevir (Ters/Düz)',
      onclick: (e) => {
        e.stopPropagation();
        el.classList.toggle('flip-toggle');
      }
    }, '⇄');
    const b = h('div', { class: 'tile', onclick: () => b.classList.toggle('big') }, el, flipBtn, h('span', { class: 'tname', text: label }));
    return b;
  }

  return {
    add(id, el) {
      const i = info(id) || {};
      const b = box(el, i.name || '');
      b.classList.toggle('sharing', !!i.sharing);
      map.set(id, b);
      root.append(b);
    },
    remove(id) { map.get(id)?.remove(); map.delete(id); },
    mark(id, on) { map.get(id)?.classList.toggle('sharing', on); },
    setSelf(stream) {
      selfBox?.remove(); selfBox = null;
      if (!stream || !stream.getVideoTracks().length) return;
      const v = h('video', { autoplay: true, playsinline: true });
      v.muted = true; v.srcObject = stream;
      selfBox = box(v, 'Sen');
      selfBox.classList.add('self');
      root.prepend(selfBox);
    },
  };
}
