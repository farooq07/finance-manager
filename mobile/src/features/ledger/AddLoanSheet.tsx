import { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addDebt, DEBT_TYPES, type DebtType } from '../../api/ledger';
import { parseBalance } from '../../lib/parseBalance';
import { Button, Chip, Field, Sheet, Text, tokens } from '../../ui';

/** Add a credit card or loan: what was borrowed, what's left, and optionally its terms. */
export function AddLoanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState<DebtType>('personal_loan');
    const [principal, setPrincipal] = useState('');
    const [outstanding, setOutstanding] = useState('');
    const [rate, setRate] = useState('');
    const [minPay, setMinPay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const p = parseBalance(principal);
        const o = parseBalance(outstanding);
        const r = parseBalance(rate);
        const m = parseBalance(minPay);
        const day = dueDay.trim() ? Number(dueDay) : null;
        if (p.error || !p.value) return setError(p.error ?? (type === 'credit_card' ? 'Enter the credit limit' : 'Enter the amount borrowed'));
        if (o.error) return setError(o.error);
        if ((o.value ?? p.value) > p.value) return setError('What\'s left can\'t be more than the original amount');
        if (r.error || (r.value ?? 0) > 100) return setError('Interest rate is a yearly % between 0 and 100');
        if (m.error) return setError(m.error);
        if (day !== null && !(Number.isInteger(day) && day >= 1 && day <= 28)) return setError('Due day is a day of the month, 1–28');
        setBusy(true);
        setError(null);
        try {
            await addDebt({
                name: name.trim(), debt_type: type, principal: p.value, outstanding: o.value ?? p.value,
                interest_rate: r.value, minimum_payment: m.value, due_day: day,
            });
            await qc.invalidateQueries();
            setName(''); setPrincipal(''); setOutstanding(''); setRate(''); setMinPay(''); setDueDay('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    const card = type === 'credit_card';
    return (
        <Sheet visible={visible} onClose={onClose} title="Add a loan">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {DEBT_TYPES.map((t) => <Chip key={t.key} label={t.label} selected={type === t.key} onPress={() => setType(t.key)} />)}
            </View>
            <Field label="Name" value={name} onChangeText={setName} placeholder={card ? 'e.g. HBL Credit Card' : 'e.g. Meezan car loan'} />
            <Field label={card ? 'Credit limit (PKR)' : 'Amount borrowed (PKR)'} value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" />
            <Field label={card ? 'Balance due now (PKR)' : 'Still to pay (PKR)'} value={outstanding} onChangeText={setOutstanding} keyboardType="decimal-pad" placeholder="Same as above if blank" />
            <Field label="Interest rate, % a year (optional)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
            <Field label="Monthly payment (optional)" value={minPay} onChangeText={setMinPay} keyboardType="decimal-pad" />
            <Field label="Due day of the month (optional)" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="1–28" error={error} />
            <Text variant="caption">With a rate and monthly payment we'll show when it's paid off. Loans are subtracted from your net worth.</Text>
            <Button label="Save loan" onPress={save} loading={busy} disabled={!name.trim() || !principal || busy} />
        </Sheet>
    );
}
