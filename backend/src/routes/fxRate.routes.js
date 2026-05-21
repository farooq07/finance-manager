import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { latest, history, refresh } from '../controllers/fxRate.controller.js';

const router = express.Router();
router.use(verifyToken);

router.get('/latest',   latest);
router.get('/history',  history);
router.post('/refresh', refresh);

export default router;
