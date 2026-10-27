import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getAuthConfig, googleAuth, login } from '../../api/auth';
import { apiError } from '../../api/client';
import { useSession } from '../session/sessionStore';
import { Button, Field } from '../../ui';
import { AuthForm } from './AuthForm';
import { configureGoogle, signInWithGoogle } from './google';

export function SignInScreen() {
    const router = useRouter();
    const adoptSession = useSession((s) => s.adoptSession);
    const config = useQuery({ queryKey: ['auth-config'], queryFn: getAuthConfig, staleTime: Infinity });
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState<'email' | 'google' | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setBusy('email');
        setError(null);
        try {
            const { userId, email } = await login(identifier.trim(), password);
            router.push({ pathname: '/(auth)/otp', params: { userId, email } });
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(null);
        }
    }

    async function google() {
        const clientId = config.data?.googleClientId;
        if (!clientId) return;
        setBusy('google');
        setError(null);
        try {
            configureGoogle(clientId);
            const idToken = await signInWithGoogle();
            if (!idToken) return; // closed the picker — not an error
            const { token, user } = await googleAuth(idToken);
            await adoptSession(token, user);
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(null);
        }
    }

    return (
        <AuthForm title="Welcome back" subtitle="Sign in to see your money in one place." error={error}>
            <Field label="Email or username" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
            <Button label="Sign in" onPress={submit} loading={busy === 'email'} disabled={!identifier.trim() || !password || busy !== null} />
            {config.data?.googleClientId ? (
                <Button label="Continue with Google" variant="secondary" onPress={google} loading={busy === 'google'} disabled={busy !== null} />
            ) : null}
            <Button label="Forgot password?" variant="text" onPress={() => router.push('/(auth)/forgot-password')} />
            <Button label="Create an account" variant="text" onPress={() => router.push('/(auth)/register')} />
        </AuthForm>
    );
}
