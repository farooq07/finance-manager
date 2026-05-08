import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import {
    getBeneficiaries,
    getBeneficiaryById,
    createBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    addAccount,
    deleteAccount,
    rescanBeneficiary
} from '../controllers/beneficiary.controller.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', getBeneficiaries);
router.post('/', createBeneficiary);
router.get('/:id', getBeneficiaryById);
router.put('/:id', updateBeneficiary);
router.delete('/:id', deleteBeneficiary);

router.post('/:id/accounts', addAccount);
router.delete('/:id/accounts/:accountId', deleteAccount);
router.post('/:id/rescan', rescanBeneficiary);

export default router;
