import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addZakatEntry, getZakatEntries, getZakatSummary } from '../../api/money';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';

/** Zakat due on your whole wealth, what it's made of, the rules, and payments made. */
export function ZakatScreen() {
    const { colors } = useTheme();
    const summary = useQuery({ queryKey: ['zakat', 'summary'], queryFn: getZakatSummary });
    const entries = useQuery({ queryKey: ['zakat', 'entries'], queryFn: getZakatEntries });
    const [paying, setPaying] = useState(false);
    const s = summary.data;

    const nisabText = !s ? '' : s.isNisabMet === true
        ? 'Your wealth is above nisab — Zakat is due'
        : s.isNisabMet === false ? 'Below nisab — no Zakat due'
            : 'Gold price not available yet — nisab can\'t be checked; the estimate assumes Zakat is due';

    const rows: [string, number, string][] = s ? [
        ['Cash & bank', s.breakdown.cash, '+'],
        ['Investments', s.breakdown.investments, '+'],
        ['Gold', s.breakdown.goldValue, '+'],
        ['Owed to you', s.breakdown.receivables, '+'],
        ['You owe', s.breakdown.payables, '−'],
        ['Debts', s.breakdown.debts, '−'],
    ] : [];

    return (
        <Screen refreshing={summary.isRefetching} onRefresh={() => { void summary.refetch(); void entries.refetch(); }}>
            <BackHeader title="Zakat" />
            {summary.isPending && <Skeleton height={140} radius={tokens.radius.hero} />}
            {summary.isError && <ErrorState message={apiError(summary.error)} onRetry={() => void summary.refetch()} />}

            {s && (
                <>
                    <HeroCard label="Zakat due" value={fmtPKR(s.zakatDue)} caption={nisabText} />
                    <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, padding: tokens.space.lg, gap: tokens.space.sm }}>
                        <Text variant="heading" accessibilityRole="header">How it's worked out</Text>
                        {rows.map(([label, value, sign]) => (
                            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text variant="body">{label}</Text>
                                <Text variant="body">{sign} {fmtPKR(value)}</Text>
                            </View>
                        ))}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: tokens.space.sm }}>
                            <Text variant="heading">Zakatable wealth</Text>
                            <Text variant="heading">{fmtPKR(s.netZakatable)}</Text>
                        </View>
                        {s.nisabValue != null && <Text variant="caption">Nisab (85 g gold): {fmtPKR(s.nisabValue)}{s.goldPriceDate ? ` · gold price ${fmtDateLong(s.goldPriceDate)}` : ''}</Text>}
                        {(s.details?.debts ?? []).map((d) => <Text key={d.name} variant="caption">{d.name}: {fmtPKR(d.deductible)} deducted — {d.rule}</Text>)}
                    </View>
                    {s.assumptions && (
                        <View style={{ gap: 4 }}>
                            <Text variant="label">The rules used</Text>
                            {s.assumptions.map((a) => <Text key={a} variant="caption">• {a}</Text>)}
                        </View>
                    )}
                </>
            )}

            <Button label="Record a payment" onPress={() => setPaying(true)} />

            {entries.data && entries.data.entries.length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md }}>
                    <Text variant="heading">Paid this year: {fmtPKR(entries.data.currentYearTotal)}</Text>
                    {entries.data.entries.slice(0, 20).map((e) => (
                        <ListRow key={e.id} title={e.description || 'Zakat'} subtitle={fmtDateLong(e.date)} amount={Number(e.amount)} />
                    ))}
                </View>
            )}

            <PaySheet visible={paying} onClose={() => setPaying(false)} />
        </Screen>
    );
}

function PaySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const parsed = parseBalance(amount);
        if (parsed.error || !parsed.value) return setError(parsed.error ?? 'Enter the amount');
        setBusy(true);
        try {
            await addZakatEntry(parsed.value, note.trim() || 'Zakat', new Date().toISOString().slice(0, 10));
            await qc.invalidateQueries({ queryKey: ['zakat'] });
            setAmount(''); setNote('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Record Zakat paid">
            <Field label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={error} />
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Ramadan, to Edhi" />
            <Text variant="caption">Today's calculation is kept with the payment, as your record.</Text>
            <Button label="Save" onPress={save} loading={busy} disabled={!amount || busy} />
        </Sheet>
    );
}
