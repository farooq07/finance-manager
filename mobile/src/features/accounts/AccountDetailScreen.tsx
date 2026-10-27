import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import {
    approveTransaction, deleteStatement, deleteTransaction, getBank, getTransactions, updateBalance,
    type AccountKind, type TxLog,
} from '../../api/money';
import { ALL_CATEGORIES } from '../../lib/categories';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, Chip, EmptyState, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
import { loadAccounts } from './AccountsScreen';

const signedAmount = (t: TxLog) => Number(t.net_amount);
const needsReview = (t: TxLog) => t.processing_status !== 'approved' && t.processing_status !== 'rejected';
// Most in need of a look first: possible duplicates, then the least certain category.
const reviewScore = (t: TxLog) => (t.duplicate_match === 'possible' ? -1 : Number(t.category_confidence ?? 0));

export function AccountDetailScreen() {
    const { kind, id } = useLocalSearchParams<{ kind: AccountKind; id: string }>();
    const router = useRouter();
    const qc = useQueryClient();
    const { colors } = useTheme();

    const account = useQuery({
        queryKey: ['account', kind, id],
        queryFn: async () => {
            if (kind === 'bank') {
                const b = await getBank(id);
                return { name: b.name, balance: Number(b.current_balance), asOf: b.balance_as_of, statements: b.statements };
            }
            const w = (await loadAccounts()).find((a) => a.kind === 'wallet' && a.id === id);
            if (!w) throw new Error('Wallet not found');
            return { name: w.name, balance: w.balance, asOf: w.asOf, statements: [] };
        },
    });
    const txs = useQuery({ queryKey: ['transactions', kind, id], queryFn: () => getTransactions(kind, id) });

    const [reviewing, setReviewing] = useState<TxLog | null>(null);
    const [editingBalance, setEditingBalance] = useState(false);

    const toReview = useMemo(() => (txs.data ?? []).filter(needsReview).sort((a, b) => reviewScore(a) - reviewScore(b)), [txs.data]);
    const recent = useMemo(() => (txs.data ?? []).filter((t) => !needsReview(t)).slice(0, 30), [txs.data]);
    const refresh = () => qc.invalidateQueries();

    const removeStatement = (statementId: string, label: string) => {
        Alert.alert('Remove this statement?', `${label}: its transactions, and the expenses created by approving them, are removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try { await deleteStatement(kind, id, statementId); await refresh(); } catch (err) { Alert.alert("Couldn't remove it", apiError(err)); }
                },
            },
        ]);
    };

    return (
        <Screen refreshing={txs.isRefetching} onRefresh={() => { void account.refetch(); void txs.refetch(); }}>
            <BackHeader title={account.data?.name ?? 'Account'} />

            {account.isPending && <Skeleton height={140} radius={tokens.radius.hero} />}
            {account.isError && <ErrorState message={apiError(account.error)} onRetry={() => void account.refetch()} />}
            {account.data && (
                <HeroCard
                    label="Balance"
                    value={fmtPKR(account.data.balance)}
                    caption={account.data.asOf ? `As of ${fmtDateLong(account.data.asOf)}` : undefined}
                    actions={[
                        { label: 'Import statement', glyph: '↙', onPress: () => router.push(`/(app)/import?kind=${kind}&id=${id}` as Href) },
                        { label: 'Update balance', glyph: '↗', onPress: () => setEditingBalance(true) },
                    ]}
                />
            )}

            {txs.isPending && <Skeleton height={200} radius={tokens.radius.hero} />}
            {txs.data && txs.data.length === 0 && (
                <EmptyState title="No transactions yet" message="Import a PDF or CSV statement from your bank to see them here."
                    action={{ label: 'Import statement', onPress: () => router.push(`/(app)/import?kind=${kind}&id=${id}` as Href) }} />
            )}

            {toReview.length > 0 && (
                <Section title={`To review (${toReview.length})`}>
                    {toReview.map((t) => (
                        <ListRow key={t.id} title={t.description}
                            subtitle={`${fmtDateLong(t.transaction_date)} · ${t.duplicate_match === 'possible' ? 'Possible duplicate' : t.suggested_category || 'Uncategorised'}`}
                            amount={signedAmount(t)} signed onPress={() => setReviewing(t)}
                            icon={<Ionicons name={t.duplicate_match === 'possible' ? 'copy-outline' : 'help-circle-outline'} size={20} color={colors.text} />} />
                    ))}
                </Section>
            )}

            {recent.length > 0 && (
                <Section title="Recent">
                    {recent.map((t) => (
                        <ListRow key={t.id} title={t.description}
                            subtitle={`${fmtDateLong(t.transaction_date)} · ${t.is_duplicate ? 'Duplicate — not counted' : t.approved_category || t.suggested_category || ''}`}
                            amount={signedAmount(t)} signed />
                    ))}
                </Section>
            )}

            {account.data && account.data.statements.length > 0 && (
                <Section title="Imported statements">
                    {account.data.statements.map((s) => (
                        <ListRow key={s.id} title={`${s.month} ${s.year}`} subtitle={`${s.transaction_count} transactions · ${s.processing_status}`}
                            onPress={() => removeStatement(s.id, `${s.month} ${s.year}`)}
                            icon={<Ionicons name="document-text-outline" size={20} color={colors.text} />} />
                    ))}
                    <Text variant="caption">Tap a statement to remove it.</Text>
                </Section>
            )}

            <ReviewSheet kind={kind} accountId={id} tx={reviewing} onClose={() => setReviewing(null)} onDone={refresh} />
            <BalanceSheet visible={editingBalance} kind={kind} id={id} current={account.data?.balance ?? 0} onClose={() => setEditingBalance(false)} onDone={refresh} />
        </Screen>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const { colors } = useTheme();
    return (
        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md }}>
            <Text variant="heading" accessibilityRole="header">{title}</Text>
            {children}
        </View>
    );
}

function ReviewSheet({ kind, accountId, tx, onClose, onDone }: { kind: AccountKind; accountId: string; tx: TxLog | null; onClose: () => void; onDone: () => void }) {
    const [category, setCategory] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    if (!tx) return null;
    const chosen = category ?? tx.suggested_category ?? 'Other';

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            onDone();
            setCategory(null);
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={!!tx} onClose={() => { setCategory(null); onClose(); }} title={tx.description}>
            <Text variant="body">{fmtDateLong(tx.transaction_date)} · {fmtPKR(Number(tx.net_amount))}</Text>
            {tx.duplicate_match === 'possible' && (
                <Text variant="caption">Looks like a transaction you already imported. Delete it if it's a repeat; approve it if it's real.</Text>
            )}
            <Text variant="label">Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {ALL_CATEGORIES.map((c) => <Chip key={c} label={c} selected={chosen === c} onPress={() => setCategory(c)} />)}
            </View>
            {error ? <Text variant="caption">{error}</Text> : null}
            <Button label="Approve" onPress={() => run(() => approveTransaction(kind, accountId, tx.id, chosen))} loading={busy} disabled={busy} />
            <Button label="Delete transaction" variant="text" onPress={() => run(() => deleteTransaction(kind, accountId, tx.id))} disabled={busy} />
        </Sheet>
    );
}

function BalanceSheet({ visible, kind, id, current, onClose, onDone }: { visible: boolean; kind: AccountKind; id: string; current: number; onClose: () => void; onDone: () => void }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const parsed = parseBalance(value);
        if (parsed.error || parsed.value === null) return setError(parsed.error ?? 'Enter the balance');
        setBusy(true);
        try {
            await updateBalance(kind, id, parsed.value);
            onDone();
            setValue('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Update balance">
            <Text variant="caption">Now: {fmtPKR(current)}. A balance you type is treated as true as of today.</Text>
            <Field label="Balance today" value={value} onChangeText={setValue} keyboardType="decimal-pad" error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!value || busy} />
        </Sheet>
    );
}
