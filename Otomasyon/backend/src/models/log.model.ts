import { getDatabase } from '../database';
import { Log, LogLevel } from './types';

/**
 * Log Model — Video işlem logları
 */
export class LogModel {
    /**
     * Yeni log oluştur
     */
    static create(videoId: number, message: string, level: LogLevel = 'info'): Log {
        const db = getDatabase();
        const result = db.prepare(`
      INSERT INTO logs (video_id, message, level) VALUES (?, ?, ?)
    `).run(videoId, message, level);

        return db.prepare('SELECT * FROM logs WHERE id = ?').get(result.lastInsertRowid) as Log;
    }

    /**
     * Bir video'nun tüm loglarını getir
     */
    static findByVideoId(videoId: number): Log[] {
        const db = getDatabase();
        return db.prepare(
            'SELECT * FROM logs WHERE video_id = ? ORDER BY created_at DESC'
        ).all(videoId) as Log[];
    }

    /**
     * Son N logu getir
     */
    static findRecent(limit: number = 50): Log[] {
        const db = getDatabase();
        return db.prepare(
            'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?'
        ).all(limit) as Log[];
    }

    /**
     * Bir videonun loglarını sil
     */
    static deleteByVideoId(videoId: number): number {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM logs WHERE video_id = ?').run(videoId);
        return result.changes;
    }
}
