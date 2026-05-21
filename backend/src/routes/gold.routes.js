import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import {
    listItems, createItem, updateItem, deleteItem,
    syncPrice, priceHistory, latestPrice,
    hasPin, setPin, changePin, verifyPin,
    zakatSummary,
} from '../controllers/gold.controller.js';

const router = express.Router();
router.use(verifyToken);

// Items CRUD
router.get('/items',         listItems);
router.post('/items',        createItem);
router.put('/items/:id',     updateItem);
router.delete('/items/:id',  deleteItem);

// Prices
router.post('/sync-price',     syncPrice);
router.get('/price-history',   priceHistory);
router.get('/latest-price',    latestPrice);

// PIN
router.get('/has-pin',       hasPin);
router.post('/set-pin',      setPin);
router.post('/change-pin',   changePin);
router.post('/verify-pin',   verifyPin);

// Zakat
router.get('/zakat-summary', zakatSummary);

export default router;
