import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { getHistory, triggerSnapshot } from '../controllers/networth.controller.js';

const router = express.Router();
router.use(verifyToken);

router.get('/history',  getHistory);
router.post('/snapshot', triggerSnapshot);

export default router;
