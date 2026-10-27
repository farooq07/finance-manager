import express from 'express';
import { getBrokerAccounts, createBrokerAccount, deleteBrokerAccount, revealBrokerPin } from '../controllers/broker.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getBrokerAccounts);
router.post('/', createBrokerAccount);
router.post('/:id/reveal-pin', revealBrokerPin);
router.delete('/:id', deleteBrokerAccount);

export default router;
