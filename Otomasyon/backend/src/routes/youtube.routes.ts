import { Router } from 'express';
import { YouTubeController } from '../controllers/youtube.controller';

const router = Router();

router.get('/auth-url', YouTubeController.getAuthUrl);
router.get('/callback', YouTubeController.handleCallback);
router.get('/channels', YouTubeController.getChannels);
router.delete('/channels/:id', YouTubeController.deleteChannel);

export default router;
