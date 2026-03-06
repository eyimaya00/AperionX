import { Router } from 'express';
import { LogController } from '../controllers/log.controller';

const router = Router();

router.get('/', LogController.getRecent);
router.get('/video/:videoId', LogController.getByVideoId);

export default router;
