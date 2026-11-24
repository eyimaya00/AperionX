// Ortak sabitler: palet, dünya boyutu, hareket ve yakınlık ayarları.
export const COLORS = {
  bg: '#0f172a', panel: '#1e293b', accent: '#6366f1', signal: '#00ff41',
  text: '#e2e8f0', muted: '#94a3b8',
};

export const WORLD = { w: 1600, h: 1450 };

export const PLAYER = { speed: 200, half: 9, sendMs: 50 };

// Yakınlık (geniş ses alanı): connect içinde bağlan, disconnect aşılınca kop, full içinde tam ses; arası kademeli kısılır.
// maxPeers: aynı anda en fazla bu kadar kişiyle görüntü/ses (en yakınlar öncelikli).
export const PROX = { connect: 360, disconnect: 430, full: 120, interact: 46, maxPeers: 8 };

export const STATUSES = ['Müsait', 'Odaklandım, rahatsız etmeyin', 'Toplantıda', 'Molada ☕'];
export const ROLES = ['Genel Yayın Yönetmeni', 'Editör', 'Yazar', 'Sosyal Medya', 'Tasarımcı', 'Geliştirici', 'Yönetici'];

export const EMOTES = [
  { key: '1', icon: '👋', label: 'El salla' },
  { key: '2', icon: '☕', label: 'Kahve ikram et' },
  { key: '3', icon: '👍', label: 'Onayla' },
  { key: '4', icon: '🎉', label: 'Kutla' },
];

export const SKINS = ['#f5d0b0', '#e0a97a', '#b9794a', '#7a4a2b'];
export const HAIRS = ['#1f2937', '#7c2d12', '#facc15', '#e5e7eb', '#a855f7'];
export const OUTFITS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4'];
export const PANTS = ['#334155', '#1e3a8a', '#44403c', '#0f766e', '#f1f5f9'];
export const HAIR_STYLES = ['Kısa', 'Uzun', 'Topuz', 'Kıvırcık', 'Şapka'];
export const ACCS = ['Yok', 'Gözlük', 'Güneş gözlüğü', 'Kulaklık', 'Atkı'];
export const TOPS = ['Tişört', 'Kapüşonlu', 'Blazer'];
export const DEFAULT_LOOK = { skin: SKINS[1], hair: HAIRS[0], outfit: OUTFITS[0], pants: PANTS[0], hairStyle: 0, acc: 0, top: 0 };
