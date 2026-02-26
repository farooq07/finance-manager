import express from 'express';
import multer from 'multer';
import { getPeopleWithLedgers, createPerson, createDuesTransaction, deletePerson, uploadDuesCSV, deleteTransactions, updateTransaction, bulkUpdateType } from '../controllers/dues.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(verifyToken);

router.get('/', getPeopleWithLedgers);
router.post('/', createPerson);
router.post('/:id/transactions', createDuesTransaction);
router.post('/:id/upload-csv', upload.single('duesCSV'), uploadDuesCSV);
router.post('/transactions/delete', deleteTransactions);
router.post('/transactions/bulk-type', bulkUpdateType);
router.put('/transactions/:txId', updateTransaction);
router.delete('/:id', deletePerson);

export default router;
