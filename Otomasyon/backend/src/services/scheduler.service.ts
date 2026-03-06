import cron from 'node-cron';
import path from 'path';
import { logger } from '../utils/logger';
import { VideoModel } from '../models/video.model';
import { YouTubeAuthService } from './youtube-auth.service';
import { YouTubeUploadService } from './youtube-upload.service';
import { config } from '../config';
import { DriveIntegrationService } from './drive.service';

let isUploading = false;
let isSyncingDrive = false;

/**
 * Zamanlayıcı servisi: Veritabanını belirli aralıklarla kontrol eder
 * Zamanı gelmiş ve yüklenmemiş videoları arka planda otomatik olarak YouTube'a atar.
 */
export function startScheduler() {
    // Cron ifadesi: '* * * * *' -> Her 1 dakikada bir çalıştır 
    // veya '*/5 * * * *' -> Her 5 dakikada bir çalıştır
    // Sistem yorulmasın diye her 5 dakikada bir çalışması idealdir, ancak test için 1'e ayarlıyoruz.
    const authService = new YouTubeAuthService();
    const uploadService = new YouTubeUploadService(authService);
    const driveService = new DriveIntegrationService();

    // Google Drive Sync Job - Her 1 saatte bir çalışır
    cron.schedule('0 * * * *', async () => {
        if (!config.drive.enabled) return;

        if (isSyncingDrive) {
            logger.debug('[Scheduler] Drive senkronizasyonu zaten devam ediyor...');
            return;
        }

        isSyncingDrive = true;
        try {
            await driveService.syncVideos();
        } catch (error: any) {
            logger.error('[Scheduler] Drive senkronizasyon hatası:', error.message);
        } finally {
            isSyncingDrive = false;
        }
    });

    // YouTube Upload Job
    cron.schedule('*/1 * * * *', async () => {
        if (isUploading) {
            logger.info('[Scheduler] Başka bir video şu an yükleniyor. Atlanıyor...');
            return;
        }

        logger.info('[Scheduler] Zamanlanmış videolar kontrol ediliyor...');

        try {
            // Şuan ki saatten önceye ('<=' datetime('now')) planlanmış ama hala 'pending' olan tüm videolar
            const readyVideos = VideoModel.findScheduledReady();

            if (readyVideos.length === 0) {
                logger.info('[Scheduler] Yüklenecek zamanı gelmiş video bulunamadı.');
                return;
            }

            // Olası aktif kanalı bulalım
            const activeChannels = authService.getActiveChannels();
            if (activeChannels.length === 0) {
                logger.warn('[Scheduler] Aktif YouTube kanalı bulunamadı. Lütfen panelden kanal bağlayın.');
                return;
            }
            const activeChannelId = activeChannels[0].channel_id;

            logger.info(`[Scheduler] ${readyVideos.length} adet zamanı gelmiş video bulundu! İlk video yükleniyor...`);

            // Sadece ilk sıradakini alıp yükleyelim, zaten 5 dakika sonra diğerine bakar (çakışmalar için güvenli yöntem)
            const videoToUpload = readyVideos[0];

            isUploading = true;

            // Durumu "processing" (işleniyor) yapıyoruz ki panelden anlaşılsın
            VideoModel.update(videoToUpload.id, { status: 'processing' });

            logger.info(`[Scheduler] Otomatik Yükleme Başlıyor -> [ID:${videoToUpload.id}] ${videoToUpload.title}`);

            const filePath = path.join(config.videosDir, videoToUpload.filename);
            const tags = videoToUpload.tags ? JSON.parse(videoToUpload.tags) : [];

            const result = await uploadService.uploadVideo(
                activeChannelId,
                filePath,
                {
                    title: videoToUpload.title || videoToUpload.filename,
                    description: videoToUpload.description || '',
                    tags: tags,
                    privacyStatus: 'public', // Short'lar genelde public atılır
                    shortsAutoLabel: true
                },
                videoToUpload.id
            );

            if (result.success && result.videoId) {
                logger.info(`[Scheduler] Otomatik Yükleme Tamamlandı -> [ID:${videoToUpload.id}]`);
                VideoModel.update(videoToUpload.id, {
                    status: 'uploaded',
                    youtube_video_id: result.videoId
                });

                // ÖZELLİK A: Dosyayı diskten temizle
                try {
                    const fs = require('fs');
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        logger.info(`[Scheduler] Video dosyası diskten silindi -> ${filePath}`);
                    }
                } catch (err: any) {
                    logger.error(`[Scheduler] Video dosyası silinirken hata oluştu -> ${filePath}: ${err.message}`);
                }
            } else {
                logger.error(`[Scheduler] Yükleme başarısız -> [ID:${videoToUpload.id}] Hata: ${result.error}`);
                VideoModel.update(videoToUpload.id, { status: 'failed' });
            }

        } catch (error: any) {
            logger.error(`[Scheduler] Hata oluştu: ${error.message}`);
        } finally {
            isUploading = false;
        }
    });

    logger.info('⏰ Otomatik Zamanlayıcı (Scheduler) Başlatıldı. Her 5 dakikada bir kontrol edilecek.');
}
