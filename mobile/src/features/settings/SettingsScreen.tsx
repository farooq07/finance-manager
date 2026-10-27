import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { changePin, requestAccountDeletion, revokeOtherSessions } from '../../api/auth';
import { updatePreferences } from '../../api/accounts';
import { api, apiError, TOKEN_KEY } from '../../api/client';
import { INTERESTS } from '../../lib/interests';
import { InterestPicker } from '../onboarding/InterestPicker';
import { biometricsAvailable, useLock } from '../lock/lockStore';
import { PinPad } from '../lock/PinPad';
import { useSession } from '../session/sessionStore';
import { BackHeader, Button, Field, ListRow, Screen, Sheet, Text, tokens, useTheme } from '../../ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Your profile, what the app shows, security, and your account. */
export function SettingsScreen() {
    const { colors } = useTheme();
    const user = useSession((s) => s.user);
    const refreshUser = useSession((s) => s.refreshUser);
    const signOut = useSession((s) => s.signOut);
    const { biometricsEnabled, loadBiometricsSetting, setBiometricsEnabled, unlockWithBiometrics } = useLock();
    const [canUseBiometrics, setCanUseBiometrics] = useState(false);
    const [sheet, setSheet] = useState<'interests' | 'pin' | 'delete' | null>(null);
    const [savingNotify, setSavingNotify] = useState(false);

    useEffect(() => {
        void loadBiometricsSetting();
        void biometricsAvailable().then(setCanUseBiometrics).catch(() => {});
    }, [loadBiometricsSetting]);

    const notify = user?.notifications ?? { weeklySummary: true, billReminders: true };
    const interests = user?.interests;
    const tracking = interests == null
        ? 'Everything'
        : interests.length === 0 ? 'Core pages only' : INTERESTS.filter((i) => interests.includes(i.key)).map((i) => i.label).join(', ');

    async function setNotification(key: 'weeklySummary' | 'billReminders', value: boolean) {
        setSavingNotify(true);
        try {
            await updatePreferences({ notifications: { [key]: value } });
            await refreshUser();
        } catch (err) {
            Alert.alert('Could not save', apiError(err));
        } finally {
            setSavingNotify(false);
        }
    }

    async function toggleBiometrics(on: boolean) {
        // Prove the finger works before relying on it to unlock.
        if (on && !(await unlockWithBiometrics())) return;
        await setBiometricsEnabled(on);
    }

    function signOutOthers() {
        Alert.alert('Sign out other devices?', 'Every other phone and browser signed in to your account is signed out. This one stays signed in.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign them out', style: 'destructive', onPress: async () => {
                    try {
                        const r = await revokeOtherSessions();
                        // Our old token stopped working too — keep the fresh one.
                        await SecureStore.setItemAsync(TOKEN_KEY, r.token);
                        Alert.alert('Done', r.message);
                    } catch (err) {
                        Alert.alert('Could not sign out other devices', apiError(err));
                    }
                },
            },
        ]);
    }

    const card = { backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm } as const;
    const icon = (name: IconName) => <Ionicons name={name} size={20} color={colors.text} />;
    const apiHost = (() => { try { return new URL(api.defaults.baseURL ?? '').host; } catch { return api.defaults.baseURL ?? ''; } })();

    return (
        <Screen>
            <BackHeader title="Settings" />

            <View style={card}>
                <ListRow title={user?.name || 'Your account'} subtitle={user?.email} icon={<Text variant="heading">{(user?.name || user?.email || '?').charAt(0).toUpperCase()}</Text>} />
            </View>

            <Section title="What you see">
                <View style={card}>
                    <ListRow title="What you track" subtitle={tracking} icon={icon('options-outline')} onPress={() => setSheet('interests')} />
                </View>
            </Section>

            <Section title="Emails">
                <View style={card}>
                    <ToggleRow label="Weekly summary" hint="Sunday morning: last week's spending and balances" value={notify.weeklySummary}
                        disabled={savingNotify} onChange={(v) => void setNotification('weeklySummary', v)} />
                    <ToggleRow label="Bill reminders" hint="Before a recurring bill or loan payment is due" value={notify.billReminders}
                        disabled={savingNotify} onChange={(v) => void setNotification('billReminders', v)} />
                </View>
            </Section>

            <Section title="Security">
                <View style={card}>
                    {user?.hasPin !== false && <ListRow title="Change app PIN" subtitle="The 6-digit PIN that unlocks the app" icon={icon('keypad-outline')} onPress={() => setSheet('pin')} />}
                    {canUseBiometrics && (
                        <ToggleRow label="Unlock with fingerprint" hint="Instead of typing your PIN" value={biometricsEnabled} onChange={(v) => void toggleBiometrics(v)} />
                    )}
                    <ListRow title="Sign out other devices" subtitle="Keeps you signed in here" icon={icon('phone-portrait-outline')} onPress={signOutOthers} />
                </View>
            </Section>

            <Section title="Account">
                <View style={card}>
                    <ListRow title="Sign out" icon={icon('log-out-outline')} onPress={() => void signOut()} />
                    <ListRow title="Delete my account" subtitle="Deactivates it now; deleted after review" icon={<Ionicons name="trash-outline" size={20} color={colors.danger} />} onPress={() => setSheet('delete')} />
                </View>
            </Section>

            <Text variant="caption" style={{ textAlign: 'center' }}>
                WealthAxis {Constants.expoConfig?.version ?? ''} · {apiHost}
            </Text>

            <InterestsSheet visible={sheet === 'interests'} initial={interests ?? INTERESTS.map((i) => i.key)} onClose={() => setSheet(null)} />
            <ChangePinSheet visible={sheet === 'pin'} onClose={() => setSheet(null)} />
            <DeleteAccountSheet visible={sheet === 'delete'} onClose={() => setSheet(null)} />
        </Screen>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={{ gap: tokens.space.sm }}>
            <Text variant="label">{title}</Text>
            {children}
        </View>
    );
}

