import { Router, Request, Response } from 'express';
import { downloadVideo, extractMetadata, DownloadRequest } from '../services/downloader.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../models/types';

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

        logger.info(`Video indirme isteği: ${url}`);
        const result = await downloadVideo({ url, title, description, tags });

        if (result.success) {
            res.json({
                success: true,
                message: 'Video başarıyla indirildi',
                data: result,
            } as ApiResponse);
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'İndirme başarısız',
            } as ApiResponse);
        }
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
