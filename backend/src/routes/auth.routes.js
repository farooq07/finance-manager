import express from 'express';
import { register, login, getMe, verifyOtp, resendOtp, setupPin, verifyPin, changePin, forgotPassword, resetPassword, firstPasswordChange, getAuthConfig, verifyEmail, resendVerification, acceptLegal, revokeAllSessions } from '../controllers/auth.controller.js';
import { googleAuth, appleAuth } from '../controllers/oauth.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/config', getAuthConfig);
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/apple', appleAuth);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', verifyToken, getMe);
router.put('/pin', verifyToken, setupPin);
router.put('/pin/change', verifyToken, changePin);
router.post('/verify-pin', verifyToken, verifyPin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/first-password', verifyToken, firstPasswordChange);
router.post('/accept-legal', verifyToken, acceptLegal);
router.post('/sessions/revoke-all', verifyToken, revokeAllSessions);

export default router;
