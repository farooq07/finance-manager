import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { approveTransaction, deleteExpense, recategorizeTransaction, updateExpense, type SpendingRow } from '../../api/money';
import { ALL_CATEGORIES, SPEND_CATEGORIES } from '../../lib/categories';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { Button, Chip, Field, Sheet, Text, tokens } from '../../ui';
import { usePaymentMethods } from './usePaymentMethods';

const dayOf = (d: string) => String(d).slice(0, 10);

/**
 * Change one row of Spending. An expense you added is fully editable (and can
 * be deleted); a row from an imported statement keeps its amount and date —
 * those come from the bank — so only its category can change.
 */
export function EditTransactionSheet({ row, onClose }: { row: SpendingRow | null; onClose: () => void }) {
    const qc = useQueryClient();
    const manual = row?.source === 'manual';
    const methods = usePaymentMethods(manual);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [method, setMethod] = useState('Cash');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!row) return;
        setAmount(String(row.amount));
        setCategory(row.category);
        setDate(dayOf(row.date));
        setMethod(row.sourceLabel || 'Cash');
        setNote(row.description || '');
        setError(null);
    }, [row]);

    if (!row) return null;
    const [, rawId] = row.id.split(':');

    async function done() {
        await qc.invalidateQueries();
        onClose();
    }

    async function save() {
        if (!row) return;
        setBusy(true);
        setError(null);
        try {
            if (manual) {
                const a = parseBalance(amount);
                if (a.error || !a.value) throw new Error(a.error ?? 'Enter the amount');
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error('Date must look like 2026-10-27');
                await updateExpense(rawId, { amount: a.value, category, expense_date: date, payment_method: method, notes: note.trim() || null });
            } else if (row.sourceId) {
                const kind = row.source as 'bank' | 'wallet';
                // Still waiting for review: approving files it (and creates its expense).
                if (row.status === 'pending') await approveTransaction(kind, row.sourceId, rawId, category);
                else await recategorizeTransaction(kind, row.sourceId, rawId, category);
            }
            await done();
        } catch (err) {
            setError(err instanceof Error && !('isAxiosError' in err) ? err.message : apiError(err));
        } finally {
            setBusy(false);
        }
    }

    function remove() {
        Alert.alert('Delete this expense?', `${fmtPKR(row!.amount)} · ${row!.category}`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteExpense(rawId); await done(); } catch (err) { Alert.alert('Could not delete', apiError(err)); }
                },
            },
        ]);
    }

    const categories: readonly string[] = row.kind === 'credit' ? ALL_CATEGORIES : manual ? SPEND_CATEGORIES : ALL_CATEGORIES;

    return (
        <Sheet visible onClose={onClose} title={manual ? 'Edit expense' : 'Change category'}>
            {manual ? (
                <>
                    <Field label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                    <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCorrect={false} />
                </>
            ) : (
                <View style={{ gap: 4 }}>
                    <Text variant="heading">{row.description || row.category}</Text>
                    <Text variant="caption">{fmtPKR(row.amount)} · {fmtDateLong(row.date)} · {row.sourceLabel}</Text>
                    <Text variant="caption">Amount and date come from your statement. Changing the category also updates the matching expense.</Text>
                </View>
            )}

            <Text variant="label">Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {categories.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
            </View>

            {manual && (
                <>
                    <Text variant="label">Paid with</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                        {[...new Set([...methods, method])].map((m) => <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />)}
                    </View>
                    <Field label="Note (optional)" value={note} onChangeText={setNote} />
                </>
            )}

            {error ? <Text variant="caption">{error}</Text> : null}
            <Button label="Save" onPress={() => void save()} loading={busy} disabled={busy || !category} />
            {manual && <Button label="Delete expense" variant="text" onPress={remove} />}
        </Sheet>
    );
}
