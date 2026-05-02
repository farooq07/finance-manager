import express from 'express';
import { getStocks, createStock, updateStockPrice, createStockTransaction, deleteStock, getPsxStocks, syncPsxStocks, syncStockNews, getStockNews } from '../controllers/stock.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

// Admin-only middleware
const adminOnly = (req, res, next) => {
    if (!['admin', 'super.admin'].includes(req.user?.role)) {
        return res.status(403).json({ message: 'Unauthorized - Admin access required' });
    }
    next();
};

router.post('/psx/sync', adminOnly, syncPsxStocks);
router.get('/psx', getPsxStocks);
router.get('/', getStocks);
router.post('/', createStock);
router.put('/:id', updateStockPrice);
router.post('/:id/transactions', createStockTransaction);
router.delete('/:id', deleteStock);
router.post('/news/sync', syncStockNews);
router.get('/:ticker/news', getStockNews);

export default router;
