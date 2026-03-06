import { Request, Response } from 'express';
import { VideoModel, LogModel } from '../models';
import { ApiResponse, CreateVideoDTO, UpdateVideoDTO, PaginationQuery } from '../models/types';
import { logger } from '../utils/logger';
import { scanVideosDirectory } from '../services/scanner.service';
import { DriveIntegrationService } from '../services/drive.service';

/**
 * Video Controller — REST API iş mantığı
 */
export class VideoController {
    /**
     * GET /api/videos — Tüm videoları listele
     */
    static getAll(req: Request, res: Response): void {
        try {
            const query: PaginationQuery = {
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
                status: req.query.status as any,
                search: req.query.search as string,
            };

            const result = VideoModel.findAll(query);
            res.json({ success: true, data: result } as ApiResponse);
        } catch (error: any) {
            logger.error('Video listesi hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * GET /api/videos/:id — Tekil video detayı
     */
    static getById(req: Request, res: Response): void {
        try {
            const id = parseInt(req.params.id);
            const video = VideoModel.findById(id);

            if (!video) {
                res.status(404).json({ success: false, error: 'Video bulunamadı' } as ApiResponse);
                return;
            }

            const logs = LogModel.findByVideoId(id);
            res.json({ success: true, data: { ...video, logs } } as ApiResponse);
        } catch (error: any) {
            logger.error('Video detay hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * POST /api/videos — Yeni video oluştur
     */
    static create(req: Request, res: Response): void {
        try {
            const data: CreateVideoDTO = req.body;

            if (!data.filename) {
                res.status(400).json({ success: false, error: 'filename alanı zorunludur' } as ApiResponse);
                return;
            }

            // Aynı dosya adıyla kayıt var mı kontrol et
            const existing = VideoModel.findByFilename(data.filename);
            if (existing) {
                res.status(409).json({ success: false, error: 'Bu dosya adı zaten kayıtlı' } as ApiResponse);
                return;
            }

            const video = VideoModel.create(data);
            LogModel.create(video.id, `Video oluşturuldu: ${data.filename}`);

            res.status(201).json({ success: true, data: video } as ApiResponse);
        } catch (error: any) {
            logger.error('Video oluşturma hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * PUT /api/videos/:id — Video güncelle
     */
    static update(req: Request, res: Response): void {
        try {
            const id = parseInt(req.params.id);
            const data: UpdateVideoDTO = req.body;

            const video = VideoModel.update(id, data);
            if (!video) {
                res.status(404).json({ success: false, error: 'Video bulunamadı' } as ApiResponse);
                return;
            }

            LogModel.create(id, `Video güncellendi: ${JSON.stringify(data)}`);
            res.json({ success: true, data: video } as ApiResponse);
        } catch (error: any) {
            logger.error('Video güncelleme hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * DELETE /api/videos/:id — Video sil
     */
    static delete(req: Request, res: Response): void {
        try {
            const id = parseInt(req.params.id);
            const deleted = VideoModel.delete(id);

            if (!deleted) {
                res.status(404).json({ success: false, error: 'Video bulunamadı' } as ApiResponse);
                return;
            }

            res.json({ success: true, message: 'Video silindi' } as ApiResponse);
        } catch (error: any) {
            logger.error('Video silme hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * GET /api/videos/stats — İstatistikler
     */
    static getStats(_req: Request, res: Response): void {
        try {
            const stats = VideoModel.getStats();
            const recentLogs = LogModel.findRecent(10);

            res.json({
                success: true,
                data: { stats, recentLogs },
            } as ApiResponse);
        } catch (error: any) {
            logger.error('İstatistik hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * POST /api/videos/scan — videos/ klasörünü tara
     * Önce Drive cleanup yapılır (orphan dosyalar temizlenir),
     * sonra kalan dosyalar taranır.
     */
    static async scan(_req: Request, res: Response): Promise<void> {
        try {
            // Önce Drive senkronizasyonu çalıştır (cleanup + yeni dosya indirme)
            // Bu, videos/ klasöründeki sahipsiz eski dosyaları temizler
            const driveService = new DriveIntegrationService();
            const driveResult = await driveService.syncVideos();

            // Sonra kalan dosyaları tara (manuel yüklemeler için)
            const result = scanVideosDirectory();

            res.json({
                success: true,
                message: `${driveResult.added + result.added} video eklendi, ${driveResult.deleted} eski dosya temizlendi, ${result.skipped} atlandı`,
                data: {
                    ...result,
                    added: driveResult.added + result.added,
                    deleted: driveResult.deleted,
                },
            } as ApiResponse);
        } catch (error: any) {
            logger.error('Tarama hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * POST /api/videos/sync-drive — Google Drive'dan videoları çek ve tara
     */
    static async syncDrive(_req: Request, res: Response): Promise<void> {
        try {
            logger.info('Manuel Drive senkronizasyonu tetiklendi...');
            const driveService = new DriveIntegrationService();

            // Drive'dan yeni videoları indir, AI analizi yap ve doğrudan DB'ye ekle.
            // ÖNEMLİ: scanVideosDirectory() burada ÇAĞRILMAMALI.
            // Çünkü scanner, videos/ klasöründeki TÜM .mp4 dosyalarını bulup DB'ye ekliyor.
            // Bu da Drive'dan silinen ama diskten henüz silinmemiş eski dosyaların
            // tekrar tekrar eklenmesine yol açıyordu.
            // Drive sync zaten kendi içinde: indir → AI analiz → DB'ye ekle yapıyor.
            const syncResult = await driveService.syncVideos();

            res.json({
                success: true,
                message: `Drive senkronizasyonu tamamlandı. ${syncResult.added} yeni video eklendi, ${syncResult.deleted} eski dosya temizlendi.`,
                data: syncResult,
            } as ApiResponse);
        } catch (error: any) {
            logger.error('Drive senkronizasyon hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }
}
