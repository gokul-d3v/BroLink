import express from 'express';
import { getConfig, syncConfig } from '../controllers/bento.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/:username', getConfig);
router.post('/sync', authMiddleware, syncConfig);

export default router;
