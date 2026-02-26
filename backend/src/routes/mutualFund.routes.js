import express from 'express';
import multer from 'multer';
import { getMutualFunds, createMutualFund, uploadPortfolioCSV, deleteMutualFund } from '../controllers/mutualFund.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(verifyToken);

router.get('/', getMutualFunds);
router.post('/', createMutualFund);
router.post('/upload', upload.single('portfolioCSV'), uploadPortfolioCSV);
router.delete('/:id', deleteMutualFund);

export default router;
