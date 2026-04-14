import express from 'express';
import multer from 'multer';
import prisma from '../utils/prisma.js';
import { getPeopleWithLedgers, createPerson, createDuesTransaction, deletePerson, uploadDuesCSV, deleteTransactions, updateTransaction, bulkUpdateType, updatePerson, sendReminderEmailHandler } from '../controllers/dues.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { duesTransactionSchema } from '../middleware/validate.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(verifyToken);

// Debug endpoint to check current user and their data
router.get('/debug/user-info', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true }
        });

        const peopleCount = await prisma.person.count({
            where: { user_id: req.user.id }
        });

        const transactionCount = await prisma.duesTransaction.count({
            where: { user_id: req.user.id }
        });

        res.json({
            user,
            peopleCount,
            transactionCount,
            message: `User has ${peopleCount} people and ${transactionCount} due transactions`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', getPeopleWithLedgers);
router.post('/', createPerson);

// Static paths first
router.post('/transactions/delete', deleteTransactions);
router.post('/transactions/bulk-type', bulkUpdateType);
router.put('/transactions/:txId', updateTransaction);

// Parametric paths second
router.put('/:id', updatePerson);
router.post('/:id/reminder', sendReminderEmailHandler);
router.post('/:id/transactions', validate(duesTransactionSchema), createDuesTransaction);
router.post('/:id/upload-csv', upload.single('duesCSV'), uploadDuesCSV);
router.delete('/:id', deletePerson);

export default router;
