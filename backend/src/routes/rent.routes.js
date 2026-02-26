import express from 'express';
import { getRentEntries, createRentEntry, updateRentEntry, deleteRentEntry } from '../controllers/rent.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getRentEntries);
router.post('/', createRentEntry);
router.put('/:id', updateRentEntry);
router.delete('/:id', deleteRentEntry);

export default router;
