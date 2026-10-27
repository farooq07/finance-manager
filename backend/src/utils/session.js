import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

/**
 * Error codes every client can act on. Only SESSION_* means "sign the user
 * out"; everything else is a refused action on a still-valid session.
 */
export const AUTH_CODES = Object.freeze({
    SESSION_MISSING: 'SESSION_MISSING',   // 401 — no token sent
    SESSION_EXPIRED: 'SESSION_EXPIRED',   // 401 — token invalid or expired
    SESSION_REVOKED: 'SESSION_REVOKED',   // 401 — signed out everywhere / password changed / deactivated
    FORBIDDEN: 'FORBIDDEN',               // 403 — signed in, but not allowed
    WRONG_PIN: 'WRONG_PIN',               // 401 — PIN check failed; session still valid
    REAUTH_REQUIRED: 'REAUTH_REQUIRED',   // 403 — sign in again (password + code) to do this
    VAULT_LOCKED: 'VAULT_LOCKED',         // 403 — unlock the Gold Vault first
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',     // 429 — too many failed attempts
    VALIDATION: 'VALIDATION',             // 400
});

export const SESSION_TTL = '7d';
export const MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
// A credential may be replaced without the old one only right after a full
// sign-in (password + emailed code) — that sign-in is the re-authentication.
export const FRESH_LOGIN_MS = 10 * 60 * 1000;

export const PASSWORD_MIN = 8;
// The web and mobile apps share one app PIN — always 6 digits.
export const PIN_PATTERN = /^\d{6}$/;

/** Problem with a new password, or null when it is acceptable. */
export function passwordProblem(password) {
    if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
        return `Password must be at least ${PASSWORD_MIN} characters long`;
    }
    if (password.length > 128) return 'Password must be at most 128 characters long';
    return null;
}

/** Problem with a new app PIN, or null when it is acceptable. */
export function pinProblem(pin) {
    return PIN_PATTERN.test(String(pin ?? '')) ? null : 'PIN must be exactly 6 digits';
}

/** A session token tied to the user's current token_version. */
export function signSessionToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, tv: user.token_version ?? 0 },
        process.env.JWT_SECRET,
        { expiresIn: SESSION_TTL },
    );
}

/** True when the request's token was issued by a sign-in in the last few minutes. */
export function isFreshLogin(req, now = Date.now()) {
    const iat = req.auth?.iat;
    return typeof iat === 'number' && now - iat * 1000 <= FRESH_LOGIN_MS;
}

/**
 * Invalidate every token the user holds. Returns the updated user so the
 * caller can hand the current device a new token if it should stay signed in.
 */
export function revokeSessions(userId, db = prisma) {
    return db.user.update({
        where: { id: userId },
        data: { token_version: { increment: 1 } },
        select: { id: true, email: true, token_version: true },
    });
}

/** One-time codes are stored hashed; compare in constant time. */
export const hashOtp = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

export function otpMatches(stored, supplied) {
    if (!stored || !supplied) return false;
    const a = Buffer.from(stored);
    const b = Buffer.from(hashOtp(supplied));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const authError = (res, status, code, message, extra = {}) =>
    res.status(status).json({ message, code, ...extra });
