import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addDuesEntry, deleteDuesEntry, deletePerson, getPerson, ledgerKey, sendReminder, type DuesType } from '../../api/ledger';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, Chip, EmptyState, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
import { owesText } from './LedgerScreen';

// What happened, in plain words → which way it moves the balance.
const KINDS: { label: string; type: DuesType; note: string }[] = [
    { label: 'I lent them', type: 'receivable', note: 'Lent' },
    { label: 'They paid me back', type: 'payable', note: 'Paid me back' },
    { label: 'I borrowed', type: 'payable', note: 'Borrowed' },
    { label: 'I paid them back', type: 'receivable', note: 'Paid them back' },
];

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** One person: the balance between you, every entry, and adding the next one. */
export function PersonScreen({ id }: { id: string }) {
    const router = useRouter();
    const { colors } = useTheme();
    const qc = useQueryClient();
    const person = useQuery({ queryKey: [...ledgerKey, 'person', id], queryFn: () => getPerson(id) });
    const [adding, setAdding] = useState(false);
    const [reminding, setReminding] = useState(false);
    const p = person.data;

    const refresh = () => qc.invalidateQueries();

    function removeEntry(entryId: string, label: string) {
        Alert.alert('Delete this entry?', label, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteDuesEntry(entryId); await refresh(); } catch (err) { Alert.alert('Could not delete', apiError(err)); }
                },
            },
        ]);
    }

    function removePerson() {
        if (!p) return;
        Alert.alert(`Remove ${p.name}?`, 'Their whole history is deleted too.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try { await deletePerson(p.id); await refresh(); router.back(); } catch (err) { Alert.alert('Could not remove', apiError(err)); }
                },
            },
        ]);
    }

    async function remind() {
        setReminding(true);
        try {
            const r = await sendReminder(id);
            Alert.alert('Reminder sent', r.message);
        } catch (err) {
            Alert.alert('Could not send', apiError(err));
        } finally {
            setReminding(false);
        }
    }

    return (
        <Screen refreshing={person.isRefetching} onRefresh={() => void person.refetch()}>
            <BackHeader title={p?.name ?? 'Person'} action={p ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} hitSlop={12} onPress={removePerson}>
                    <Ionicons name="trash-outline" size={22} color={colors.text} />
                </Pressable>
            ) : undefined} />
            {person.isPending && <Skeleton height={150} radius={tokens.radius.hero} />}
            {person.isError && !p && <ErrorState message={apiError(person.error)} onRetry={() => void person.refetch()} />}

            {p && (
                <>
                    <HeroCard
                        label={p.netBalance > 0 ? 'Owes you' : p.netBalance < 0 ? 'You owe' : 'Balance'}
                        value={fmtPKR(Math.abs(p.netBalance))}
                        caption={Math.abs(p.netBalance) < 0.005 ? 'All settled' : owesText(p.netBalance)}
                        actions={[
                            { label: 'Add entry', glyph: '↗', onPress: () => setAdding(true) },
                            ...(p.email && p.netBalance > 0 ? [{ label: reminding ? 'Sending…' : 'Send reminder', glyph: '↙' as const, onPress: () => { if (!reminding) void remind(); } }] : []),
                        ]}
                    />

                    {p.transactions.length === 0 ? (
                        <EmptyState title="No entries yet" message="Record money you lent, borrowed, or got back." action={{ label: 'Add entry', onPress: () => setAdding(true) }} />
                    ) : (
                        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                            {p.transactions.map((t) => {
                                const amount = Number(t.amount);
                                const label = t.description || (t.transaction_type === 'receivable' ? 'They owe me' : 'I owe them');
                                return (
                                    <ListRow key={t.id} title={label} subtitle={fmtDateLong(t.transaction_date)}
                                        amount={t.transaction_type === 'receivable' ? amount : -amount} signed
                                        onPress={() => removeEntry(t.id, `${label} · ${fmtPKR(amount)} · ${fmtDateLong(t.transaction_date)}`)} />
                                );
                            })}
                        </View>
                    )}
                    {p.transactions.length > 0 && <Text variant="caption">Green entries add to what they owe you. Tap an entry to delete it.</Text>}
                    {p.email ? <Text variant="caption">Email: {p.email}</Text> : null}
                </>
            )}

            <EntrySheet visible={adding} personId={id} onClose={() => setAdding(false)} />
        </Screen>
    );
}

function EntrySheet({ visible, personId, onClose }: { visible: boolean; personId: string; onClose: () => void }) {
    const qc = useQueryClient();
    const [kind, setKind] = useState(0);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(today());
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const a = parseBalance(amount);
        if (a.error || !a.value) return setError(a.error ?? 'Enter the amount');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return setError('Date must look like 2026-10-27');
        setBusy(true);
        setError(null);
        try {
            await addDuesEntry(personId, {
                transaction_type: KINDS[kind].type, amount: a.value, transaction_date: date,
                description: note.trim() || KINDS[kind].note,
            });
            await qc.invalidateQueries();
            setAmount(''); setNote(''); setDate(today());
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add an entry">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {KINDS.map((k, i) => <Chip key={k.label} label={k.label} selected={kind === i} onPress={() => setKind(i)} />)}
            </View>
            <Field label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCorrect={false} />
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder={`e.g. ${KINDS[kind].note} for the car repair`} error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!amount || busy} />
        </Sheet>
    );
}
