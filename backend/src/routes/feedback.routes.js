import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { submitFeedback, getMyFeedback, getAllFeedback, updateFeedbackStatus } from '../controllers/feedback.controller.js';

const router = express.Router();
router.use(verifyToken);

router.post('/',                  submitFeedback);
router.get('/mine',               getMyFeedback);
router.get('/',                   getAllFeedback);
router.patch('/:id/status',       updateFeedbackStatus);

export default router;
