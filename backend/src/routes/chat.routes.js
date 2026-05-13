import express from 'express';
import rateLimit from 'express-rate-limit';
import verifyToken from '../middleware/auth.middleware.js';
import { createSession, getSessions, getSession, deleteSession, sendMessage } from '../controllers/chat.controller.js';

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many messages. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(verifyToken);

router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/message', chatLimiter, sendMessage);

export default router;
