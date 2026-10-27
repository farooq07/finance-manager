import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { setPin } from '../../api/auth';
import { apiError } from '../../api/client';
import { useSession } from '../session/sessionStore';
import { Button, Screen, Text, tokens, useTheme } from '../../ui';
import { biometricsAvailable, useLock } from './lockStore';
import { PinPad } from './PinPad';

/**
 * First sign-in: choose a 6-digit PIN (entered twice), then optionally turn
 * on fingerprint. Reloading the user (hasPin now true) lets the route guard
 * move on to onboarding / Home.
 */
export function PinSetupScreen() {
    const { colors } = useTheme();
    const refreshUser = useSession((s) => s.refreshUser);
    const { unlockWithBiometrics, setBiometricsEnabled } = useLock();
    const [first, setFirst] = useState<string | null>(null);
    const [stage, setStage] = useState<'choose' | 'confirm' | 'biometrics'>('choose');
    const [message, setMessage] = useState<string | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const [canUseBiometrics, setCanUseBiometrics] = useState(false);

    useEffect(() => { void biometricsAvailable().then(setCanUseBiometrics).catch(() => {}); }, []);

    async function onPin(pin: string) {
        if (stage === 'choose') {
            setFirst(pin);
            setMessage(null);
            return setStage('confirm');
        }
        if (pin !== first) {
            setFirst(null);
            setStage('choose');
            setMessage("PINs didn't match. Try again.");
            return setResetKey((k) => k + 1);
        }
        try {
            await setPin(pin);
            if (canUseBiometrics) setStage('biometrics');
            else await refreshUser();
        } catch (err) {
            setMessage(apiError(err));
            setStage('choose');
        }
    }

    async function enableBiometrics() {
        // Confirm the finger works before relying on it.
        if (await unlockWithBiometrics()) await setBiometricsEnabled(true);
        await refreshUser();
    }

    if (stage === 'biometrics') {
        return (
            <Screen>
                <View style={{ gap: tokens.space.sm, marginTop: tokens.space.xxl }}>
                    <Text variant="title" accessibilityRole="header">Unlock with your fingerprint?</Text>
                    <Text variant="caption">Faster than typing your PIN. You can change this later in Settings.</Text>
                </View>
                <Button label="Turn on fingerprint" onPress={() => void enableBiometrics()} />
                <Button label="Not now" variant="text" onPress={() => void refreshUser()} />
            </Screen>
        );
    }

    return (
        <Screen>
            <View style={{ alignItems: 'center', gap: tokens.space.sm, marginTop: tokens.space.xxl }}>
                <Text variant="title" accessibilityRole="header">{stage === 'choose' ? 'Choose a 6-digit PIN' : 'Enter it again'}</Text>
                <Text variant="caption">You'll use it to unlock WealthAxis.</Text>
                {message ? <Text variant="caption" accessibilityRole="alert" style={{ color: colors.danger }}>{message}</Text> : null}
            </View>
            <PinPad onComplete={(pin) => void onPin(pin)} resetKey={resetKey} />
        </Screen>
    );
}
