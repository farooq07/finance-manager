import express from 'express';
import multer from 'multer';
import path from 'path';
import logger from '../utils/logger.js';
import { getWallets, createWallet, updateWalletBalance, deleteWallet, uploadStatement, previewStatement, commitStatement, syncStatementBalance, getStatementTransactions, approveTransaction, deleteStatement, getAllTransactions, updateTransactionCategory, deleteTransaction, bulkApproveTransactions } from '../controllers/wallet.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { walletSchema } from '../middleware/validate.js';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/wallet-statements/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['application/pdf', 'text/csv', 'application/csv', 'application/vnd.ms-excel'];
    const isCsvByName = file.originalname?.toLowerCase().endsWith('.csv');
    if (allowed.includes(file.mimetype) || isCsvByName) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF or CSV files are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.use(verifyToken);

router.get('/', getWallets);
router.post('/', validate(walletSchema), createWallet);
router.put('/:id', updateWalletBalance);
router.delete('/:id', deleteWallet);

// Wallet Statement routes
router.post('/:walletId/statements/upload', (req, res, next) => {
    logger.log('[ROUTE] Wallet statement upload - before multer:', {
        walletId: req.params.walletId,
        path: req.path
    });
    next();
}, upload.single('file'), (req, res, next) => {
    logger.log('[ROUTE] Wallet statement upload - after multer:', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
    });
    next();
}, uploadStatement);

// Two-step mapping flow: preview (inspect) → commit (parse with mapping/review)
router.post('/:walletId/statements/preview', upload.single('file'), previewStatement);
router.post('/:walletId/statements/commit', commitStatement);

router.get('/:walletId/transactions', getAllTransactions);
router.get('/:walletId/statements/:statementId/transactions', getStatementTransactions);
router.post('/:walletId/statements/:statementId/transactions/:txId/approve', approveTransaction);
router.put('/:walletId/statements/:statementId/transactions/:txId', updateTransactionCategory);
router.delete('/:walletId/statements/:statementId/transactions/:txId', deleteTransaction);
router.post('/:walletId/bulk-approve', bulkApproveTransactions);
router.post('/:walletId/statements/:statementId/sync', syncStatementBalance);
router.delete('/:walletId/statements/:statementId', deleteStatement);

export default router;
