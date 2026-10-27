import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSession } from '../session/sessionStore';
import { Button, Screen, Text, tokens, useTheme } from '../../ui';
import { MAX_PIN_ATTEMPTS, useLock } from './lockStore';
import { PinPad } from './PinPad';

/** Unlock with the 6-digit PIN or fingerprint. 5 wrong PINs sign out. */
export function LockScreen() {
    const { colors } = useTheme();
    const name = useSession((s) => s.user?.name);
    const signOut = useSession((s) => s.signOut);
    const { biometricsEnabled, unlockWithPin, unlockWithBiometrics, failedAttempts } = useLock();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [resetKey, setResetKey] = useState(0);

    // Offer fingerprint straight away when it's turned on.
    useEffect(() => {
        if (biometricsEnabled) void unlockWithBiometrics().catch(() => {});
    }, [biometricsEnabled, unlockWithBiometrics]);

    async function submit(pin: string) {
        setBusy(true);
        const result = await unlockWithPin(pin);
        setBusy(false);
        if (result === 'wrong') {
            const left = MAX_PIN_ATTEMPTS - (failedAttempts + 1);
            setMessage(`Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
            setResetKey((k) => k + 1);
        }
    }

    return (
        <Screen>
            <View style={{ alignItems: 'center', gap: tokens.space.sm, marginTop: tokens.space.xxl }}>
                <Text variant="title" accessibilityRole="header">Welcome back{name ? `, ${name.split(' ')[0]}` : ''}</Text>
                <Text variant="caption">Enter your PIN to unlock WealthAxis</Text>
                {message ? <Text variant="caption" accessibilityRole="alert" style={{ color: colors.danger }}>{message}</Text> : null}
            </View>
            <PinPad onComplete={submit} disabled={busy} resetKey={resetKey} />
            <View style={{ gap: tokens.space.sm }}>
                {biometricsEnabled && <Button label="Use fingerprint" variant="secondary" onPress={() => void unlockWithBiometrics()} />}
                <Button label="Sign out" variant="text" onPress={() => void signOut()} />
            </View>
        </Screen>
    );
}
