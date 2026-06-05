import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import prisma from '../utils/prisma.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID; // services ID, e.g. com.fswealth.web

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function signJwt(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function shapeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasPin: !!user.app_pin_code,
        must_change_password: user.must_change_password
    };
}

// Find or create a user record from a verified OAuth profile.
// If a password account already exists with the same email, link the provider
// to that account so the user can sign in either way.
async function findOrCreateOAuthUser({ provider, providerId, email, name, avatarUrl }) {
    if (!email) {
        const err = new Error('No email returned by identity provider. Please retry and grant access to your email address.');
        err.status = 400;
        throw err;
    }

    const linkedRows = await prisma.$queryRaw`
        SELECT id FROM users
        WHERE auth_provider = ${provider} AND provider_id = ${providerId}
        LIMIT 1
    `;
    if (linkedRows[0]) {
        return prisma.user.findUnique({ where: { id: linkedRows[0].id } });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        await prisma.$executeRaw`
            UPDATE users
            SET auth_provider = ${provider},
                provider_id   = ${providerId},
                avatar_url    = COALESCE(${avatarUrl}, avatar_url),
                email_verified = true
            WHERE id = ${existing.id}::uuid
        `;
        return prisma.user.findUnique({ where: { id: existing.id } });
    }

    const [created] = await prisma.$queryRaw`
        INSERT INTO users (
            id, name, email, password_hash, email_verified,
            auth_provider, provider_id, avatar_url
        )
        VALUES (
            gen_random_uuid(),
            ${name || email.split('@')[0]},
            ${email},
            NULL,
            true,
            ${provider},
            ${providerId},
            ${avatarUrl || null}
        )
        RETURNING id
    `;
    return prisma.user.findUnique({ where: { id: created.id } });
}

// JWT id_tokens are three base64 segments separated by dots. Access tokens
// are opaque (usually `ya29.…`). We use shape to decide which verifier to call.
function looksLikeJwt(token) {
    return typeof token === 'string' && token.split('.').length === 3;
}

async function verifyGoogleToken(token) {
    if (looksLikeJwt(token)) {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        return {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
        };
    }
    // Treat as OAuth 2.0 access token and look it up via Google's userinfo.
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        const err = new Error('Could not verify Google access token.');
        err.status = 401;
        throw err;
    }
    const profile = await response.json();
    return {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture
    };
}

export const googleAuth = async (req, res) => {
    try {
        if (!googleClient) {
            return res.status(503).json({ message: 'Google sign-in is not configured. Contact your administrator.' });
        }
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'Missing Google credential.' });
        }

        const profile = await verifyGoogleToken(credential);
        if (!profile?.sub) {
            return res.status(401).json({ message: 'Invalid Google token.' });
        }

        const user = await findOrCreateOAuthUser({
            provider: 'google',
            providerId: profile.sub,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.picture
        });

        const token = signJwt(user);
        res.json({
            message: 'Login successful',
            token,
            mustChangePassword: user.must_change_password,
            user: shapeUser(user)
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        const status = error.status || 401;
        res.status(status).json({ message: error.message || 'Google sign-in failed.' });
    }
};

export const appleAuth = async (req, res) => {
    try {
        if (!APPLE_CLIENT_ID) {
            return res.status(503).json({ message: 'Apple sign-in is not configured. Contact your administrator.' });
        }
        const { identityToken, user: appleUser } = req.body;
        if (!identityToken) {
            return res.status(400).json({ message: 'Missing Apple identity token.' });
        }

        const claims = await appleSignin.verifyIdToken(identityToken, {
            audience: APPLE_CLIENT_ID,
            ignoreExpiration: false
        });

        // Apple sends `name` only on the very first sign-in. The frontend caches
        // it from the initial response and re-sends it here.
        const fallbackName = appleUser?.name?.firstName
            ? `${appleUser.name.firstName} ${appleUser.name.lastName || ''}`.trim()
            : null;

        const user = await findOrCreateOAuthUser({
            provider: 'apple',
            providerId: claims.sub,
            email: claims.email,
            name: fallbackName,
            avatarUrl: null
        });

        const token = signJwt(user);
        res.json({
            message: 'Login successful',
            token,
            mustChangePassword: user.must_change_password,
            user: shapeUser(user)
        });
    } catch (error) {
        console.error('Apple Auth Error:', error);
        const status = error.status || 401;
        res.status(status).json({ message: error.message || 'Apple sign-in failed.' });
    }
};
