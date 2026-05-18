import crypto from 'crypto';

/**
 * AES-256-GCM encryption for at-rest secrets like statement PDF passwords.
 *
 * Storage format (single string):
 *   v1:<base64 iv>:<base64 authTag>:<base64 ciphertext>
 *
 * The `v1:` prefix lets us roll the algorithm later without breaking decrypt
 * for existing rows. Older rows that look like raw base64 (legacy encoding)
 * are detected and decoded transparently so we don't break previous uploads.
 */

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;        // 96-bit IV is the recommended size for GCM
const KEY_LEN = 32;       // 256-bit key
const VERSION = 'v1';

function getKey() {
    const raw = process.env.STATEMENT_ENCRYPTION_KEY;
    if (!raw) {
        // Dev fallback derived from JWT_SECRET so the app keeps working.
        // Production MUST set STATEMENT_ENCRYPTION_KEY (64 hex chars).
        const seed = process.env.JWT_SECRET || 'dev-fallback-key';
        return crypto.createHash('sha256').update(seed).digest();
    }
    // Accept either a 64-char hex string or a 32-char raw string
    const buf = /^[0-9a-fA-F]{64}$/.test(raw)
        ? Buffer.from(raw, 'hex')
        : Buffer.from(raw, 'utf8');
    if (buf.length < KEY_LEN) {
        // Hash up to 256 bits if the supplied key is short
        return crypto.createHash('sha256').update(buf).digest();
    }
    return buf.subarray(0, KEY_LEN);
}

/**
 * Encrypt a plaintext string. Returns a single self-describing token.
 * @param {string} plaintext
 * @returns {string|null}
 */
export function encryptSecret(plaintext) {
    if (plaintext == null || plaintext === '') return null;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(String(plaintext), 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
        VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        ciphertext.toString('base64'),
    ].join(':');
}

/**
 * Decrypt a token produced by encryptSecret. Falls back to legacy base64
 * decoding for rows written before AES was added.
 * @param {string} token
 * @returns {string|null}
 */
export function decryptSecret(token) {
    if (!token) return null;
    if (typeof token !== 'string') return null;

    // Legacy plain base64 (older uploads before this util existed)
    if (!token.startsWith(`${VERSION}:`)) {
        try {
            return Buffer.from(token, 'base64').toString('utf8');
        } catch {
            return null;
        }
    }

    const parts = token.split(':');
    if (parts.length !== 4) return null;
    const [, ivB64, tagB64, ctB64] = parts;
    try {
        const key = getKey();
        const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
        const plain = Buffer.concat([
            decipher.update(Buffer.from(ctB64, 'base64')),
            decipher.final(),
        ]);
        return plain.toString('utf8');
    } catch (err) {
        console.error('decryptSecret failed — bad key, tampered ciphertext, or truncated row');
        return null;
    }
}
