import express from 'express';
import { getDashboardSummary, sendManualSummaryEmail } from '../controllers/dashboard.controller.js';
import { getInsights, getSpendingRows, getAnnualSummary } from '../controllers/insights.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

// All dashboard routes should be protected
router.use(verifyToken);

router.get('/summary', getDashboardSummary);
router.get('/insights', getInsights);
router.get('/spending', getSpendingRows);
router.get('/annual', getAnnualSummary);
router.post('/send-summary', sendManualSummaryEmail);

export default router;
