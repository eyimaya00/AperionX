import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: Database.Database;

/**
 * SQLite veritabanı bağlantısını başlat
 */
export function initDatabase(): Database.Database {
    const dbPath = path.resolve(config.databasePath);
    const dbDir = path.dirname(dbPath);

    // Veritabanı dizinini oluştur
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`Veritabanı dizini oluşturuldu: ${dbDir}`);
    }

    db = new Database(dbPath);

    // WAL modu — daha iyi performans
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    logger.info(`SQLite veritabanı bağlantısı kuruldu: ${dbPath}`);
    return db;
}

/**
 * Veritabanı instance'ını getir
 */
export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Veritabanı henüz başlatılmadı. Önce initDatabase() çağırın.');
    }
    return db;
}

/**
 * Veritabanı bağlantısını kapat
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        logger.info('Veritabanı bağlantısı kapatıldı');
    }
}
