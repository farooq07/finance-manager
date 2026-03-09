import express from 'express';
import { getStocks, createStock, updateStockPrice, createStockTransaction, deleteStock, getPsxStocks, syncPsxStocks } from '../controllers/stock.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/psx/sync', syncPsxStocks);
router.get('/psx', getPsxStocks);
router.get('/', getStocks);
router.post('/', createStock);
router.put('/:id', updateStockPrice);
router.post('/:id/transactions', createStockTransaction);
router.delete('/:id', deleteStock);

export default router;
