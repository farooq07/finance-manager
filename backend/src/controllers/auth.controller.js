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
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({ user, token });

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
        // const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpCode = '123456'; // HARDCODED for testing purposes
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
            select: { id: true, name: true, email: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email
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

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Server error during OTP verification' });
    }
};
