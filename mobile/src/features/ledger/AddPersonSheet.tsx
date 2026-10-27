import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addPerson, ledgerKey } from '../../api/ledger';
import { Button, Field, Sheet, Text } from '../../ui';

/** Add someone to the ledger, then go straight to their page to record the first entry. */
export function AddPersonSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const router = useRouter();
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const trimmed = email.trim();
        if (trimmed && !/^\S+@\S+\.\S+$/.test(trimmed)) return setError('That email doesn\'t look right');
        setBusy(true);
        setError(null);
        try {
            const person = await addPerson(name.trim(), trimmed || undefined);
            await qc.invalidateQueries({ queryKey: ledgerKey });
            setName(''); setEmail('');
            onClose();
            router.push(`/(app)/person/${person.id}` as Href);
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add a person">
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Ali Bhai" autoFocus />
            <Field label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={error} />
            <Text variant="caption">With an email you can send them a reminder of what they owe.</Text>
            <Button label="Add" onPress={save} loading={busy} disabled={!name.trim() || busy} />
        </Sheet>
    );
}
