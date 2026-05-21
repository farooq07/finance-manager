import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { list, detail, create, update, remove, addPayment } from '../controllers/debt.controller.js';

const router = express.Router();
router.use(verifyToken);

router.get('/',             list);
router.get('/:id',          detail);
router.post('/',            create);
router.patch('/:id',        update);
router.delete('/:id',       remove);
router.post('/:id/payments', addPayment);

export default router;