function ToggleRow({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: tokens.space.md, gap: tokens.space.md }}>
            <View style={{ flex: 1 }}>
                <Text variant="heading">{label}</Text>
                <Text variant="caption">{hint}</Text>
            </View>
            <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={label}
                trackColor={{ true: colors.accent, false: colors.cardBorder }} thumbColor={colors.card} />
        </View>
    );
}

function InterestsSheet({ visible, initial, onClose }: { visible: boolean; initial: string[]; onClose: () => void }) {
    const refreshUser = useSession((s) => s.refreshUser);
    const [value, setValue] = useState<string[]>(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Start from the saved choice each time the sheet opens (not on every parent render).
    const initialKey = initial.join(',');
    useEffect(() => { if (visible) { setValue(initialKey ? initialKey.split(',') : []); setError(null); } }, [visible, initialKey]);

    async function save() {
        setBusy(true);
        try {
            await updatePreferences({ interests: value });
            await refreshUser();
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="What do you track?">
            <Text variant="caption">Accounts, expenses, Zakat and reports are always included.</Text>
            <InterestPicker value={value} onChange={setValue} />
            {error ? <Text variant="caption">{error}</Text> : null}
            <Button label="Save" onPress={save} loading={busy} disabled={busy} />
        </Sheet>
    );
}

/** Current PIN → new PIN → new PIN again. */
function ChangePinSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const [current, setCurrent] = useState<string | null>(null);
    const [next, setNext] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (visible) { setCurrent(null); setNext(null); setMessage(null); setResetKey((k) => k + 1); } }, [visible]);

    async function onPin(pin: string) {
        if (!current) { setCurrent(pin); setMessage(null); return; }
        if (!next) { setNext(pin); return; }
        if (pin !== next) {
            setNext(null);
            setMessage("The new PINs didn't match. Enter the new PIN again.");
            return setResetKey((k) => k + 1);
        }
        setBusy(true);
        try {
            await changePin(current, pin);
            onClose();
            Alert.alert('PIN changed', 'Use your new PIN to unlock WealthAxis, here and on the web.');
        } catch (err) {
            // Most likely the current PIN was wrong: start over.
            setCurrent(null);
            setNext(null);
            setMessage(apiError(err));
            setResetKey((k) => k + 1);
        } finally {
            setBusy(false);
        }
    }

    const prompt = !current ? 'Enter your current PIN' : !next ? 'Choose a new 6-digit PIN' : 'Enter the new PIN again';
    return (
        <Sheet visible={visible} onClose={onClose} title="Change app PIN">
            <View style={{ alignItems: 'center', gap: tokens.space.lg }}>
                <Text variant="heading">{prompt}</Text>
                <PinPad onComplete={(p) => void onPin(p)} disabled={busy} resetKey={resetKey} />
                {message ? <Text variant="caption">{message}</Text> : null}
            </View>
        </Sheet>
    );
}

function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const signOut = useSession((s) => s.signOut);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function confirmDelete() {
        setBusy(true);
        setError(null);
        try {
            const r = await requestAccountDeletion(password || undefined);
            onClose();
            Alert.alert('Account deactivated', r.message);
            await signOut();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Delete my account">
            <Text variant="body">Your account is deactivated straight away and you're signed out everywhere. An admin then deletes it and all your data for good — until then it can still be restored.</Text>
            <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" error={error}
                placeholder="Signed in with Google? Leave blank" />
            <Button label="Deactivate and delete" onPress={() => void confirmDelete()} loading={busy} disabled={busy} />
        </Sheet>
    );
}
