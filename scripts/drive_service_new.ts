import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDatabase } from '../database';
import { VideoModel, LogModel } from '../models';
import { analyzeVideoWithGemini } from './ai.service';
import { getNextScheduleSlot } from '../utils/date-utils';
import { muxVideoAndAudio } from '../utils/video-utils';

/**
 * Google Drive Entegrasyon Servisi
 * Servis hesab─▒ (Service Account) kullanarak belirli bir klas├Ârdeki yeni .mp4 dosyalar─▒n─▒ indirir.
 */
export class DriveIntegrationService {
    private driveClient: drive_v3.Drive | null = null;
    private db = getDatabase();

    constructor() {
        if (!config.drive.enabled) {
            logger.info('Google Drive senkronizasyonu devre d─▒┼ş─▒.');
            return;
        }

        // drive_files tablosunu garanti et (migration ├ğal─▒┼şmayabilir)
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
            logger.info('Google Drive yetkilendirmesi ba┼şar─▒l─▒ (Service Account).');
        } catch (error: any) {
            logger.error('Google Drive yetkilendirme hatas─▒:', error.message);
        }
    }

    /**
     * Drive klas├Âr├╝n├╝ kontrol et ve yeni videolar─▒ indir
     */
    async syncVideos(): Promise<{ added: number, deleted: number }> {
        if (!this.driveClient || !config.drive.folderId || !config.drive.enabled) {
            return { added: 0, deleted: 0 };
        }

        logger.info(`Google Drive senaryosu ba┼şl─▒yor. Klas├Âr ID: ${config.drive.folderId}`);
        const stats = { added: 0, deleted: 0 };

        try {
            // Klas├Âr i├ğindeki .mp4 ve .mov dosyalar─▒n─▒ listele
            const res = await this.driveClient.files.list({
                q: `'${config.drive.folderId}' in parents and (mimeType='video/mp4' or mimeType='video/quicktime' or name contains '.mp4' or name contains '.mov') and trashed=false`,
                fields: 'files(id, name, mimeType, size)',
                spaces: 'drive',
            });

            const files = res.data.files || [];
            const driveFileIds = new Set(files.map(f => f.id).filter((id): id is string => !!id));

            logger.info(`Drive klas├Âr├╝nde ${files.length} video dosyas─▒ tespit edildi. Temizlik ve senkronizasyon ba┼şl─▒yor...`);

            // 1. Aggressive Cleanup: videos/ klas├Âr├╝ndeki sahipsiz dosyalar─▒ sil
            this.cleanupOrphanedLocalFiles(driveFileIds);

            // 2. Reconciliation: Drive'dan kalkm─▒┼ş kay─▒tlar─▒ yerelden temizle
            try {
                const localDriveFiles = this.db.prepare(
                    'SELECT file_id, filename FROM drive_files WHERE status = ?'
                ).all('downloaded') as { file_id: string, filename: string }[];

                for (const local of localDriveFiles) {
                    if (!driveFileIds.has(local.file_id)) {
                        logger.info(`Drive'dan kalkm─▒┼ş dosya yerelden temizleniyor: ${local.filename}`);
                        const video = VideoModel.findByFilename(local.filename);
                        if (video) {
                            if (video.status !== 'uploaded') {
                                VideoModel.delete(video.id);
                                stats.deleted++;
                            } else {
                                logger.info(`Video daha ├Ânce y├╝klendi─şi i├ğin DB kayd─▒ korunuyor: ${local.filename}`);
                            }
                        } else {
                            stats.deleted++; // DB'de yok ama drive_files'da varsa saya├ğ arts─▒n
                        }
                        this.db.prepare('DELETE FROM drive_files WHERE file_id = ?').run(local.file_id);
                    }
                }
            } catch (reconError: any) {
                logger.error('Drive reconciliation hatas─▒:', reconError.message);
            }

            // 3. DB Cleanup: Veritaban─▒nda kay─▒tl─▒ ama dosyas─▒ disk'te olmayan videolar─▒ sil
            try {
                const allVideos = VideoModel.findAll({ limit: 9999 }).items;
                for (const video of allVideos) {
                    const videoPath = path.join(config.videosDir, video.filename);
                    if (!fs.existsSync(videoPath)) {
                        if (video.status !== 'uploaded') {
                            logger.info(`DB Cleanup: Dosyas─▒ olmayan video siliniyor: ${video.filename}`);
                            VideoModel.delete(video.id);
                            stats.deleted++;
                        }
                    }
                }
            } catch (dbCleanupError: any) {
                logger.error('DB cleanup hatas─▒:', dbCleanupError.message);
            }

            if (files.length === 0) {
                logger.debug('Drive klas├Âr├╝nde indirilecek yeni video yok.');
                return stats;
            }

            // 4. Dosyalar─▒ i┼şle
            for (const file of files) {
                if (file.id && file.name) {
                    logger.info(`Dosya i┼şleniyor: ${file.name} (${file.id})`);
                    const isNew = await this.processDriveFile(file.id, file.name);
                    if (isNew) stats.added++;
                } else {
                    logger.warn(`Dosya atland─▒: id=${file.id}, name=${file.name}`);
                }
            }
        } catch (error: any) {
            const errMsg = error?.message || error?.code || String(error);
            logger.error(`Drive dosyalar─▒ listelenirken hata: ${errMsg}`);
            if (error?.stack) logger.error(`Stack: ${error.stack}`);
        }

        return stats;
    }

    /**
     * Tek bir dosyay─▒ i┼şle: DB'de var m─▒ kontrol et, yoksa indir.
     */
    private async processDriveFile(fileId: string, filename: string): Promise<boolean> {
        try {
            // Bu dosya daha ├Ânce i┼şlenmi┼ş mi?
            const existing = this.db.prepare('SELECT id, status FROM drive_files WHERE file_id = ?').get(fileId) as any;
            const inVideosTable = VideoModel.findByFilename(filename);

            // DURUM 1: Tamamen ba┼şar─▒yla indirilmi┼ş, AI yap─▒lm─▒┼ş ve DB'de var. Atlaya biliriz.
            if (existing && existing.status === 'downloaded' && inVideosTable) {
                return false;
            }

            // DURUM 2: Kay─▒t var ama eksik (failed kalm─▒┼ş, veya videos tablosuna girmemi┼ş)
            // Bu durumda status'u 'downloading' yap─▒p ba┼ştan ba┼şlayaca─ş─▒z.
            if (existing) {
                logger.info(`Drive dosyas─▒ yeniden deneniyor (eski durum: ${existing.status}): ${filename}`);
                this.db.prepare(
                    'UPDATE drive_files SET status = ? WHERE file_id = ?'
                ).run('downloading', fileId);
            } else {
                // Veritaban─▒na yeni kay─▒t a├ğ
                this.db.prepare(
                    'INSERT INTO drive_files (file_id, filename, status) VALUES (?, ?, ?)'
                ).run(fileId, filename, 'downloading');
            }

            logger.info(`Drive'dan dosya indiriliyor: ${filename} (${fileId})`);

            // Dosyay─▒ indir
            const destPath = path.join(config.videosDir, filename);
            await this.downloadFile(fileId, destPath);

            // Muxing Kontrol├╝
            let finalVideoPath = destPath;
            let finalFilename = filename;

            if (filename.toLowerCase().endsWith('v.mp4')) {
                const baseName = filename.slice(0, -5); // .v.mp4 k─▒sm─▒n─▒ at
                const audioFilename = `${baseName}a.m4a`;
                const audioPath = path.join(config.videosDir, audioFilename);

                // E─şer ses dosyas─▒ yerelde varsa mux yap
                if (fs.existsSync(audioPath)) {
                    finalFilename = `${baseName}.mp4`;
                    finalVideoPath = path.join(config.videosDir, finalFilename);
                    logger.info(`DASH par├ğalar─▒ tespit edildi, muxing ba┼şlat─▒l─▒yor: ${filename} + ${audioFilename}`);
                    
                    try {
                        await muxVideoAndAudio(destPath, audioPath, finalVideoPath);
                        logger.info(`Ô£à Muxing ba┼şar─▒l─▒: ${finalFilename}`);
                        
                        // Orijinal par├ğalar─▒ temizle
                        try {
                            fs.unlinkSync(destPath);
                            fs.unlinkSync(audioPath);
                        } catch (e) { }
                    } catch (muxError: any) {
                        logger.error(`ÔØî Muxing hatas─▒: ${muxError.message}. Orijinal video ile devam ediliyor.`);
                        finalVideoPath = destPath;
                        finalFilename = filename;
                    }
                } else {
                    logger.warn(`Ses dosyas─▒ hen├╝z indirilmemi┼ş: ${audioFilename}. Muxing atlan─▒yor, bir sonraki d├Âng├╝de tamamlanabilir.`);
                }
            }

            // Ba┼şar─▒l─▒ ise durumu g├╝ncelle
            this.db.prepare(
                'UPDATE drive_files SET status = ? WHERE file_id = ?'
            ).run('downloaded', fileId);

            logger.info(`Ô£à Drive dosyas─▒ ba┼şar─▒yla indirildi: ${filename}`);

            // E─şer ses dosyas─▒ysa, video par├ğas─▒ yerelde mi kontrol et ve muxing tetikle
            if (filename.toLowerCase().endsWith('a.m4a')) {
                const baseName = filename.slice(0, -5);
                const videoFilename = `${baseName}v.mp4`;
                const videoPath = path.join(config.videosDir, videoFilename);

                if (fs.existsSync(videoPath)) {
                    const finalMuxedFilename = `${baseName}.mp4`;
                    const finalMuxedPath = path.join(config.videosDir, finalMuxedFilename);
                    logger.info(`Ses dosyas─▒ indi, video par├ğas─▒ mevcut. Muxing ba┼şlat─▒l─▒yor: ${videoFilename} + ${filename}`);
                    
                    try {
                        await muxVideoAndAudio(videoPath, destPath, finalMuxedPath);
                        logger.info(`Ô£à Muxing ba┼şar─▒l─▒: ${finalMuxedFilename}`);

                        // Par├ğalar─▒ sil
                        try { fs.unlinkSync(videoPath); fs.unlinkSync(destPath); } catch (e) { }

                        // AI Analizi ve DB Kayd─▒ i├ğin sanki video yeni inmi┼ş gibi devam et
                        filename = finalMuxedFilename;
                        destPath = finalMuxedPath;
                    } catch (muxError: any) {
                        logger.error(`ÔØî Muxing hatas─▒: ${muxError.message}`);
                        return false; 
                    }
                } else {
                    logger.info(`Ses dosyas─▒ indi ama video par├ğas─▒ (${videoFilename}) hen├╝z yok. Bekleniyor...`);
                    return true; // Ba┼şar─▒l─▒ say ama AI yapma
                }
            } else if (filename.toLowerCase().endsWith('v.mp4')) {
                // E─şer mux yap─▒ld─▒ysa filename ve destPath g├╝ncellendi
                filename = finalFilename;
                destPath = finalVideoPath;

                // E─şer hala v.mp4 ise ve ses hen├╝z inmemi┼şse AI analizini ertele
                if (filename.toLowerCase().endsWith('v.mp4')) {
                    logger.info(`Video par├ğas─▒ indi ama ses hen├╝z yok. AI analizi erteleniyor.`);
                    return true;
                }
            }

            // AI Metadata ├£retimi
            try {
                const baseName = path.parse(filename).name;
                const txtPath = path.join(config.videosDir, `${baseName}.txt`);

                logger.info(`AI videoyu izliyor ve analiz ediyor (${filename})...`);
                const aiMetadata = await analyzeVideoWithGemini(destPath);

                const baseDescription = aiMetadata.description || '';
                const socialText = '\n\nBizi sosyal medyadan takip etmeyi ve sitemizi ziyaret etmeyi unutmay─▒n! ­şæç­şöù Website: www.aperionx.com­şô© Instagram: @aperionx';
                const finalDescription = baseDescription + socialText;

                const txtContent = [
                    `title: ${aiMetadata.title || baseName}`,
                    `description: ${finalDescription.replace(/\n/g, '\\n')}`,
                    `tags: ${aiMetadata.tags && aiMetadata.tags.length > 0 ? aiMetadata.tags.join(', ') : 'shorts, video, viral'}`,
                ].join('\n');

                fs.writeFileSync(txtPath, txtContent, 'utf-8');
                logger.info(`Ô£à AI Video Analizi Tamamland─▒: ${txtPath}`);

                const videoData = {
                    filename,
                    title: aiMetadata.title || baseName,
                    description: finalDescription,
                    tags: aiMetadata.tags || [],
                    scheduled_date: getNextScheduleSlot(),
                };

                // E─şer video zaten yoksa ekle, varsa g├╝ncelle
                const existingVideo = VideoModel.findByFilename(filename);
                if (!existingVideo) {
                    const video = VideoModel.create(videoData);
                    LogModel.create(video.id, `Drive'dan indirildi ve AI ile analiz edildi. (Metadata: ${txtPath})`);
                    logger.info(`Ô£à Video veritaban─▒na eklendi: ${filename}`);
                } else {
                    VideoModel.update(existingVideo.id, videoData);
                    LogModel.create(existingVideo.id, `Drive'dan indirildi ve AI metadata g├╝ncellendi. (Metadata: ${txtPath})`);
                    logger.info(`Ô£à Varolan videonun AI metadatas─▒ g├╝ncellendi: ${filename}`);
                }
                return true;
            } catch (dbOrAiError: any) {
                const errMsg = dbOrAiError?.message || String(dbOrAiError);
                logger.error(`AI Video Analiz veya DB Kay─▒t hatas─▒: ${errMsg}`);
                if (dbOrAiError?.stack) logger.error(`Stack: ${dbOrAiError.stack}`);

                // Hata alsa bile videoyu veritaban─▒na ekleyelim (en az─▒ndan dosya ad─▒ ile)
                try {
                    const existingVideo = VideoModel.findByFilename(filename);
                    if (!existingVideo) {
                        const video = VideoModel.create({ filename, title: filename, tags: [], scheduled_date: getNextScheduleSlot() });
                        LogModel.create(video.id, `Drive'dan indirildi (Kay─▒t hatas─▒ atland─▒: ${errMsg})`);
                    }
                } catch (fallbackError: any) {
                    logger.error(`Fallback DB kay─▒t hatas─▒: ${fallbackError.message}`);
                }
                return true;
            }

            return false;
        } catch (error: any) {
            const errMsg = error?.message || error?.code || String(error);
            logger.error(`Drive dosyas─▒ indirme hatas─▒ (${filename}): ${errMsg}`);
            if (error?.stack) logger.error(`Stack: ${error.stack}`);

            // Hata ald─▒ysak durumu g├╝ncelle
            try {
                this.db.prepare(
                    'UPDATE drive_files SET status = ? WHERE file_id = ?'
                ).run('failed', fileId);
            } catch (updateError: any) {
                logger.error(`Durum g├╝ncellenirken hata: ${updateError.message}`);
            }

            return false;
        }
    }

    /**
     * videos/ klas├Âr├╝nde olup DB'de veya Drive'da izi olmayan dosyalar─▒ temizler.
     */
    private cleanupOrphanedLocalFiles(activeDriveFileIds: Set<string>): void {
        try {
            const files = fs.readdirSync(config.videosDir);
            for (const file of files) {
                if (!file.toLowerCase().endsWith('.mp4')) continue;

                // 1. Bu dosya veritaban─▒nda (videos tablosu) var m─▒?
                const inVideosTable = VideoModel.findByFilename(file);
                if (inVideosTable) continue;

                // 2. Bu dosya Drive takip tablosunda m─▒?
                const inDriveTable = this.db.prepare('SELECT file_id FROM drive_files WHERE filename = ?').get(file) as { file_id: string } | undefined;

                if (inDriveTable) {
                    // E─şer takip tablosundaysa ama Drive'da art─▒k yoksa (activeDriveFileIds'de yoksa) sil
                    if (!activeDriveFileIds.has(inDriveTable.file_id)) {
                        this.deleteLocalFile(file);
                    }
                } else {
                    // Takip tablosunda bile yoksa do─şrudan sil (orphaned)
                    this.deleteLocalFile(file);
                }
            }
        } catch (err: any) {
            logger.error(`Orphan cleanup hatas─▒: ${err.message}`);
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
     * Drive'dan stream ile dosya indirme yard─▒mc─▒ fonksiyonu
     */
    private async downloadFile(fileId: string, destPath: string): Promise<void> {
        if (!this.driveClient) throw new Error('Drive client yok');

        logger.info(`Download ba┼şl─▒yor: fileId=${fileId}, dest=${destPath}`);

        try {
            const res = await this.driveClient.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            const dest = fs.createWriteStream(destPath);
            await pipeline(res.data as any, dest);

            // Dosya boyutunu kontrol et
            const fileStats = fs.statSync(destPath);
            logger.info(`Download tamamland─▒: ${destPath} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (downloadError: any) {
            // ─░ndirme hatas─▒ olursa yar─▒m kalan dosyay─▒ sil
            if (fs.existsSync(destPath)) {
                try { fs.unlinkSync(destPath); } catch (e) { }
            }
            const errMsg = downloadError?.message || downloadError?.code || String(downloadError);
            throw new Error(`Download hatas─▒: ${errMsg}`);
        }
    }
}
