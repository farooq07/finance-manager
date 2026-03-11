import express from 'express';
import { register, login, getMe, verifyOtp, setupPin, verifyPin, changePin, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.get('/me', verifyToken, getMe);
router.put('/pin', verifyToken, setupPin);
router.put('/pin/change', verifyToken, changePin);
router.post('/verify-pin', verifyToken, verifyPin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
