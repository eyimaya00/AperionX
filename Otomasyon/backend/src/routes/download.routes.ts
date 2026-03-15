import { Router, Request, Response } from 'express';
import { downloadVideo, extractMetadata, DownloadRequest } from '../services/downloader.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../models/types';
import { VideoModel, LogModel } from '../models';

const router = Router();

/**
 * POST /api/download — URL'den video indir
 * Body: { url: string, title?: string, description?: string, tags?: string }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, title, description, tags } = req.body as DownloadRequest;

        if (!url) {
            res.status(400).json({ success: false, error: 'URL zorunludur' } as ApiResponse);
            return;
        }

        logger.info(`Video indirme isteği (Sıraya Alınıyor): ${url}`);

        const timestamp = Date.now();
        const filename = `dl_${timestamp}.mp4`;

        // DB'ye hemen ekle (indiriliyor statusuyle eşanlamlı 'processing')
        const video = VideoModel.create({
            filename: filename,
            title: title || 'İndiriliyor...',
            description: description || '',
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
        });
        VideoModel.update(video.id, { status: 'processing' });
        LogModel.create(video.id, 'Video indirme sırasına alındı.');

        // İndirmeyi arka planda başlat
        downloadVideo({ url, title, description, tags, targetFilename: filename })
            .then(result => {
                if (result.success) {
                    // İndirme bitti, statüyü pending (bekliyor) yap
                    VideoModel.update(video.id, { 
                        status: 'pending', 
                        title: result.metadata?.title || video.title,
                        description: video.description || result.metadata?.description || '',
                    });
                    
                    // Tagleri guncelle (AI veya URL'den gelmis olabilir)
                    if (result.metadata?.tags && result.metadata.tags.length > 0) {
                        VideoModel.update(video.id, { tags: result.metadata.tags });
                    }
                    LogModel.create(video.id, '✅ İndirme tamamlandı.');
                } else {
                    VideoModel.update(video.id, { status: 'failed' });
                    LogModel.create(video.id, `❌ İndirme hatası: ${result.error}`);
                }
            })
            .catch(err => {
                VideoModel.update(video.id, { status: 'failed' });
                LogModel.create(video.id, `❌ Kritik indirme hatası: ${err.message}`);
                logger.error(`Kritik İndirme Hatası [ID: ${video.id}]:`, err);
            });

        // Kullanıcıya hemen cevap dön
        res.json({
            success: true,
            message: 'Video başarıyla sıraya alındı, arka planda indiriliyor.',
            data: { id: video.id, filename },
        } as ApiResponse);
    } catch (error: any) {
        logger.error('Download endpoint hatası:', error);
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
});

/**
 * POST /api/download/metadata — URL'den sadece metadata çek (önizleme)
 * Body: { url: string }
 */
router.post('/metadata', async (req: Request, res: Response): Promise<void> => {
    try {
        const { url } = req.body;

        if (!url) {
            res.status(400).json({ success: false, error: 'URL zorunludur' } as ApiResponse);
            return;
        }

        const metadata = await extractMetadata(url);
        res.json({ success: true, data: metadata } as ApiResponse);
    } catch (error: any) {
        logger.error('Metadata endpoint hatası:', error);
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
});

export default router;
