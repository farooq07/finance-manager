import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { requireVaultAccess } from '../middleware/goldVault.middleware.js';
import {
    listItems, createItem, updateItem, deleteItem,
    syncPrice, priceHistory, latestPrice,
    hasPin, setPin, resetPin, changePin, verifyPin,
    zakatSummary,
} from '../controllers/gold.controller.js';

const router = express.Router();
router.use(verifyToken);

// Items CRUD — the vault must be unlocked (X-Vault-Token)
router.get('/items',         requireVaultAccess, listItems);
router.post('/items',        requireVaultAccess, createItem);
router.put('/items/:id',     requireVaultAccess, updateItem);
router.delete('/items/:id',  requireVaultAccess, deleteItem);

// Prices
router.post('/sync-price',     syncPrice);
router.get('/price-history',   priceHistory);
router.get('/latest-price',    latestPrice);

// PIN
router.get('/has-pin',       hasPin);
router.post('/set-pin',      setPin);
router.post('/reset-pin',    resetPin);
router.post('/change-pin',   changePin);
router.post('/verify-pin',   verifyPin);

// Zakat
router.get('/zakat-summary', requireVaultAccess, zakatSummary);

export default router;
