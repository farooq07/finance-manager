import express from 'express';
import { getWallets, createWallet, updateWalletBalance, deleteWallet } from '../controllers/wallet.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { walletSchema } from '../middleware/validate.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getWallets);
router.post('/', validate(walletSchema), createWallet);
router.put('/:id', updateWalletBalance); // Not validating full schema since it's just a balance patch
router.delete('/:id', deleteWallet);

export default router;
