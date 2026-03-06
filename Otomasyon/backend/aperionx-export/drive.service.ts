import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDatabase } from '../database';

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
    async syncVideos(): Promise<void> {
        if (!this.driveClient || !config.drive.folderId || !config.drive.enabled) {
            return; // Devre dışıysa veya ayarlanmamışsa çık
        }

        logger.info(`Google Drive senaryosu başlıyor. Klasör ID: ${config.drive.folderId}`);

        try {
            // Klasör içindeki .mp4 ve .mov dosyalarını listele
            const res = await this.driveClient.files.list({
                q: `'${config.drive.folderId}' in parents and (mimeType='video/mp4' or mimeType='video/quicktime' or name contains '.mp4' or name contains '.mov') and trashed=false`,
                fields: 'files(id, name, mimeType, size)',
                spaces: 'drive',
            });

            const files = res.data.files;
            if (!files || files.length === 0) {
                logger.debug('Drive klasöründe yeni video bulunamadı.');
                return;
            }

            logger.info(`Drive klasöründe ${files.length} adet video dosyası bulundu.`);

            for (const file of files) {
                if (file.id && file.name) {
                    await this.processDriveFile(file.id, file.name);
                }
            }
        } catch (error: any) {
            logger.error('Drive dosyaları listelenirken hata:', error.message);
        }
    }

    /**
     * Tek bir dosyayı işle: DB'de var mı kontrol et, yoksa indir.
     */
    private async processDriveFile(fileId: string, filename: string): Promise<void> {
        try {
            // Bu dosya daha önce işlenmiş mi?
            const existing = this.db.prepare('SELECT id, status FROM drive_files WHERE file_id = ?').get(fileId) as any;

            if (existing) {
                if (existing.status === 'downloaded' || existing.status === 'downloading') {
                    // Zaten inik veya iniyor
                    return;
                }
            } else {
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
                const { analyzeVideoWithGemini } = require('./ai.service');
                const aiMetadata = await analyzeVideoWithGemini(destPath);

                const txtContent = [
                    `title: ${aiMetadata.title || baseName}`,
                    `description: ${aiMetadata.description}`,
                    `tags: ${aiMetadata.tags && aiMetadata.tags.length > 0 ? aiMetadata.tags.join(', ') : 'shorts, video, viral'}`,
                ].join('\n');

                fs.writeFileSync(txtPath, txtContent, 'utf-8');
                logger.info(`✅ AI Video Analizi Tamamlandı: ${txtPath}`);
            } catch (aiError: any) {
                logger.error(`AI Video Analiz hatası: ${aiError.message}`);
            }

            // Not: İndirilen dosya videosDir dizinine kondu. 
            // ScannerService bir sonraki taramasında bu dosyayı görüp otomatik olarak kuyruğa ekleyecek.

        } catch (error: any) {
            logger.error(`Drive dosyası indirme hatası (${filename}):`, error.message);

            // Hata aldıysak durumu güncelle
            this.db.prepare(
                'UPDATE drive_files SET status = ?, updated_at = datetime("now") WHERE file_id = ?'
            ).run('failed', fileId);
        }
    }

    /**
     * Drive'dan stream ile dosya indirme yardımcı fonksiyonu
     */
    private async downloadFile(fileId: string, destPath: string): Promise<void> {
        if (!this.driveClient) return;

        const res = await this.driveClient.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        const dest = fs.createWriteStream(destPath);
        await pipeline(res.data as any, dest);
    }
}
