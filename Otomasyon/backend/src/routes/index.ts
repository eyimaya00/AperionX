import { Router, Request, Response } from 'express';
import videoRoutes from './video.routes';
import logRoutes from './log.routes';
import youtubeRoutes from './youtube.routes';
import downloadRoutes from './download.routes';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        },
    });
});

// Route grupları
router.use('/videos', videoRoutes);
router.use('/logs', logRoutes);
router.use('/youtube', youtubeRoutes);
router.use('/download', downloadRoutes);

export default router;

