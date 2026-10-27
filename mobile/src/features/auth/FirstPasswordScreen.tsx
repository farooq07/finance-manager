import { useState } from 'react';
import { firstPassword } from '../../api/auth';
import { apiError } from '../../api/client';
import { useSession } from '../session/sessionStore';
import { Button, Field } from '../../ui';
import { AuthForm } from './AuthForm';

/** Invited users replace the temporary password an admin gave them. */
export function FirstPasswordScreen() {
    const refreshUser = useSession((s) => s.refreshUser);
    const signOut = useSession((s) => s.signOut);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        if (password !== confirm) return setError("Passwords don't match");
        setBusy(true);
        setError(null);
        try {
            await firstPassword(password);
            await refreshUser(); // must_change_password is now false → route guard moves on
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthForm title="Set your password" subtitle="Replace the temporary password you were given." error={error}>
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
            <Button label="Save password" onPress={submit} loading={busy} disabled={!password || !confirm || busy} />
            <Button label="Sign out" variant="text" onPress={() => void signOut()} />
        </AuthForm>
    );
}
