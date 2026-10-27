import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addDebtPayment, debtTypeLabel, deleteDebt, getDebt, ledgerKey, setDebtActive } from '../../api/ledger';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
import { ordinal } from './LedgerScreen';

const monthsText = (m: number) => {
    const y = Math.floor(m / 12);
    const r = m % 12;
    return [y ? `${y} year${y === 1 ? '' : 's'}` : '', r ? `${r} month${r === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ') || 'under a month';
};

/** One loan: what's left, when it's paid off at this pace, and its payments. */
export function LoanScreen({ id }: { id: string }) {
    const router = useRouter();
    const { colors } = useTheme();
    const qc = useQueryClient();
    const detail = useQuery({ queryKey: [...ledgerKey, 'debt', id], queryFn: () => getDebt(id) });
    const [paying, setPaying] = useState(false);
    const d = detail.data?.debt;
    const proj = detail.data?.projection;

    const principal = Number(d?.principal ?? 0);
    const outstanding = Number(d?.outstanding ?? 0);
    const paidPct = principal > 0 ? Math.min(100, Math.max(0, ((principal - outstanding) / principal) * 100)) : 0;

    function remove() {
        if (!d) return;
        Alert.alert(`Delete ${d.name}?`, 'Its payment history is deleted too. To keep the history, mark it closed instead.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteDebt(d.id); await qc.invalidateQueries(); router.back(); } catch (err) { Alert.alert('Could not delete', apiError(err)); }
                },
            },
        ]);
    }

    async function toggleActive() {
        if (!d) return;
        try { await setDebtActive(d.id, !d.is_active); await qc.invalidateQueries(); } catch (err) { Alert.alert('Could not update', apiError(err)); }
    }

    return (
        <Screen refreshing={detail.isRefetching} onRefresh={() => void detail.refetch()}>
            <BackHeader title={d?.name ?? 'Loan'} action={d ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${d.name}`} hitSlop={12} onPress={remove}>
                    <Ionicons name="trash-outline" size={22} color={colors.text} />
                </Pressable>
            ) : undefined} />
            {detail.isPending && <Skeleton height={150} radius={tokens.radius.hero} />}
            {detail.isError && !d && <ErrorState message={apiError(detail.error)} onRetry={() => void detail.refetch()} />}

            {d && (
                <>
                    <HeroCard
                        label={d.is_active ? 'Still to pay' : 'Closed'}
                        value={fmtPKR(outstanding)}
                        caption={`${debtTypeLabel(d.debt_type)} · ${Math.round(paidPct)}% of ${fmtPKR(principal)} paid`}
                        actions={d.is_active ? [{ label: 'Record a payment', glyph: '↗', onPress: () => setPaying(true) }] : []}
                    />

                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.cardBorder }}>
                        <View style={{ height: 8, borderRadius: 4, width: `${paidPct}%`, backgroundColor: colors.accent }} />
                    </View>

                    <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, padding: tokens.space.lg, gap: tokens.space.sm }}>
                        <Row label="Interest rate" value={d.interest_rate ? `${Number(d.interest_rate)}% a year` : 'Not set'} />
                        <Row label="Monthly payment" value={d.minimum_payment ? fmtPKR(Number(d.minimum_payment)) : 'Not set'} />
                        <Row label="Due" value={d.due_day ? `${ordinal(d.due_day)} of each month` : 'Not set'} />
                        {d.is_active && proj && ('unpayable' in proj
                            ? <Text variant="caption" style={{ color: colors.danger }}>The monthly payment doesn't cover the interest — this loan never gets paid off at this pace.</Text>
                            : <Text variant="caption">At this pace it's paid off in {monthsText(proj.monthsToPayoff)}, with about {fmtPKR(proj.totalInterest)} more in interest.</Text>)}
                        {d.is_active && !proj && <Text variant="caption">Add a monthly payment (on the web) to see when it's paid off.</Text>}
                    </View>

                    {d.payments.length > 0 && (
                        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                            <Text variant="heading" style={{ marginTop: tokens.space.sm }}>Payments</Text>
                            {d.payments.map((pmt) => (
                                <ListRow key={pmt.id} title={pmt.notes || 'Payment'} subtitle={fmtDateLong(pmt.paid_at)} amount={Number(pmt.amount)} />
                            ))}
                        </View>
                    )}

                    <Button label={d.is_active ? 'Mark as closed' : 'Reopen this loan'} variant="text" onPress={() => void toggleActive()} />
                </>
            )}

            <PaySheet visible={paying} debtId={id} outstanding={outstanding} onClose={() => setPaying(false)} />
        </Screen>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body">{label}</Text>
            <Text variant="body">{value}</Text>
        </View>
    );
}

function PaySheet({ visible, debtId, outstanding, onClose }: { visible: boolean; debtId: string; outstanding: number; onClose: () => void }) {
    const qc = useQueryClient();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const a = parseBalance(amount);
        if (a.error || !a.value) return setError(a.error ?? 'Enter the amount paid');
        if (a.value > outstanding + 0.005) return setError(`That's more than the ${fmtPKR(outstanding)} left`);
        setBusy(true);
        setError(null);
        try {
            await addDebtPayment(debtId, a.value, note.trim() || undefined);
            await qc.invalidateQueries();
            setAmount(''); setNote('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Record a payment">
            <Field label="Amount paid (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. October instalment" error={error} />
            <Text variant="caption">The whole amount comes off what's left. Paying it all closes the loan.</Text>
            <Button label="Save payment" onPress={save} loading={busy} disabled={!amount || busy} />
        </Sheet>
    );
}
