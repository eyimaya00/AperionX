import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDatabase } from '../database';
import { VideoModel, LogModel } from '../models';
import { analyzeVideoWithGemini } from './ai.service';

/**
 * Google Drive Entegrasyon Servisi
 * Servis hesabı (Service Account) kullanarak belirli bir klasördeki yeni .mp4 dosyalarını indirir.
 */
export class DriveIntegrationService {
    private driveClient: drive_v3.Drive | null = null;
    private db = getDatabase();

    constructor() {
        if (!config.drive.enabled) {
            logger.info('Google Drive senkronizasyonu devre dışı.');
            return;
        }

        // drive_files tablosunu garanti et (migration çalışmayabilir)
        try {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS drive_files (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id     TEXT    NOT NULL UNIQUE,
                    filename    TEXT    NOT NULL,
                    status      TEXT    NOT NULL DEFAULT 'downloaded',
                    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_drive_files_file_id ON drive_files(file_id);
                CREATE INDEX IF NOT EXISTS idx_drive_files_status ON drive_files(status);
            `);
        } catch (e) { }

        try {
            // Service Account yetkilendirmesi
            const auth = new google.auth.GoogleAuth({
                keyFile: config.drive.serviceAccountPath,
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });

            this.driveClient = google.drive({ version: 'v3', auth });
            logger.info('Google Drive yetkilendirmesi başarılı (Service Account).');
        } catch (error: any) {
            logger.error('Google Drive yetkilendirme hatası:', error.message);
        }
    }

    /**
     * Drive klasörünü kontrol et ve yeni videoları indir
     */
    async syncVideos(): Promise<{ added: number, deleted: number }> {
        if (!this.driveClient || !config.drive.folderId || !config.drive.enabled) {
            return { added: 0, deleted: 0 };
        }

        logger.info(`Google Drive senaryosu başlıyor. Klasör ID: ${config.drive.folderId}`);
        const stats = { added: 0, deleted: 0 };

        try {
            // Klasör içindeki .mp4 ve .mov dosyalarını listele
            const res = await this.driveClient.files.list({
                q: `'${config.drive.folderId}' in parents and (mimeType='video/mp4' or mimeType='video/quicktime' or name contains '.mp4' or name contains '.mov') and trashed=false`,
                fields: 'files(id, name, mimeType, size)',
                spaces: 'drive',
            });

            const files = res.data.files || [];
            const driveFileIds = new Set(files.map(f => f.id).filter((id): id is string => !!id));

            logger.info(`Drive klasöründe ${files.length} video dosyası tespit edildi. Temizlik ve senkronizasyon başlıyor...`);

            // 1. Aggressive Cleanup: videos/ klasöründeki sahipsiz dosyaları sil
            this.cleanupOrphanedLocalFiles(driveFileIds);

            // 2. Reconciliation: Drive'dan kalkmış kayıtları yerelden temizle
            try {
                const localDriveFiles = this.db.prepare(
                    'SELECT file_id, filename FROM drive_files WHERE status = ?'
                ).all('downloaded') as { file_id: string, filename: string }[];

                for (const local of localDriveFiles) {
                    if (!driveFileIds.has(local.file_id)) {
                        logger.info(`Drive'dan kalkmış dosya yerelden temizleniyor: ${local.filename}`);
                        const video = VideoModel.findByFilename(local.filename);
                        if (video) VideoModel.delete(video.id);
                        this.db.prepare('DELETE FROM drive_files WHERE file_id = ?').run(local.file_id);
                        stats.deleted++;
                    }
                }
            } catch (reconError: any) {
                logger.error('Drive reconciliation hatası:', reconError.message);
            }

            // 3. DB Cleanup: Veritabanında kayıtlı ama dosyası disk'te olmayan videoları sil
            try {
                const allVideos = VideoModel.findAll({ limit: 9999 }).items;
                for (const video of allVideos) {
                    const videoPath = path.join(config.videosDir, video.filename);
                    if (!fs.existsSync(videoPath)) {
                        logger.info(`DB Cleanup: Dosyası olmayan video siliniyor: ${video.filename}`);
                        VideoModel.delete(video.id);
                        stats.deleted++;
                    }
                }
            } catch (dbCleanupError: any) {
                logger.error('DB cleanup hatası:', dbCleanupError.message);
            }

            if (files.length === 0) {
                logger.debug('Drive klasöründe indirilecek yeni video yok.');
                return stats;
            }

