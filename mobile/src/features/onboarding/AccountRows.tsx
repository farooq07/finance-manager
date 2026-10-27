import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createBank, createWallet, getBanks, getWallets } from '../../api/accounts';
import { apiError } from '../../api/client';
import type { Bank, Wallet } from '../../api/types';
import { fmtPKR } from '../../lib/currency';
import { parseBalance } from '../../lib/parseBalance';
import { Button, ListRow, Text, tokens, useTheme } from '../../ui';

type Row = { id: number; type: 'bank' | 'wallet'; name: string; balance: string; error: string | null };

let nextId = 1;
const emptyRow = (): Row => ({ id: nextId++, type: 'bank', name: '', balance: '', error: null });
const isTouched = (r: Row) => r.name.trim() !== '' || r.balance.trim() !== '';
const isValid = (r: Row) => r.name.trim() !== '' && parseBalance(r.balance).value !== null;

// Accounts already on the server, in PKR (wallets may be in another currency).
const toExisting = (banks: Bank[] = [], wallets: Wallet[] = []) => [
    ...banks.map((b) => ({ id: `bank-${b.id}`, kind: 'Bank', name: b.name, balance: Number(b.current_balance) || 0 })),
    ...wallets.map((w) => ({ id: `wallet-${w.id}`, kind: 'Wallet', name: w.name, balance: (Number(w.balance) || 0) * (Number(w.exchange_rate) || 1) })),
];
const sum = (list: { balance: number }[]) => list.reduce((s, a) => s + a.balance, 0);

/**
 * Onboarding step 2 — same rules as the web: saved accounts come from the
 * server list (refetched after saving, never kept locally too), new rows are
 * saved one by one, a failing row keeps its error.
 */
export function AccountRows({ onDone }: { onDone: (total: number) => void }) {
    const { colors } = useTheme();
    const queryClient = useQueryClient();
    const banks = useQuery({ queryKey: ['banks'], queryFn: getBanks });
    const wallets = useQuery({ queryKey: ['wallets'], queryFn: getWallets });
    const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
    const [saving, setSaving] = useState(false);

    const existing = toExisting(banks.data, wallets.data);
    const total = sum(existing) + rows.filter(isValid).reduce((s, r) => s + (parseBalance(r.balance).value ?? 0), 0);
    const canContinue = !saving && rows.filter(isTouched).every(isValid) && existing.length + rows.filter(isValid).length > 0;

    const update = (id: number, patch: Partial<Row>) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, error: null } : r)));

    async function handleContinue() {
        setSaving(true);
        const remaining: Row[] = [];
        for (const row of rows.filter(isTouched)) {
            const amount = parseBalance(row.balance).value ?? 0;
            try {
                if (row.type === 'bank') await createBank(row.name.trim(), amount);
                else await createWallet(row.name.trim(), amount);
            } catch (err) {
                remaining.push({ ...row, error: apiError(err) });
            }
        }
        await Promise.all([
            queryClient.refetchQueries({ queryKey: ['banks'] }),
            queryClient.refetchQueries({ queryKey: ['wallets'] }),
        ]);
        setRows(remaining.length ? remaining : [emptyRow()]);
        setSaving(false);
        if (!remaining.length) {
            onDone(sum(toExisting(queryClient.getQueryData<Bank[]>(['banks']), queryClient.getQueryData<Wallet[]>(['wallets']))));
        }
    }

    const input = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: tokens.radius.field, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: tokens.font.regular, color: colors.text };

    return (
        <View style={{ gap: tokens.space.lg }}>
            {existing.length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.card, paddingHorizontal: tokens.space.lg }}>
                    {existing.map((a) => <ListRow key={a.id} title={a.name} subtitle={a.kind} amount={a.balance} />)}
                </View>
            )}

            {rows.map((r) => {
                const balanceError = parseBalance(r.balance).error;
                return (
                    <View key={r.id} style={{ backgroundColor: colors.card, borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm }}>
                        <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                            {(['bank', 'wallet'] as const).map((type) => {
                                const selected = r.type === type;
                                return (
                                    <Pressable
                                        key={type}
                                        accessibilityRole="button"
                                        accessibilityLabel={type === 'bank' ? 'Bank' : 'Wallet'}
                                        accessibilityState={{ selected }}
                                        onPress={() => update(r.id, { type })}
                                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: tokens.radius.pill, backgroundColor: selected ? colors.text : 'transparent', borderWidth: 1, borderColor: selected ? colors.text : colors.cardBorder }}
                                    >
                                        <Text variant="label" style={{ color: selected ? colors.card : colors.textMuted }}>{type === 'bank' ? 'Bank' : 'Wallet'}</Text>
                                    </Pressable>
                                );
                            })}
                            <View style={{ flex: 1 }} />
                            <Pressable accessibilityRole="button" accessibilityLabel="Remove account" hitSlop={10}
                                onPress={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [emptyRow()]))}>
                                <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
                            </Pressable>
                        </View>
                        <TextInput
                            accessibilityLabel="Account name"
                            value={r.name}
                            onChangeText={(name) => update(r.id, { name })}
                            placeholder={r.type === 'bank' ? 'e.g. Meezan Bank' : 'e.g. JazzCash, SadaPay, Cash'}
                            placeholderTextColor={colors.textFaint}
                            style={input}
                        />
                        <TextInput
                            accessibilityLabel="Balance"
                            value={r.balance}
                            onChangeText={(balance) => update(r.id, { balance })}
                            placeholder="Today's balance"
                            placeholderTextColor={colors.textFaint}
                            keyboardType="decimal-pad"
                            style={input}
                        />
                        {(r.error || balanceError) ? <Text variant="caption" style={{ color: colors.danger }}>{r.error || balanceError}</Text> : null}
                    </View>
                );
            })}

            <Button label="+ Add another" variant="text" onPress={() => setRows((rs) => [...rs, emptyRow()])} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">Net worth so far:</Text>
                <Text variant="heading">{fmtPKR(total)}</Text>
            </View>

            <Button label="Continue" onPress={handleContinue} loading={saving} disabled={!canContinue} />
        </View>
    );
}
