import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { resendOtp, verifyOtp } from '../../api/auth';
import { apiError } from '../../api/client';
import { useSession } from '../session/sessionStore';
import { Button, Field, Text } from '../../ui';
import { AuthForm } from './AuthForm';

/** Second sign-in step: the 6-digit code emailed by /auth/login. */
export function OtpScreen() {
    const { userId, email } = useLocalSearchParams<{ userId: string; email: string }>();
    const adoptSession = useSession((s) => s.adoptSession);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    async function verify() {
        setBusy(true);
        setError(null);
        try {
            const { token, user } = await verifyOtp(userId, code);
            await adoptSession(token, user); // the route guard takes it from here
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setError(null);
        try {
            await resendOtp(userId);
            setNotice('A new code is on its way.');
        } catch (err) {
            setError(apiError(err));
        }
    }

    return (
        <AuthForm title="Check your email" subtitle={`We sent a 6-digit code to ${email}.`} error={error}>
            <Field
                label="6-digit code"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
            />
            <Button label="Verify" onPress={verify} loading={busy} disabled={code.length !== 6 || busy} />
            {notice ? <Text variant="caption">{notice}</Text> : null}
            <Button label="Send a new code" variant="text" onPress={resend} />
        </AuthForm>
    );
}
