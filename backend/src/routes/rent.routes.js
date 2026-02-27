import express from 'express';
import { getRentEntries, createRentEntry, updateRentEntry, deleteRentEntry } from '../controllers/rent.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { rentEntrySchema } from '../middleware/validate.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getRentEntries);
router.post('/', validate(rentEntrySchema), createRentEntry);
router.put('/:id', validate(rentEntrySchema), updateRentEntry);
router.delete('/:id', deleteRentEntry);

export default router;
