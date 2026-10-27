import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import {
    addDuesEntry, deleteDuesEntry, deletePerson, getPerson, ledgerKey, sendReminder, updateDuesEntry, updatePerson, uploadDuesCsv,
    type DuesEntry, type DuesType, type Person,
} from '../../api/ledger';
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

/** Which plain-words choice an existing entry was: by its note if it's one of ours, else by direction. */
const kindOf = (e: DuesEntry) => {
    const byNote = KINDS.findIndex((k) => k.note === e.description && k.type === e.transaction_type);
    return byNote >= 0 ? byNote : KINDS.findIndex((k) => k.type === e.transaction_type);
};

/** One person: the balance between you, every entry, and adding the next one. */
export function PersonScreen({ id }: { id: string }) {
    const router = useRouter();
    const { colors } = useTheme();
    const qc = useQueryClient();
    const person = useQuery({ queryKey: [...ledgerKey, 'person', id], queryFn: () => getPerson(id) });
    // null = closed, 'new' = add, an entry = edit that entry
    const [entry, setEntry] = useState<DuesEntry | 'new' | null>(null);
    const [editingPerson, setEditingPerson] = useState(false);
    const [reminding, setReminding] = useState(false);
    const [importing, setImporting] = useState(false);
    const p = person.data;

    function removePerson() {
        if (!p) return;
        Alert.alert(`Remove ${p.name}?`, 'Their whole history is deleted too.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try { await deletePerson(p.id); await qc.invalidateQueries(); router.back(); } catch (err) { Alert.alert('Could not remove', apiError(err)); }
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

    async function importCsv() {
        const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.[0]) return;
        const a = res.assets[0];
        setImporting(true);
        try {
            const r = await uploadDuesCsv(id, { uri: a.uri, name: a.name, mimeType: a.mimeType });
            await qc.invalidateQueries();
            Alert.alert('Imported', r.imported ? r.message : 'No rows with an amount were found. Check the columns are Detail and Dues.');
        } catch (err) {
            Alert.alert('Could not import', apiError(err));
        } finally {
            setImporting(false);
        }
    }

    const iconButton = (name: React.ComponentProps<typeof Ionicons>['name'], label: string, onPress: () => void) => (
        <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={12} onPress={onPress}>
            <Ionicons name={name} size={22} color={colors.text} />
        </Pressable>
    );

    return (
        <Screen refreshing={person.isRefetching} onRefresh={() => void person.refetch()}>
            <BackHeader title={p?.name ?? 'Person'} action={p ? (
                <View style={{ flexDirection: 'row', gap: tokens.space.lg }}>
                    {iconButton('create-outline', `Edit ${p.name}`, () => setEditingPerson(true))}
                    {iconButton('trash-outline', `Remove ${p.name}`, removePerson)}
                </View>
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
                            { label: 'Add entry', glyph: '↗', onPress: () => setEntry('new') },
                            ...(p.email && p.netBalance > 0 ? [{ label: reminding ? 'Sending…' : 'Send reminder', glyph: '↙' as const, onPress: () => { if (!reminding) void remind(); } }] : []),
                        ]}
                    />

                    {p.transactions.length === 0 ? (
                        <EmptyState title="No entries yet" message="Record money you lent, borrowed, or got back." action={{ label: 'Add entry', onPress: () => setEntry('new') }} />
                    ) : (
                        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                            {p.transactions.map((t) => {
                                const amount = Number(t.amount);
                                const label = t.description || (t.transaction_type === 'receivable' ? 'They owe me' : 'I owe them');
                                return (
                                    <ListRow key={t.id} title={label} subtitle={fmtDateLong(t.transaction_date)}
                                        amount={t.transaction_type === 'receivable' ? amount : -amount} signed
                                        onPress={() => setEntry(t)} />
                                );
                            })}
                        </View>
                    )}
                    {p.transactions.length > 0 && <Text variant="caption">Green entries add to what they owe you. Tap an entry to change or delete it.</Text>}
                    {p.email ? <Text variant="caption">Email: {p.email}</Text> : null}
                    <Button label={importing ? 'Importing…' : 'Import entries from CSV'} variant="text" onPress={() => void importCsv()} disabled={importing} />
                    <Text variant="caption">CSV columns: Detail, Dues (positive = they owe you, negative = you owe them), and optionally Date.</Text>
                </>
            )}

            <EntrySheet entry={entry} personId={id} onClose={() => setEntry(null)} />
            {p && <PersonSheet visible={editingPerson} person={p} onClose={() => setEditingPerson(false)} />}
        </Screen>
    );
}

function EntrySheet({ entry, personId, onClose }: { entry: DuesEntry | 'new' | null; personId: string; onClose: () => void }) {
    const qc = useQueryClient();
    const editing = entry && entry !== 'new' ? entry : null;
    const [kind, setKind] = useState(0);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(today());
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Fresh form for a new entry; the entry's values when editing one.
    useEffect(() => {
        if (!entry) return;
        setError(null);
        if (entry === 'new') {
            setKind(0); setAmount(''); setDate(today()); setNote('');
        } else {
            setKind(kindOf(entry));
            setAmount(String(Number(entry.amount)));
            setDate(String(entry.transaction_date).slice(0, 10));
            setNote(KINDS.some((k) => k.note === entry.description) ? '' : entry.description ?? '');
        }
    }, [entry]);

    async function save() {
        const a = parseBalance(amount);
        if (a.error || !a.value) return setError(a.error ?? 'Enter the amount');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return setError('Date must look like 2026-10-27');
        setBusy(true);
        setError(null);
        try {
            const body = {
                transaction_type: KINDS[kind].type, amount: a.value, transaction_date: date,
                description: note.trim() || KINDS[kind].note,
            };
            if (editing) await updateDuesEntry(editing.id, body);
            else await addDuesEntry(personId, body);
            await qc.invalidateQueries();
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    function remove() {
        if (!editing) return;
        Alert.alert('Delete this entry?', `${fmtPKR(Number(editing.amount))} · ${fmtDateLong(editing.transaction_date)}`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteDuesEntry(editing.id); await qc.invalidateQueries(); onClose(); } catch (err) { Alert.alert('Could not delete', apiError(err)); }
                },
            },
        ]);
    }

    return (
        <Sheet visible={entry !== null} onClose={onClose} title={editing ? 'Edit entry' : 'Add an entry'}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {KINDS.map((k, i) => <Chip key={k.label} label={k.label} selected={kind === i} onPress={() => setKind(i)} />)}
            </View>
            <Field label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus={!editing} />
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCorrect={false} />
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder={`e.g. ${KINDS[kind].note} for the car repair`} error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!amount || busy} />
            {editing && <Button label="Delete entry" variant="text" onPress={remove} />}
        </Sheet>
    );
}

function PersonSheet({ visible, person, onClose }: { visible: boolean; person: Person; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState(person.name);
    const [email, setEmail] = useState(person.email ?? '');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (visible) { setName(person.name); setEmail(person.email ?? ''); setError(null); } }, [visible, person]);

    async function save() {
        const trimmed = email.trim();
        if (trimmed && !/^\S+@\S+\.\S+$/.test(trimmed)) return setError('That email doesn\'t look right');
        setBusy(true);
        try {
            await updatePerson(person.id, name.trim(), trimmed || null);
            await qc.invalidateQueries();
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Edit person">
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!name.trim() || busy} />
        </Sheet>
    );
}
