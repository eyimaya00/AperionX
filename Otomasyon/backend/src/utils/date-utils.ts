import { getDatabase } from '../database';

/**
 * Bir sonraki müsait yayın slotunu (tarih/saat) hesaplar.
 * Kural: En son planlanmış videonun üzerine 2 gün ekle, saat 20:15 yap.
 */
export function getNextScheduleSlot(): string {
    const db = getDatabase();

    // En uzak (maksimum) planlanmış tarihi bul
    const row = db.prepare(`
        SELECT MAX(scheduled_date) as last_date 
        FROM videos 
        WHERE status = 'pending' AND scheduled_date IS NOT NULL
    `).get() as { last_date: string | null };

    let nextDate: Date;

    if (row.last_date) {
        // En son planlanmış tarihten 2 gün sonrasını al
        nextDate = new Date(row.last_date);
        nextDate.setDate(nextDate.getDate() + 2);
    } else {
        // Hiç planlanmış video yoksa yarından başla
        nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
    }

    // Saati 20:15'e Fixle (Yerel saat olarak ayarla)
    nextDate.setHours(20, 15, 0, 0);

    return nextDate.toISOString();
}
