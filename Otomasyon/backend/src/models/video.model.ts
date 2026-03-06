import { getDatabase } from '../database';
import {
    Video,
    CreateVideoDTO,
    UpdateVideoDTO,
    PaginationQuery,
    PaginatedResult,
} from './types';
import { logger } from '../utils/logger';

/**
 * Video Model — Veritabanı işlemleri
 */
export class VideoModel {
    /**
     * Tüm videoları sayfalı getir
     */
    static findAll(query: PaginationQuery = {}): PaginatedResult<Video> {
        const db = getDatabase();
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params: unknown[] = [];

        const conditions: string[] = [];

        if (query.status) {
            conditions.push('status = ?');
            params.push(query.status);
        }

        if (query.search) {
            conditions.push('(title LIKE ? OR filename LIKE ?)');
            params.push(`%${query.search}%`, `%${query.search}%`);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        const countRow = db.prepare(`SELECT COUNT(*) as total FROM videos ${whereClause}`).get(...params) as { total: number };
        const total = countRow.total;

        const items = db.prepare(
            `SELECT * FROM videos ${whereClause} ORDER BY CASE WHEN scheduled_date IS NULL THEN 1 ELSE 0 END, scheduled_date ASC, created_at DESC LIMIT ? OFFSET ?`
        ).all(...params, limit, offset) as Video[];

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * ID ile tek video getir
     */
    static findById(id: number): Video | undefined {
        const db = getDatabase();
        return db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as Video | undefined;
    }

    /**
     * Dosya adı ile video getir
     */
    static findByFilename(filename: string): Video | undefined {
        const db = getDatabase();
        return db.prepare('SELECT * FROM videos WHERE filename = ?').get(filename) as Video | undefined;
    }

    /**
     * Yeni video oluştur
     */
    static create(data: CreateVideoDTO): Video {
        const db = getDatabase();
        const tags = JSON.stringify(data.tags || []);

        const result = db.prepare(`
      INSERT INTO videos (filename, title, description, tags, scheduled_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(
            data.filename,
            data.title || '',
            data.description || '',
            tags,
            data.scheduled_date || null
        );

        logger.info(`Video oluşturuldu: ${data.filename} (ID: ${result.lastInsertRowid})`);
        return this.findById(Number(result.lastInsertRowid))!;
    }

    /**
     * Video güncelle
     */
    static update(id: number, data: UpdateVideoDTO): Video | undefined {
        const db = getDatabase();
        const existing = this.findById(id);
        if (!existing) return undefined;

        const fields: string[] = [];
        const params: unknown[] = [];

        if (data.title !== undefined) {
            fields.push('title = ?');
            params.push(data.title);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            params.push(data.description);
        }
        if (data.tags !== undefined) {
            fields.push('tags = ?');
            params.push(JSON.stringify(data.tags));
        }
        if (data.scheduled_date !== undefined) {
            fields.push('scheduled_date = ?');
            params.push(data.scheduled_date);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.youtube_video_id !== undefined) {
            fields.push('youtube_video_id = ?');
            params.push(data.youtube_video_id);
        }

        if (fields.length === 0) return existing;

        fields.push("updated_at = datetime('now')");
        params.push(id);

        db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        logger.info(`Video güncellendi: ID ${id}`);
        return this.findById(id);
    }

    /**
     * Video sil
     */
    static delete(id: number): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM videos WHERE id = ?').run(id);
        if (result.changes > 0) {
            logger.info(`Video silindi: ID ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Zamanı gelen videoları getir (scheduler için)
     */
    static findScheduledReady(): Video[] {
        const db = getDatabase();
        // JavaScript ile mecvut zamanı ISO formatında alıp gönderiyoruz (zaman dilimi farklarını önlemek için)
        const nowIso = new Date().toISOString();

        return db.prepare(`
      SELECT * FROM videos
      WHERE status = 'pending'
        AND scheduled_date IS NOT NULL
        AND scheduled_date <= ?
      ORDER BY scheduled_date ASC
    `).all(nowIso) as Video[];
    }

    /**
     * İstatistikler
     */
    static getStats(): Record<string, number> {
        const db = getDatabase();
        const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'uploaded' THEN 1 ELSE 0 END) as uploaded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM videos
    `).get() as Record<string, number>;

        return stats;
    }
}
