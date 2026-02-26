import express from 'express';
import { getStocks, createStock, updateStockPrice, createStockTransaction, deleteStock } from '../controllers/stock.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getStocks);
router.post('/', createStock);
router.put('/:id', updateStockPrice);
router.post('/:id/transactions', createStockTransaction);
router.delete('/:id', deleteStock);

export default router;
