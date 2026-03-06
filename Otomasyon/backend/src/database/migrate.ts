import fs from 'fs';
import path from 'path';
import { getDatabase, initDatabase } from './connection';
import { logger } from '../utils/logger';

/**
 * Migration dosyalarını çalıştır
 */
export function runMigrations(): void {
    const db = getDatabase();

    // Migration tracking tablosu
    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      filename  TEXT    NOT NULL UNIQUE,
      applied_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );
  `);

    const migrationsDir = path.resolve(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        logger.warn(`Migration dizini bulunamadı: ${migrationsDir}`);
        return;
    }

    // .sql dosyalarını sıralı oku
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const applied = db.prepare('SELECT filename FROM _migrations').all() as { filename: string }[];
    const appliedSet = new Set(applied.map(m => m.filename));

    const insertMigration = db.prepare('INSERT INTO _migrations (filename) VALUES (?)');

    for (const file of files) {
        if (appliedSet.has(file)) {
            logger.debug(`Migration zaten uygulanmış: ${file}`);
            continue;
        }

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        const runInTransaction = db.transaction(() => {
            db.exec(sql);
            insertMigration.run(file);
        });

        try {
            runInTransaction();
            logger.info(`✅ Migration uygulandı: ${file}`);
        } catch (error) {
            logger.error(`❌ Migration hatası: ${file}`, error);
            throw error;
        }
    }

    logger.info('Tüm migration\'lar tamamlandı');
}

/**
 * Standalone migration çalıştırıcı
 */
if (require.main === module) {
    initDatabase();
    runMigrations();
    logger.info('Migration script tamamlandı');
    process.exit(0);
}
