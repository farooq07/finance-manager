import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { sendOtpEmail, sendVerificationEmail } from '../utils/email.js';
import {
    AUTH_CODES, MAX_FAILED_ATTEMPTS, LOGIN_LOCK_MINUTES, authError, hashOtp, otpMatches,
    isFreshLogin, passwordProblem, pinProblem, revokeSessions, signSessionToken,
} from '../utils/session.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

// One-time codes ----------------------------------------------------------------
const OTP_TTL_MS = 10 * 60 * 1000;
const CLEAR_OTP = { otp_code: null, otp_expires_at: null, otp_purpose: null, otp_attempts: 0 };

const newOtp = (code, purpose) => ({
    otp_code: hashOtp(code),
    otp_expires_at: new Date(Date.now() + OTP_TTL_MS),
    otp_purpose: purpose,
    otp_attempts: 0,
});

/**
 * Check a one-time code for `purpose`. Wrong codes count against the code;
 * after MAX_FAILED_ATTEMPTS it is voided and a new one must be requested.
 */
async function checkOtp(user, supplied, purpose) {
    if (!user.otp_code || user.otp_purpose !== purpose) {
        return { ok: false, message: purpose === 'login' ? 'Please sign in again.' : 'Invalid OTP code' };
    }
    if (!user.otp_expires_at || new Date() > user.otp_expires_at) {
        return { ok: false, message: purpose === 'login' ? 'OTP has expired. Please log in again.' : 'OTP has expired. Please request a new one.' };
    }
    if (!otpMatches(user.otp_code, supplied)) {
        const attempts = user.otp_attempts + 1;
        const voided = attempts >= MAX_FAILED_ATTEMPTS;
        await prisma.user.update({
            where: { id: user.id },
            data: voided ? CLEAR_OTP : { otp_attempts: attempts },
        });
        return { ok: false, message: voided ? 'Too many wrong codes. Please request a new one.' : 'Invalid OTP code' };
    }
    return { ok: true };
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
        const problem = passwordProblem(password);
        if (problem) return authError(res, 400, AUTH_CODES.VALIDATION, problem);

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

        if (!user || !user.password_hash) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Too many wrong passwords → locked for a while, per account.
        if (user.locked_until && user.locked_until > new Date()) {
            return authError(res, 429, AUTH_CODES.ACCOUNT_LOCKED,
                'Too many failed sign-in attempts. Try again in a few minutes or reset your password.');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const attempts = user.failed_login_attempts + 1;
            const lock = attempts >= MAX_FAILED_ATTEMPTS;
            await prisma.user.update({
                where: { id: user.id },
                data: lock
                    ? { failed_login_attempts: 0, locked_until: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000) }
                    : { failed_login_attempts: attempts },
            });
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Block login if the account has been deactivated (soft-deleted by an admin)
        if (user.deleted_at) {
            return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
        }

        // Block login if email is not verified
        if (user.email_verified === false) {
            return res.status(403).json({
                message: 'Please confirm your email address before logging in. Check your inbox for the verification link.',
                requiresVerification: true,
                email: user.email
            });
        }

        // 3. Generate 6-digit OTP
        const otpCode = crypto.randomInt(100000, 999999).toString();

        // 4. Save the code (hashed) for the login step only
        await prisma.user.update({
            where: { id: user.id },
            data: { ...newOtp(otpCode, 'login'), failed_login_attempts: 0, locked_until: null },
        });

        // 5. Send OTP via email
        try {
            await sendOtpEmail(user.email, otpCode);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
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
        // Only resend a login code that is already in progress.
        if (!user || user.otp_purpose !== 'login' || user.deleted_at) {
            return res.status(400).json({ message: 'Please sign in again.' });
        }

        const otpCode = crypto.randomInt(100000, 999999).toString();
        await prisma.user.update({ where: { id: userId }, data: newOtp(otpCode, 'login') });

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
                onboarded_at: true, interests: true,
                notify_weekly_summary: true, notify_bill_reminders: true,
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
            onboarded_at: user.onboarded_at,
            interests: user.interests,
            notifications: { weeklySummary: user.notify_weekly_summary, billReminders: user.notify_bill_reminders },
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
        if (user.deleted_at) {
            return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
        }

        const check = await checkOtp(user, otp, 'login');
        if (!check.ok) return res.status(400).json({ message: check.message });

        // Success: the code is used up.
        const updated = await prisma.user.update({
            where: { id: userId },
            data: CLEAR_OTP,
        });

        const token = signSessionToken(updated);

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
        const problem = pinProblem(pin);
        if (problem) return authError(res, 400, AUTH_CODES.VALIDATION, problem);

        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { app_pin_code: true } });
        // Replacing an existing PIN without knowing it needs a fresh sign-in
        // (password + emailed code) — that is the "forgot PIN" path.
        if (user?.app_pin_code && !isFreshLogin(req)) {
            return authError(res, 403, AUTH_CODES.REAUTH_REQUIRED,
                'You already have a PIN. Change it with your current PIN, or sign in again to reset it.');
        }

        const hashedPin = await bcrypt.hash(String(pin), 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { app_pin_code: hashedPin, pin_failed_attempts: 0 }
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

        const isMatch = await bcrypt.compare(String(pin), user.app_pin_code);
        if (!isMatch) {
            const attempts = user.pin_failed_attempts + 1;
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                // Too many wrong PINs: sign out every session on the server too.
                await prisma.user.update({
                    where: { id: user.id },
                    data: { pin_failed_attempts: 0, token_version: { increment: 1 } },
                });
                return authError(res, 401, AUTH_CODES.SESSION_REVOKED, 'Too many wrong PINs. Please sign in again.');
            }
            await prisma.user.update({ where: { id: user.id }, data: { pin_failed_attempts: attempts } });
            return authError(res, 401, AUTH_CODES.WRONG_PIN, 'Invalid PIN code', {
                attemptsLeft: MAX_FAILED_ATTEMPTS - attempts,
            });
        }

        if (user.pin_failed_attempts) {
            await prisma.user.update({ where: { id: user.id }, data: { pin_failed_attempts: 0 } });
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
        const problem = pinProblem(newPin);
        if (problem) return authError(res, 400, AUTH_CODES.VALIDATION, problem);

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !user.app_pin_code) {
            return res.status(400).json({ message: 'No PIN configured for this account' });
        }

        const isMatch = await bcrypt.compare(String(currentPin), user.app_pin_code);
        if (!isMatch) {
            return authError(res, 401, AUTH_CODES.WRONG_PIN, 'Current PIN is incorrect');
        }

        const hashedPin = await bcrypt.hash(String(newPin), 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { app_pin_code: hashedPin, pin_failed_attempts: 0 }
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
        if (!user || user.deleted_at) {
            // Return success even if user not found to prevent email enumeration
            return res.json({ message: 'If an account with that email exists, an OTP will be sent.' });
        }

        // A recovery code — it cannot be used to sign in.
        const otpCode = crypto.randomInt(100000, 999999).toString();
        await prisma.user.update({ where: { id: user.id }, data: newOtp(otpCode, 'reset') });

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
        const problem = passwordProblem(newPassword);
        if (problem) return authError(res, 400, AUTH_CODES.VALIDATION, problem);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deleted_at) {
            return res.status(400).json({ message: 'Invalid OTP or email' });
        }

        const check = await checkOtp(user, otp, 'reset');
        if (!check.ok) return res.status(400).json({ message: check.message });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // New password → every existing session is signed out (OWASP recovery guidance).
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                ...CLEAR_OTP,
                failed_login_attempts: 0,
                locked_until: null,
                token_version: { increment: 1 },
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

        const problem = passwordProblem(newPassword);
        if (problem) return authError(res, 400, AUTH_CODES.VALIDATION, problem);

        // Only for accounts created with a temporary password — otherwise this
        // would let anyone holding a session set a password without the old one.
        const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { must_change_password: true } });
        if (!current?.must_change_password) {
            return authError(res, 403, AUTH_CODES.FORBIDDEN, 'Your password has already been set.');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Sign out any other session that used the temporary password; this
        // device gets a fresh token.
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: { password_hash: hashedPassword, must_change_password: false, token_version: { increment: 1 } },
            select: { id: true, email: true, token_version: true },
        });

        res.json({ message: 'Password updated successfully', token: signSessionToken(updated) });
    } catch (error) {
        console.error('First Password Change Error:', error);
        res.status(500).json({ message: 'Server error updating password' });
    }
};

// POST /api/auth/sessions/revoke-all — sign out everywhere. This device gets
// a fresh token so it stays signed in.
export const revokeAllSessions = async (req, res) => {
    try {
        const updated = await revokeSessions(req.user.id);
        res.json({ message: 'Signed out of every other device', token: signSessionToken(updated) });
    } catch (error) {
        console.error('Revoke sessions error:', error);
        res.status(500).json({ message: 'Could not sign out other devices' });
    }
};
