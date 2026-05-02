import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { sendOtpEmail } from '../utils/email.js';

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: hashedPassword
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ user: { ...user, hasPin: false }, token });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

export const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Email/Username and password are required' });
        }

        // 1. Find user by email OR username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { name: identifier }
                ]
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // 3. Generate 6-digit OTP
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 4. Save OTP to user record
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp_code: otpCode,
                otp_expires_at: otpExpiresAt
            }
        });

        // 5. Send OTP via email
        try {
            await sendOtpEmail(user.email, otpCode);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Optionally decide if you want to fail the login or just continue. 
            // In a real app you might return a 500 here if email is strictly required.
        }

        // 6. Return success (but NOT the token). Tell frontend to proceed to OTP step.
        res.json({
            message: 'OTP sent successfully',
            userId: user.id,
            email: user.email,
            requiresOtp: true
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, app_pin_code: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            hasPin: !!user.app_pin_code
        });
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Server error fetching user profile' });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ message: 'User ID and OTP are required' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP matches and hasn't expired
        if (user.otp_code !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        if (!user.otp_expires_at || new Date() > user.otp_expires_at) {
            return res.status(400).json({ message: 'OTP has expired. Please log in again.' });
        }

        // Success! Clear the OTP fields
        await prisma.user.update({
            where: { id: userId },
            data: {
                otp_code: null,
                otp_expires_at: null
            }
        });

        // 5. Generate and send JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                hasPin: !!user.app_pin_code
            }
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Server error verifying OTP' });
    }
};

export const setupPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || pin.length < 4) {
            return res.status(400).json({ message: 'PIN must be at least 4 characters long' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { app_pin_code: hashedPin }
        });

        res.json({ message: 'PIN configured successfully' });
    } catch (error) {
        console.error('Setup PIN Error:', error);
        res.status(500).json({ message: 'Server error configuring PIN' });
    }
};

export const verifyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin) {
            return res.status(400).json({ message: 'PIN is required' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !user.app_pin_code) {
            return res.status(400).json({ message: 'No PIN configured for this account' });
        }

        const isMatch = await bcrypt.compare(pin, user.app_pin_code);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid PIN code' });
        }

        res.json({ message: 'PIN verified successfully', success: true });
    } catch (error) {
        console.error('Verify PIN Error:', error);
        res.status(500).json({ message: 'Server error verifying PIN' });
    }
};

export const changePin = async (req, res) => {
    try {
        const { currentPin, newPin } = req.body;
        if (!currentPin || !newPin) {
            return res.status(400).json({ message: 'Current PIN and new PIN are required' });
        }
        if (newPin.length < 4) {
            return res.status(400).json({ message: 'New PIN must be at least 4 digits' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !user.app_pin_code) {
            return res.status(400).json({ message: 'No PIN configured for this account' });
        }

        const isMatch = await bcrypt.compare(currentPin, user.app_pin_code);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current PIN is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(newPin, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { app_pin_code: hashedPin }
        });

        res.json({ message: 'PIN changed successfully' });
    } catch (error) {
        console.error('Change PIN Error:', error);
        res.status(500).json({ message: 'Server error changing PIN' });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return res.json({ message: 'If an account with that email exists, an OTP will be sent.' });
        }

        // Generate 6-digit OTP
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp_code: otpCode,
                otp_expires_at: otpExpiresAt
            }
        });

        try {
            await sendOtpEmail(user.email, otpCode);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
        }

        res.json({ message: 'If an account with that email exists, an OTP will be sent.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error during forgot password' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid OTP or email' });
        }

        if (user.otp_code !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        if (!user.otp_expires_at || new Date() > user.otp_expires_at) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                otp_code: null,
                otp_expires_at: null
            }
        });

        res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};
