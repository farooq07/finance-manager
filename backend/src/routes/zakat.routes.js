import express from 'express';
import { getZakatEntries, createZakatEntry, deleteZakatEntry, getZakatSummary } from '../controllers/zakat.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/summary', getZakatSummary);
router.get('/', getZakatEntries);
router.post('/', createZakatEntry);
router.delete('/:id', deleteZakatEntry);

export default router;
