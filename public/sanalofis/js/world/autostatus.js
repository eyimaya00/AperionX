// Bölge değişince durumu otomatik ayarlar (toplantı salonu → "Toplantıda", mola alanı → "Molada ☕").
const BY_ZONE = { toplanti: 'Toplantıda', mola: 'Molada ☕' };

export function createAutoStatus(apply, getStatus) {
  let prev = 'lobi', auto = false;
  return zone => {
    if (zone === prev) return;
    const was = prev;
    prev = zone;
    if (auto && getStatus() === BY_ZONE[was]) apply('Müsait'); // yalnızca elle değiştirilmediyse geri al
    auto = false;
    if (BY_ZONE[zone] && getStatus() === 'Müsait') { auto = true; apply(BY_ZONE[zone]); }
  };
}
