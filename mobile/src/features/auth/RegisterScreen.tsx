import { useState } from 'react';
import { useRouter } from 'expo-router';
import { register } from '../../api/auth';
import { apiError } from '../../api/client';
import { Button, Field, Text } from '../../ui';
import { AuthForm } from './AuthForm';

export function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            const res = await register(name.trim(), email.trim(), password);
            setSentTo(res.email || email.trim());
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    if (sentTo) {
        return (
            <AuthForm title="Check your email" subtitle={`We sent a confirmation link to ${sentTo}. Open it, then sign in.`}>
                <Text variant="caption">Didn't get it? Check spam, or sign up again to get a new link.</Text>
                <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
            </AuthForm>
        );
    }

    return (
        <AuthForm title="Create your account" subtitle="Track your money, net worth and Zakat in one place." error={error}>
            <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <Button label="Create account" onPress={submit} loading={busy} disabled={!name.trim() || !email.trim() || !password || busy} />
            <Button label="I already have an account" variant="text" onPress={() => router.back()} />
        </AuthForm>
    );
}
