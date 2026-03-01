import express from 'express';
import {
    getBankInvestments,
    addBankInvestment,
    deleteBankInvestment,
    getPsxSnapshots,
    uploadPsxSnapshot,
    updatePsxSummary
} from '../controllers/psx.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { psxSnapshotSchema, bankInvestmentSchema } from '../middleware/validate.js';

const router = express.Router();

router.use(verifyToken);

// Bank Investments
router.get('/investments', getBankInvestments);
router.post('/investments', validate(bankInvestmentSchema), addBankInvestment);
router.delete('/investments/:id', deleteBankInvestment);

// PSX Snapshots
router.get('/snapshots', getPsxSnapshots);
router.post('/snapshots', validate(psxSnapshotSchema), uploadPsxSnapshot);
router.put('/snapshots/:id/summary', updatePsxSummary);

export default router;
