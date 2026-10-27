import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { investmentOverview } from '../services/wealth.service.js';

const router = express.Router();
router.use(verifyToken);

// Stocks, mutual funds and brokerage cash in one read, valued exactly as net worth values them.
router.get('/', async (req, res) => {
    try {
        res.json(await investmentOverview(req.user.id));
    } catch (error) {
        console.error('Error building investment overview:', error);
        res.status(500).json({ message: 'Could not load your investments' });
    }
});

export default router;
