import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { AUTH_CODES, authError } from '../utils/session.js';

export const VAULT_TOKEN_TTL_SECONDS = 15 * 60;
const SCOPE = 'gold_vault';

/** A short-lived token proving the Gold Vault PIN was just entered. */
export function signVaultToken(userId, tokenVersion) {
    return jwt.sign({ id: userId, scope: SCOPE, tv: tokenVersion ?? 0 }, process.env.JWT_SECRET, {
        expiresIn: VAULT_TOKEN_TTL_SECONDS,
    });
}

/**
 * Gold item data needs the vault unlocked: once a Gold PIN exists, requests
 * must carry an X-Vault-Token from POST /gold/verify-pin (valid 15 minutes,
 * for this user and this session only). A user without a Gold PIN has no
 * vault to unlock.
 * Runs after verifyToken.
 */
export async function requireVaultAccess(req, res, next) {
    try {
        const pin = await prisma.goldPin.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!pin) return next();

        const token = req.headers['x-vault-token'];
        if (!token) return authError(res, 403, AUTH_CODES.VAULT_LOCKED, 'Unlock the Gold Vault with its PIN first.');

        let claims;
        try {
            claims = jwt.verify(String(token), process.env.JWT_SECRET);
        } catch {
            return authError(res, 403, AUTH_CODES.VAULT_LOCKED, 'The Gold Vault has locked again. Enter its PIN.');
        }
        const sameSession = (claims.tv ?? 0) === (req.auth?.tokenVersion ?? 0);
        if (claims.scope !== SCOPE || claims.id !== req.user.id || !sameSession) {
            return authError(res, 403, AUTH_CODES.VAULT_LOCKED, 'Unlock the Gold Vault with its PIN first.');
        }
        next();
    } catch (error) {
        console.error('[GOLD] vault check failed:', error.message);
        res.status(503).json({ message: 'Could not check the Gold Vault. Please try again.' });
    }
}
