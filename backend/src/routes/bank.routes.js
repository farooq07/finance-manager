import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { bankSchema } from '../middleware/validate.js';
import {
    createBank,
    getBanks,
    getBankById,
    updateBank,
    updateBankBalance,
    deleteBank
} from '../controllers/bank.controller.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.post('/', validate(bankSchema), createBank);
router.get('/', getBanks);
router.get('/:id', getBankById);
router.put('/:id', validate(bankSchema), updateBank);
router.put('/:id/balance', updateBankBalance);
router.delete('/:id', deleteBank);

export default router;
