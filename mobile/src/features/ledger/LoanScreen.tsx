import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addDebtPayment, DEBT_TYPES, debtTypeLabel, deleteDebt, getDebt, ledgerKey, setDebtActive, updateDebt, type Debt, type DebtType } from '../../api/ledger';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, Chip, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
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
    const [editing, setEditing] = useState(false);
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
                <View style={{ flexDirection: 'row', gap: tokens.space.lg }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${d.name}`} hitSlop={12} onPress={() => setEditing(true)}>
                        <Ionicons name="create-outline" size={22} color={colors.text} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${d.name}`} hitSlop={12} onPress={remove}>
                        <Ionicons name="trash-outline" size={22} color={colors.text} />
                    </Pressable>
                </View>
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
                        {d.is_active && !proj && <Text variant="caption">Add a monthly payment (tap the pencil) to see when it's paid off.</Text>}
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
            {d && <EditLoanSheet visible={editing} debt={d} onClose={() => setEditing(false)} />}
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

/** Change a loan's name, type, what's left, and its terms. Payments stay as recorded. */
function EditLoanSheet({ visible, debt, onClose }: { visible: boolean; debt: Debt; onClose: () => void }) {
    const qc = useQueryClient();
    const num = (v: string | number | null) => (v == null ? '' : String(Number(v)));
    const [name, setName] = useState(debt.name);
    const [type, setType] = useState<DebtType>(debt.debt_type);
    const [principal, setPrincipal] = useState(num(debt.principal));
    const [outstanding, setOutstanding] = useState(num(debt.outstanding));
    const [rate, setRate] = useState(num(debt.interest_rate));
    const [minPay, setMinPay] = useState(num(debt.minimum_payment));
    const [dueDay, setDueDay] = useState(num(debt.due_day));
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setName(debt.name); setType(debt.debt_type); setPrincipal(num(debt.principal)); setOutstanding(num(debt.outstanding));
        setRate(num(debt.interest_rate)); setMinPay(num(debt.minimum_payment)); setDueDay(num(debt.due_day)); setError(null);
    }, [visible, debt]);

    async function save() {
        const p = parseBalance(principal);
        const o = parseBalance(outstanding);
        const r = parseBalance(rate);
        const m = parseBalance(minPay);
        const day = dueDay.trim() ? Number(dueDay) : null;
        if (p.error || !p.value) return setError(p.error ?? 'Enter the original amount');
        if (o.error || o.value == null) return setError(o.error ?? 'Enter what is left to pay');
        if (o.value > p.value) return setError("What's left can't be more than the original amount");
        if (r.error || (r.value ?? 0) > 100) return setError('Interest rate is a yearly % between 0 and 100');
        if (m.error) return setError(m.error);
        if (day !== null && !(Number.isInteger(day) && day >= 1 && day <= 28)) return setError('Due day is a day of the month, 1–28');
        setBusy(true);
        setError(null);
        try {
            await updateDebt(debt.id, {
                name: name.trim(), debt_type: type, principal: p.value, outstanding: o.value,
                interest_rate: r.value, minimum_payment: m.value, due_day: day,
            });
            await qc.invalidateQueries();
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Edit loan">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {DEBT_TYPES.map((t) => <Chip key={t.key} label={t.label} selected={type === t.key} onPress={() => setType(t.key)} />)}
            </View>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label={type === 'credit_card' ? 'Credit limit (PKR)' : 'Amount borrowed (PKR)'} value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" />
            <Field label="Still to pay (PKR)" value={outstanding} onChangeText={setOutstanding} keyboardType="decimal-pad" />
            <Field label="Interest rate, % a year" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Not set" />
            <Field label="Monthly payment" value={minPay} onChangeText={setMinPay} keyboardType="decimal-pad" placeholder="Not set" />
            <Field label="Due day of the month" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="1–28" error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!name.trim() || busy} />
        </Sheet>
    );
}
