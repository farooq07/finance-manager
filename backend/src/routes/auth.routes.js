import express from 'express';
import { register, login, getMe, verifyOtp, setupPin, verifyPin } from '../controllers/auth.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.get('/me', verifyToken, getMe);
router.put('/pin', verifyToken, setupPin);
router.post('/verify-pin', verifyToken, verifyPin);

export default router;
