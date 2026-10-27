import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';
import { INTEREST_KEYS } from '../constants/interests.js';
import { AUTH_CODES, authError, isFreshLogin } from '../utils/session.js';

/**
 * PATCH /api/users/me/preferences
 * body: { interests?: string[] | null, completeOnboarding?: true,
 *         notifications?: { weeklySummary?: boolean, billReminders?: boolean } }
 *
 * interests: null = show every menu item, [] = core pages only, otherwise
 * known interest keys. completeOnboarding stamps onboarded_at once.
 * Always the signed-in user.
 */
export const updatePreferences = async (req, res) => {
    try {
        const { interests, completeOnboarding, notifications } = req.body;
        const data = {};

        if (notifications !== undefined) {
            if (!notifications || typeof notifications !== 'object') {
                return res.status(400).json({ message: 'notifications must be an object' });
            }
            for (const [key, column] of [['weeklySummary', 'notify_weekly_summary'], ['billReminders', 'notify_bill_reminders']]) {
                if (notifications[key] === undefined) continue;
                if (typeof notifications[key] !== 'boolean') return res.status(400).json({ message: `notifications.${key} must be true or false` });
                data[column] = notifications[key];
            }
        }

        if (interests !== undefined) {
            if (interests !== null && !Array.isArray(interests)) {
                return res.status(400).json({ message: 'interests must be a list or null' });
            }
            if (interests === null) {
                data.interests = Prisma.DbNull; // SQL NULL, like new users — not the JSON value null
            } else {
                const unknown = interests.filter((k) => !INTEREST_KEYS.includes(k));
                if (unknown.length) {
                    return res.status(400).json({ message: `Unknown interest: ${unknown.join(', ')}` });
                }
                data.interests = [...new Set(interests)];
            }
        }

        if (completeOnboarding === true) {
            const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { onboarded_at: true } });
            if (!current?.onboarded_at) data.onboarded_at = new Date();
        }

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
            select: { onboarded_at: true, interests: true, notify_weekly_summary: true, notify_bill_reminders: true },
        });
        res.json({
            onboarded_at: user.onboarded_at,
            interests: user.interests,
            notifications: { weeklySummary: user.notify_weekly_summary, billReminders: user.notify_bill_reminders },
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Could not save your preferences' });
    }
};

/**
 * POST /api/users/me/deletion-request  body: { password? }
 *
 * The user asks for their account to be deleted. Confirmed with their
 * password (or, for Google/Apple accounts, a sign-in in the last few
 * minutes). The account is deactivated at once — every session signed out —
 * and queued for an admin to delete permanently (Settings → Deletion
 * Requests), where it can still be restored until then.
 */
export const requestAccountDeletion = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { password_hash: true, role: true },
        });
        if (!user) return res.status(404).json({ message: 'Account not found' });
        if (user.role === 'super.admin') {
            return authError(res, 403, AUTH_CODES.FORBIDDEN, 'A super admin account cannot delete itself. Ask another super admin.');
        }

        if (user.password_hash) {
            const ok = await bcrypt.compare(String(req.body?.password ?? ''), user.password_hash);
            if (!ok) return res.status(400).json({ code: AUTH_CODES.VALIDATION, message: 'That password is not right.' });
        } else if (!isFreshLogin(req)) {
            return authError(res, 403, AUTH_CODES.REAUTH_REQUIRED, 'Sign out and sign in again, then request deletion within 10 minutes.');
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                deleted_at: new Date(),
                deletion_requested_by: req.user.id,
                deletion_requested_at: new Date(),
                token_version: { increment: 1 },
            },
        });
        res.json({ message: 'Your account is deactivated and queued for deletion. You have been signed out everywhere.' });
    } catch (error) {
        console.error('Deletion request error:', error);
        res.status(500).json({ message: 'Could not request deletion' });
    }
};
