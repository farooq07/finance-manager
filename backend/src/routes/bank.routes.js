import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import verifyToken from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';
import validate, { bankSchema } from '../middleware/validate.js';
import {
    createBank,
    getBanks,
    getBankById,
    updateBank,
    updateBankBalance,
    deleteBank,
    uploadStatement,
    previewStatement,
    commitStatement,
    syncStatementBalance,
    getAllTransactions,
    getStatementTransactions,
    approveTransaction,
    updateTransactionCategory,
    deleteTransaction,
    bulkApproveTransactions,
    deleteStatement,
    getCategorySummary
} from '../controllers/bank.controller.js';

// Multer config for PDF uploads
const STATEMENTS_DIR = 'uploads/statements/';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the upload dir exists — multer errors with a 500 otherwise.
        fs.mkdirSync(STATEMENTS_DIR, { recursive: true });
        cb(null, STATEMENTS_DIR);
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

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.post('/', validate(bankSchema), createBank);
router.get('/', getBanks);
router.get('/:id', getBankById);
router.put('/:id', validate(bankSchema), updateBank);
router.put('/:id/balance', updateBankBalance);
router.delete('/:id', deleteBank);

// Bank Statement routes with logging
router.post('/:bankId/statements/upload', (req, res, next) => {
    logger.log('[ROUTE] Statement upload - before multer:', {
        bankId: req.params.bankId,
        path: req.path
    });
    next();
}, upload.single('file'), (req, res, next) => {
    logger.log('[ROUTE] Statement upload - after multer:', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
    });
    next();
}, uploadStatement);

// Two-step mapping flow: preview (inspect columns) → commit (parse with mapping)
router.post('/:bankId/statements/preview', upload.single('file'), previewStatement);
router.post('/:bankId/statements/commit', commitStatement);

router.get('/:bankId/transactions', getAllTransactions);
router.get('/:bankId/category-summary', getCategorySummary);
router.get('/:bankId/statements/:statementId/transactions', getStatementTransactions);

// Statement-independent transaction ops — look up by txId + bankId, so callers
// rendering the combined all-transactions list don't need a statementId.
router.post('/:bankId/transactions/:txId/approve', approveTransaction);
router.put('/:bankId/transactions/:txId', updateTransactionCategory);
router.delete('/:bankId/transactions/:txId', deleteTransaction);

// Legacy statement-scoped variants (kept for backward compatibility)
router.post('/:bankId/statements/:statementId/transactions/:txId/approve', approveTransaction);
router.put('/:bankId/statements/:statementId/transactions/:txId', updateTransactionCategory);
router.delete('/:bankId/statements/:statementId/transactions/:txId', deleteTransaction);
router.post('/:bankId/bulk-approve', bulkApproveTransactions);
router.post('/:bankId/statements/:statementId/sync', syncStatementBalance);
router.delete('/:bankId/statements/:statementId', deleteStatement);

export default router;