            // 3. Dosyaları işle
            for (const file of files) {
                if (file.id && file.name) {
                    const isNew = await this.processDriveFile(file.id, file.name);
                    if (isNew) stats.added++;
                }
            }
        } catch (error: any) {
            logger.error('Drive dosyaları listelenirken hata:', error.message);
        }

        return stats;
    }

    /**
     * Tek bir dosyayı işle: DB'de var mı kontrol et, yoksa indir.
     */
    private async processDriveFile(fileId: string, filename: string): Promise<boolean> {
        try {
            // Bu dosya daha önce işlenmiş mi?
            const existing = this.db.prepare('SELECT id, status FROM drive_files WHERE file_id = ?').get(fileId) as any;
            const inVideosTable = VideoModel.findByFilename(filename);

            if (existing && inVideosTable) {
                if (existing.status === 'downloaded' || existing.status === 'downloading') {
                    // Zaten inik/iniyor ve DB'de kayıtlı
                    return false;
                }
            }

            if (!existing) {
                // Veritabanına yeni kayıt aç
                this.db.prepare(
                    'INSERT INTO drive_files (file_id, filename, status) VALUES (?, ?, ?)'
                ).run(fileId, filename, 'downloading');
            }

            logger.info(`Drive'dan yeni dosya indiriliyor: ${filename} (${fileId})`);

            // Dosyayı indir
            const destPath = path.join(config.videosDir, filename);
            await this.downloadFile(fileId, destPath);

            // Başarılı ise durumu güncelle
            this.db.prepare(
                'UPDATE drive_files SET status = ?, updated_at = datetime("now") WHERE file_id = ?'
            ).run('downloaded', fileId);

            logger.info(`✅ Drive dosyası başarıyla indirildi: ${filename}`);

            // AI Metadata Üretimi
            try {
                const baseName = path.parse(filename).name;
                const txtPath = path.join(config.videosDir, `${baseName}.txt`);

                logger.info(`AI videoyu izliyor ve analiz ediyor (${filename})...`);
                const aiMetadata = await analyzeVideoWithGemini(destPath);

                const txtContent = [
                    `title: ${aiMetadata.title || baseName}`,
                    `description: ${aiMetadata.description}`,
                    `tags: ${aiMetadata.tags && aiMetadata.tags.length > 0 ? aiMetadata.tags.join(', ') : 'shorts, video, viral'}`,
                ].join('\n');

                fs.writeFileSync(txtPath, txtContent, 'utf-8');
                logger.info(`✅ AI Video Analizi Tamamlandı: ${txtPath}`);

                const videoData = {
                    filename,
                    title: aiMetadata.title || baseName,
                    description: aiMetadata.description || '',
                    tags: aiMetadata.tags || [],
                };

                // Eğer video zaten yoksa ekle (Duplicate kontrol)
                const existingVideo = VideoModel.findByFilename(filename);
                if (!existingVideo) {
                    const video = VideoModel.create(videoData);
                    LogModel.create(video.id, `Drive'dan indirildi ve AI ile analiz edildi. (Metadata: ${txtPath})`);
                    logger.info(`✅ Video veritabanına eklendi: ${filename}`);
                    return true;
                }
            } catch (aiError: any) {
                logger.error(`AI Video Analiz hatası: ${aiError.message}`);

                // Hata alsa bile videoyu veritabanına ekleyelim (en azından dosya adı ile)
                const existingVideo = VideoModel.findByFilename(filename);
                if (!existingVideo) {
                    const video = VideoModel.create({ filename, title: filename });
                    LogModel.create(video.id, `Drive'dan indirildi (AI analizi atlandı: ${aiError.message})`);
                    return true;
                }
            }

            return false;
        } catch (error: any) {
            const errMsg = error?.message || error?.code || String(error);
            logger.error(`Drive dosyası indirme hatası (${filename}): ${errMsg}`);
            if (error?.stack) logger.error(`Stack: ${error.stack}`);

            // Hata aldıysak durumu güncelle
            this.db.prepare(
                'UPDATE drive_files SET status = ?, updated_at = datetime("now") WHERE file_id = ?'
            ).run('failed', fileId);

            return false;
        }
    }

    /**
     * videos/ klasöründe olup DB'de veya Drive'da izi olmayan dosyaları temizler.
     */
    private cleanupOrphanedLocalFiles(activeDriveFileIds: Set<string>): void {
        try {
            const files = fs.readdirSync(config.videosDir);
            for (const file of files) {
                if (!file.toLowerCase().endsWith('.mp4')) continue;

                // 1. Bu dosya veritabanında (videos tablosu) var mı?
                const inVideosTable = VideoModel.findByFilename(file);
                if (inVideosTable) continue;

                // 2. Bu dosya Drive takip tablosunda mı?
                const inDriveTable = this.db.prepare('SELECT file_id FROM drive_files WHERE filename = ?').get(file) as { file_id: string } | undefined;

                if (inDriveTable) {
                    // Eğer takip tablosundaysa ama Drive'da artık yoksa (activeDriveFileIds'de yoksa) sil
                    if (!activeDriveFileIds.has(inDriveTable.file_id)) {
                        this.deleteLocalFile(file);
                    }
                } else {
                    // Takip tablosunda bile yoksa doğrudan sil (orphaned)
                    this.deleteLocalFile(file);
                }
            }
        } catch (err: any) {
            logger.error(`Orphan cleanup hatası: ${err.message}`);
        }
    }

    private deleteLocalFile(filename: string): void {
        try {
            const videoPath = path.join(config.videosDir, filename);
            const txtPath = path.join(config.videosDir, `${path.parse(filename).name}.txt`);

            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
                logger.info(`Orphaned video silindi: ${filename}`);
            }
            if (fs.existsSync(txtPath)) {
                fs.unlinkSync(txtPath);
            }
        } catch (e) { }
    }

    /**
     * Drive'dan stream ile dosya indirme yardımcı fonksiyonu
     */
    private async downloadFile(fileId: string, destPath: string): Promise<void> {
        if (!this.driveClient) throw new Error('Drive client yok');

        logger.info(`Download başlıyor: fileId=${fileId}, dest=${destPath}`);

        try {
            const res = await this.driveClient.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            const dest = fs.createWriteStream(destPath);
            await pipeline(res.data as any, dest);

            // Dosya boyutunu kontrol et
            const fileStats = fs.statSync(destPath);
            logger.info(`Download tamamlandı: ${destPath} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (downloadError: any) {
            // İndirme hatası olursa yarım kalan dosyayı sil
            if (fs.existsSync(destPath)) {
                try { fs.unlinkSync(destPath); } catch (e) { }
            }
            const errMsg = downloadError?.message || downloadError?.code || String(downloadError);
            throw new Error(`Download hatası: ${errMsg}`);
        }
    }
}
