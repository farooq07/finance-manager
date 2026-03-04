import express from 'express';
import multer from 'multer';
import path from 'path';
import { getMutualFunds, createMutualFund, uploadPortfolioCSV, deleteMutualFund, bulkDeleteMutualFunds, getPortfolioSnapshots, syncPortfolioData } from '../controllers/mutualFund.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { mutualFundSchema, bulkDeleteSchema } from '../middleware/validate.js';

const router = express.Router();
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

router.use(verifyToken);

router.get('/', getMutualFunds);
router.get('/snapshots', getPortfolioSnapshots);
router.post('/', validate(mutualFundSchema), createMutualFund);
router.post('/upload', upload.single('portfolioCSV'), uploadPortfolioCSV);
router.post('/sync-data', syncPortfolioData);
router.post('/bulk-delete', validate(bulkDeleteSchema), bulkDeleteMutualFunds);
router.delete('/:id', deleteMutualFund);

export default router;
