import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../models/types';
import { YouTubeAuthService } from '../services/youtube-auth.service';

const authService = new YouTubeAuthService();

/**
 * YouTube Controller — OAuth2 & kanal yönetimi
 */
export class YouTubeController {
    /**
     * GET /api/youtube/auth-url — OAuth2 yetkilendirme linki
     */
    static getAuthUrl(_req: Request, res: Response): void {
        try {
            const result = authService.generateAuthUrl();
            res.json({ success: true, data: result } as ApiResponse);
        } catch (error: any) {
            logger.error('Auth URL hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * GET /api/youtube/callback — OAuth2 callback
     */
    static async handleCallback(req: Request, res: Response): Promise<void> {
        try {
            const code = req.query.code as string;
            if (!code) {
                res.status(400).json({ success: false, error: 'code parametresi zorunlu' } as ApiResponse);
                return;
            }

            const result = await authService.handleCallback(code);
            res.json({
                success: true,
                message: result.isNew ? 'Yeni kanal bağlandı' : 'Kanal token güncellendi',
                data: {
                    channel_id: result.channel.channel_id,
                    channel_name: result.channel.channel_name,
                    is_new: result.isNew,
                },
            } as ApiResponse);
        } catch (error: any) {
            logger.error('OAuth callback hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * GET /api/youtube/channels — Bağlı kanallar
     */
    static getChannels(_req: Request, res: Response): void {
        try {
            const channels = authService.getAllChannels().map(ch => ({
                id: ch.id,
                channel_id: ch.channel_id,
                channel_name: ch.channel_name,
                is_active: ch.is_active,
                token_expiry: ch.token_expiry,
                created_at: ch.created_at,
            }));
            res.json({ success: true, data: channels } as ApiResponse);
        } catch (error: any) {
            logger.error('Kanal listesi hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }

    /**
     * DELETE /api/youtube/channels/:id — Kanal bağlantısını kaldır
     */
    static deleteChannel(req: Request, res: Response): void {
        try {
            const id = parseInt(req.params.id);
            const deleted = authService.deleteChannel(id);
            if (!deleted) {
                res.status(404).json({ success: false, error: 'Kanal bulunamadı' } as ApiResponse);
                return;
            }
            res.json({ success: true, message: 'Kanal bağlantısı kaldırıldı' } as ApiResponse);
        } catch (error: any) {
            logger.error('Kanal silme hatası:', error);
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
        }
    }
}
