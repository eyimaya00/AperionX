import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';

const router = Router();

// İstatistikler ve tarama (öne alınmalı, :id ile çakışmasın)
router.get('/stats', VideoController.getStats);
router.post('/scan', VideoController.scan);
router.post('/sync-drive', VideoController.syncDrive);

// CRUD
router.get('/', VideoController.getAll);
router.get('/:id', VideoController.getById);
router.post('/', VideoController.create);
router.put('/:id', VideoController.update);
router.delete('/:id', VideoController.delete);

export default router;
