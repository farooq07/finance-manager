import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { INTEREST_KEYS } from '../constants/interests.js';

/**
 * PATCH /api/users/me/preferences
 * body: { interests?: string[] | null, completeOnboarding?: true }
 *
 * interests: null = show every menu item, [] = core pages only, otherwise
 * known interest keys. completeOnboarding stamps onboarded_at once.
 * Always the signed-in user.
 */
export const updatePreferences = async (req, res) => {
    try {
        const { interests, completeOnboarding } = req.body;
        const data = {};

        if (interests !== undefined) {
            if (interests !== null && !Array.isArray(interests)) {
                return res.status(400).json({ message: 'interests must be a list or null' });
            }
            if (interests === null) {
                data.interests = Prisma.JsonNull;
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
            select: { onboarded_at: true, interests: true },
        });
        res.json({ onboarded_at: user.onboarded_at, interests: user.interests });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Could not save your preferences' });
    }
};
