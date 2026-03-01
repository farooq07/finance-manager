import express from 'express';
import { getInstitutions, createInstitution, deleteInstitution, seedInstitutions } from '../controllers/institution.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.route('/')
    .get(getInstitutions)
    .post(createInstitution);

router.post('/seed', seedInstitutions);

router.route('/:id')
    .delete(deleteInstitution);

export default router;
