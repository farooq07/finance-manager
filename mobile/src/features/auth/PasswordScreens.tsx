import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { forgotPassword, resetPassword } from '../../api/auth';
import { apiError } from '../../api/client';
import { passwordProblem } from '../../lib/passwords';
import { Button, Field } from '../../ui';
import { AuthForm } from './AuthForm';

export function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            await forgotPassword(email.trim());
            router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim() } });
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthForm title="Forgot password" subtitle="We'll email you a code to set a new one." error={error}>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Button label="Send code" onPress={submit} loading={busy} disabled={!email.trim() || busy} />
            <Button label="Back to sign in" variant="text" onPress={() => router.back()} />
        </AuthForm>
    );
}

export function ResetPasswordScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        const problem = passwordProblem(password);
        if (problem) return setError(problem);
        setBusy(true);
        setError(null);
        try {
            await resetPassword(email, code, password);
            router.replace('/(auth)/sign-in');
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthForm title="Set a new password" subtitle={`Enter the code we sent to ${email}.`} error={error}>
            <Field label="6-digit code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <Button label="Reset password" onPress={submit} loading={busy} disabled={code.length !== 6 || !password || busy} />
        </AuthForm>
    );
}
