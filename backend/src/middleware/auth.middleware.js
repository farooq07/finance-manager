import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { AUTH_CODES, authError } from '../utils/session.js';

/**
 * Authenticates the request. Every failure here is a 401 with a SESSION_*
 * code — the only responses on which clients sign the user out. A token is
 * refused when it is invalid/expired, when the account is deactivated, or
 * when its token_version is stale (password changed, signed out everywhere).
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return authError(res, 401, AUTH_CODES.SESSION_MISSING, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return authError(res, 401, AUTH_CODES.SESSION_EXPIRED, 'Invalid or expired token.');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, role: true, deleted_at: true, token_version: true },
        });

        if (!user) {
            return authError(res, 401, AUTH_CODES.SESSION_REVOKED, 'User not found.');
        }
        if (user.deleted_at) {
            return authError(res, 401, AUTH_CODES.SESSION_REVOKED, 'This account has been deactivated.');
        }
        // Tokens issued before versioning carry no `tv`; they stay valid only
        // until the first revocation.
        if ((decoded.tv ?? 0) !== user.token_version) {
            return authError(res, 401, AUTH_CODES.SESSION_REVOKED, 'This session has been signed out. Please sign in again.');
        }

        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
        req.auth = { iat: decoded.iat, tokenVersion: user.token_version };
        next();
    } catch (error) {
        console.error('[AUTH] session check failed:', error.message);
        return res.status(503).json({ message: 'Could not check your session. Please try again.' });
    }
};

export default verifyToken;
