import fs from 'fs';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

/**
 * Statement files between "preview" and "import". The upload id handed to
 * the client is a session id, not a filename: commit resolves it only for
 * the same user and account, before it expires, and only once.
 */
export const UPLOAD_TTL_MS = 60 * 60 * 1000; // 1 hour to review and import

export async function openUploadSession({ userId, kind, accountId, filePath, now = new Date() }) {
    const session = await prisma.uploadSession.create({
        data: { user_id: userId, kind, account_id: accountId, file_path: filePath, expires_at: new Date(now.getTime() + UPLOAD_TTL_MS) },
        select: { id: true },
    });
    return session.id;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The file for `uploadId`, or { status, message } when it can't be used.
 */
export async function resolveUploadSession({ uploadId, userId, kind, accountId, now = new Date() }) {
    const gone = { status: 400, message: 'Upload not found or expired. Please re-upload the file.' };
    if (!UUID.test(String(uploadId || ''))) return gone;
    const session = await prisma.uploadSession.findFirst({
        where: { id: uploadId, user_id: userId, kind, account_id: accountId },
    });
    if (!session || session.expires_at <= now || !fs.existsSync(session.file_path)) return gone;
    if (session.committed_at) return { status: 409, message: 'This upload was already imported.' };
    return { session, filePath: session.file_path };
}

/** Mark the session imported. False if another request already did. */
export async function claimUploadSession(id, now = new Date()) {
    const r = await prisma.uploadSession.updateMany({ where: { id, committed_at: null }, data: { committed_at: now } });
    return r.count === 1;
}

/** The import failed after claiming: let the user try again. */
export async function releaseUploadSession(id) {
    await prisma.uploadSession.updateMany({ where: { id }, data: { committed_at: null } }).catch(() => {});
}

/**
 * Delete files uploaded for preview but never imported, once expired.
 * Imported files stay — their statement still points at them.
 */
export async function cleanupAbandonedUploads(now = new Date()) {
    const stale = await prisma.uploadSession.findMany({
        where: { expires_at: { lt: now } },
        select: { id: true, file_path: true, committed_at: true },
    });
    let removed = 0;
    for (const s of stale) {
        if (!s.committed_at && s.file_path && fs.existsSync(s.file_path)) {
            try { fs.unlinkSync(s.file_path); removed++; } catch (e) { logger.error('[UPLOADS] could not delete', s.file_path, e.message); }
        }
    }
    if (stale.length) await prisma.uploadSession.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    logger.log(`[UPLOADS] cleaned ${removed} abandoned file(s), ${stale.length} session(s)`);
    return { removed, sessions: stale.length };
}
