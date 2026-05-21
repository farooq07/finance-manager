import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { list, upcoming, create, update, remove, markPaid } from '../controllers/recurring.controller.js';

const router = express.Router();
router.use(verifyToken);

router.get('/',         list);
router.get('/upcoming', upcoming);
router.post('/',        create);
router.patch('/:id',    update);
router.delete('/:id',   remove);
router.post('/:id/paid', markPaid);

export default router;
