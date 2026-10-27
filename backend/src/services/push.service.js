import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo accepts up to 100 messages per request
export const PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

/** Register this phone for the signed-in user. A token signed in on before by someone else moves to them. */
export function savePushToken(userId, token, platform = null) {
    return prisma.pushToken.upsert({
        where: { token },
        update: { user_id: userId, platform, last_seen_at: new Date() },
        create: { user_id: userId, token, platform },
    });
}

/** Forget a phone — only if it's this user's. */
export function removePushToken(userId, token) {
    return prisma.pushToken.deleteMany({ where: { token, user_id: userId } });
}

/**
 * Send one notification to every phone of each user. `data.path` is the app
 * screen to open when it's tapped. Never throws: email is the primary channel,
 * a push is a bonus. Tokens Expo says are gone (app uninstalled) are deleted.
 *
 * @param {string[]} userIds
 * @param {{ title: string, body: string, data?: object }} message
 */
export async function sendPush(userIds, { title, body, data = {} }, { fetchImpl = fetch } = {}) {
    try {
        const tokens = await prisma.pushToken.findMany({ where: { user_id: { in: userIds } }, select: { token: true } });
        if (tokens.length === 0) return { sent: 0, removed: 0 };

        let sent = 0;
        const gone = [];
        for (let i = 0; i < tokens.length; i += BATCH) {
            const chunk = tokens.slice(i, i + BATCH);
            const res = await fetchImpl(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(chunk.map(({ token }) => ({ to: token, title, body, data, sound: 'default', channelId: 'default' }))),
            });
            if (!res.ok) {
                logger.warn(`[PUSH] Expo returned ${res.status}`);
                continue;
            }
            const tickets = (await res.json())?.data ?? [];
            tickets.forEach((t, j) => {
                if (t?.status === 'ok') sent += 1;
                else if (t?.details?.error === 'DeviceNotRegistered') gone.push(chunk[j].token);
            });
        }
        if (gone.length) await prisma.pushToken.deleteMany({ where: { token: { in: gone } } });
        return { sent, removed: gone.length };
    } catch (err) {
        logger.warn(`[PUSH] send failed: ${err.message}`);
        return { sent: 0, removed: 0 };
    }
}
