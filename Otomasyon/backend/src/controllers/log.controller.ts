import { Request, Response } from 'express';
import { LogModel } from '../models';
import { ApiResponse } from '../models/types';
import { logger } from '../utils/logger';

/**
 * Log Controller — Log işlemleri
 */
export class LogController {
    /**
     * GET /api/logs — Son logları getir
     */
    static getRecent(req: Request, res: Response): void {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const logs = LogModel.findRecent(limit);
            res.json({ success: true, data: logs } as ApiResponse);
        } catch (error: any) {
            logger.error('Log listesi hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * GET /api/logs/video/:videoId — Bir video'nun logları
     */
    static getByVideoId(req: Request, res: Response): void {
        try {
            const videoId = parseInt(req.params.videoId);
            const logs = LogModel.findByVideoId(videoId);
            res.json({ success: true, data: logs } as ApiResponse);
        } catch (error: any) {
            logger.error('Video log hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }
}
