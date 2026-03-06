import express from 'express';
import { getAssets, createAsset, deleteAsset } from '../controllers/asset.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAssets);
router.post('/', createAsset);
router.delete('/:id', deleteAsset);

export default router;
