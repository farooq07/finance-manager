import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { sendOtpEmail, sendVerificationEmail } from '../utils/email.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

export const getAuthConfig = (req, res) => {
    res.json({
        registrationEnabled: process.env.ALLOW_REGISTRATION !== 'false',
        googleEnabled: !!process.env.GOOGLE_CLIENT_ID,
        googleClientId: process.env.GOOGLE_CLIENT_ID || null,
        appleEnabled: !!process.env.APPLE_CLIENT_ID,
        appleClientId: process.env.APPLE_CLIENT_ID || null,
        appleRedirectUri: process.env.APPLE_REDIRECT_URI || null,
    });
};

export const register = async (req, res) => {
    try {
        if (process.env.ALLOW_REGISTRATION === 'false') {
            return res.status(403).json({ message: 'Registration is currently disabled. Please contact your administrator.' });
        }

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            // If the account already exists but is unverified, treat the new
            // signup as a "please resend" request — issue a fresh token,
            // (re)send the verification email, and let the frontend show its
            // confirm-your-email screen instead of an opaque "already exists".
            const verifiedRows = await prisma.$queryRaw`
                SELECT email_verified FROM users WHERE id = ${existingUser.id}::uuid LIMIT 1
            `;
            const alreadyVerified = verifiedRows[0]?.email_verified === true;

            if (alreadyVerified) {
                return res.status(400).json({ message: 'An account with this email already exists. Please sign in instead.' });
            }

            const verificationToken = generateVerificationToken();
            const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

            await prisma.$executeRaw`
                UPDATE users
                SET email_verification_token = ${verificationToken},
                    email_verification_expires = ${verificationExpires}
                WHERE id = ${existingUser.id}::uuid
            `;

            try {
                await sendVerificationEmail(existingUser.email, existingUser.name, verificationToken);
            } catch (emailError) {
                console.error('Failed to resend verification email on duplicate signup:', emailError);
            }

            return res.status(200).json({
                message: 'This email is already registered but not yet verified. We sent a fresh confirmation link to your inbox.',
                email: existingUser.email,
                requiresVerification: true
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

        // Use raw SQL so this works even before `prisma generate` picks up the new fields
        const [user] = await prisma.$queryRaw`
            INSERT INTO users (id, name, email, password_hash, email_verified, email_verification_token, email_verification_expires)
            VALUES (gen_random_uuid(), ${name}, ${email}, ${hashedPassword}, false, ${verificationToken}, ${verificationExpires})
            RETURNING id, name, email
        `;

        try {
            await sendVerificationEmail(user.email, user.name, verificationToken);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }

        res.status(201).json({
            message: 'Account created. Please check your email to confirm your address before logging in.',
            email: user.email,
            requiresVerification: true
        });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Verification token is required' });

        const rows = await prisma.$queryRaw`
            SELECT id, email, email_verified, email_verification_expires
            FROM users WHERE email_verification_token = ${token}
            LIMIT 1
        `;
        const user = rows[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid or already-used verification link' });
        }

        if (user.email_verified) {
            return res.json({ message: 'Email already verified. You can log in.', alreadyVerified: true });
        }

        if (!user.email_verification_expires || new Date() > new Date(user.email_verification_expires)) {
            return res.status(400).json({
                message: 'Verification link has expired. Please request a new one.',
                expired: true,
                email: user.email
            });
        }

        await prisma.$executeRaw`
            UPDATE users
            SET email_verified = true,
                email_verification_token = NULL,
                email_verification_expires = NULL
            WHERE id = ${user.id}::uuid
        `;

        res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ message: 'Server error verifying email' });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const rows = await prisma.$queryRaw`
            SELECT id, name, email_verified FROM users WHERE email = ${email} LIMIT 1
        `;
        const user = rows[0];

        const successMessage = 'If an unverified account exists for that email, a new link has been sent.';
        if (!user || user.email_verified) {
            return res.json({ message: successMessage });
        }

        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

        await prisma.$executeRaw`
            UPDATE users
            SET email_verification_token = ${verificationToken},
                email_verification_expires = ${verificationExpires}
            WHERE id = ${user.id}::uuid
        `;

        try {
            await sendVerificationEmail(email, user.name, verificationToken);
        } catch (emailError) {
            console.error('Failed to resend verification email:', emailError);
        }

        res.json({ message: successMessage });
    } catch (error) {
        console.error('Resend Verification Error:', error);
        res.status(500).json({ message: 'Server error resending verification email' });
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

        // Block login if the account has been deactivated (soft-deleted by an admin)
        const statusRows = await prisma.$queryRaw`
            SELECT email_verified, deleted_at FROM users WHERE id = ${user.id}::uuid LIMIT 1
        `;
        if (statusRows[0]?.deleted_at) {
            return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
        }

        // Block login if email is not verified
        const verifiedRows = statusRows;
        if (verifiedRows[0] && verifiedRows[0].email_verified === false) {
            return res.status(403).json({
                message: 'Please confirm your email address before logging in. Check your inbox for the verification link.',
                requiresVerification: true,
                email: user.email
            });
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

export const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: userId },
            data: { otp_code: otpCode, otp_expires_at: otpExpiresAt }
        });

        try {
            await sendOtpEmail(user.email, otpCode);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
        }

        res.json({ message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Failed to resend OTP' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, name: true, email: true, app_pin_code: true, role: true,
                must_change_password: true, terms_accepted_at: true, privacy_accepted_at: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            hasPin: !!user.app_pin_code,
            must_change_password: user.must_change_password,
            terms_accepted_at: user.terms_accepted_at,
            privacy_accepted_at: user.privacy_accepted_at,
        });
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Server error fetching user profile' });
    }
};

export const acceptLegal = async (req, res) => {
    try {
        const now = new Date();
        await prisma.user.update({
            where: { id: req.user.id },
            data: { terms_accepted_at: now, privacy_accepted_at: now },
        });
        res.json({ terms_accepted_at: now, privacy_accepted_at: now });
    } catch (error) {
        console.error('AcceptLegal Error:', error);
        res.status(500).json({ message: 'Server error recording acceptance' });
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

        // Block if the account was deactivated (soft-deleted) since login started
        const statusRows = await prisma.$queryRaw`
            SELECT deleted_at FROM users WHERE id = ${userId}::uuid LIMIT 1
        `;
        if (statusRows[0]?.deleted_at) {
            return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
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
            mustChangePassword: user.must_change_password,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hasPin: !!user.app_pin_code,
                must_change_password: user.must_change_password
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

export const firstPasswordChange = async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password_hash: hashedPassword, must_change_password: false }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('First Password Change Error:', error);
        res.status(500).json({ message: 'Server error updating password' });
    }
};
