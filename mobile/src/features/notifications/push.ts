import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useRouter, type Href } from 'expo-router';
import { api, TOKEN_KEY } from '../../api/client';

// Bill reminders and the weekly summary, as push notifications (the server
// also emails them). The phone's Expo push address is registered with the
// account while signed in and unlinked on sign-out.

const PUSH_TOKEN_KEY = 'push_token';
const PUSH_OFF_KEY = 'push_disabled';

/** Expo Go on Android can't receive pushes (since SDK 53); the installed app can. */
export const pushSupported = !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

// Loaded only where it works: in Expo Go on Android merely importing it logs an error.
type NotificationsModule = typeof import('expo-notifications');
const notifications = (): NotificationsModule => require('expo-notifications') as NotificationsModule;

export type PushResult = 'on' | 'denied' | 'unsupported';

/** Ask permission (once), register this phone, remember it's on. */
export async function enablePush(): Promise<PushResult> {
    if (!pushSupported) return 'unsupported';
    const N = notifications();
    if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('default', { name: 'Reminders and summaries', importance: N.AndroidImportance.DEFAULT });
    }
    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') status = (await N.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.post('/users/me/push-tokens', { token, platform: Platform.OS });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    await SecureStore.deleteItemAsync(PUSH_OFF_KEY);
    return 'on';
}

/** Stop notifications on this phone (and remember the choice). */
export async function disablePush() {
    await SecureStore.setItemAsync(PUSH_OFF_KEY, 'true');
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    try { await api.delete('/users/me/push-tokens', { data: { token } }); } catch { /* the token goes stale on its own */ }
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export async function isPushOn() {
    return pushSupported && Boolean(await SecureStore.getItemAsync(PUSH_TOKEN_KEY));
}

/**
 * On sign-out: unlink this phone so the next person signed in here doesn't get
 * the previous one's reminders. Plain fetch, not the API client — a 401 there
 * would trigger another sign-out. Best effort, never slower than 3 seconds.
 */
export async function forgetPushOnSignOut() {
    const [token, auth] = await Promise.all([SecureStore.getItemAsync(PUSH_TOKEN_KEY), SecureStore.getItemAsync(TOKEN_KEY)]);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    if (!token || !auth) return;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 3000);
    try {
        await fetch(`${api.defaults.baseURL}/users/me/push-tokens`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
            body: JSON.stringify({ token }),
            signal: abort.signal,
        });
    } catch { /* offline: the server drops it when Expo reports it gone */ } finally {
        clearTimeout(timer);
    }
}

/**
 * While signed in: register for pushes (unless turned off in Settings), show
 * them while the app is open, and open the screen a tapped one points to.
 */
export function usePushNotifications() {
    const router = useRouter();
    useEffect(() => {
        if (!pushSupported) return;
        const N = notifications();
        N.setNotificationHandler({
            handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
        });
        void (async () => {
            if (await SecureStore.getItemAsync(PUSH_OFF_KEY)) return;
            await enablePush();
        })().catch(() => { /* no permission or offline — Settings can retry */ });

        const sub = N.addNotificationResponseReceivedListener((response) => {
            const path = response.notification.request.content.data?.path;
            if (typeof path === 'string' && path.startsWith('/')) router.push(path as Href);
        });
        return () => sub.remove();
    }, [router]);
}
