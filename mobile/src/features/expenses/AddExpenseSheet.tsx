import { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { addExpense } from '../../api/money';
import { apiError } from '../../api/client';
import { SPEND_CATEGORIES } from '../../lib/categories';
import { parseBalance } from '../../lib/parseBalance';
import { Button, Chip, Field, Sheet, Text, tokens } from '../../ui';

const isoDay = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Record a cash or card expense that isn't in an imported statement. */
export function AddExpenseSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string>('Food & Dining');
    const [day, setDay] = useState(0);
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const parsed = parseBalance(amount);
        if (parsed.error || !parsed.value) return setError(parsed.error ?? 'Enter the amount');
        setBusy(true);
        setError(null);
        try {
            await addExpense({ amount: parsed.value, category, expense_date: isoDay(day), notes: note.trim() || undefined, payment_method: 'Cash' });
            await qc.invalidateQueries();
            setAmount(''); setNote(''); setDay(0);
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add expense">
            <Field label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 2,500" error={error} autoFocus />
            <Text variant="label">Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {SPEND_CATEGORIES.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <Chip label="Today" selected={day === 0} onPress={() => setDay(0)} />
                <Chip label="Yesterday" selected={day === -1} onPress={() => setDay(-1)} />
            </View>
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Imtiaz groceries" />
            <Button label="Save expense" onPress={save} loading={busy} disabled={!amount || busy} />
        </Sheet>
    );
}
