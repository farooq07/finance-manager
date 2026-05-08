import express from 'express';
import multer from 'multer';
import path from 'path';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { bankSchema } from '../middleware/validate.js';
import {
    createBank,
    getBanks,
    getBankById,
    updateBank,
    updateBankBalance,
    deleteBank,
    uploadStatement,
    getAllTransactions,
    getStatementTransactions,
    approveTransaction,
    updateTransactionCategory,
    deleteTransaction,
    bulkApproveTransactions,
    deleteStatement
} from '../controllers/bank.controller.js';

// Multer config for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/statements/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
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
    console.log('[ROUTE] Statement upload - before multer:', {
        bankId: req.params.bankId,
        path: req.path
    });
    next();
}, upload.single('file'), (req, res, next) => {
    console.log('[ROUTE] Statement upload - after multer:', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
    });
    next();
}, uploadStatement);
router.get('/:bankId/transactions', getAllTransactions);
router.get('/:bankId/statements/:statementId/transactions', getStatementTransactions);
router.post('/:bankId/statements/:statementId/transactions/:txId/approve', approveTransaction);
router.put('/:bankId/statements/:statementId/transactions/:txId', updateTransactionCategory);
router.delete('/:bankId/statements/:statementId/transactions/:txId', deleteTransaction);
router.post('/:bankId/bulk-approve', bulkApproveTransactions);
router.delete('/:bankId/statements/:statementId', deleteStatement);

export default router;
