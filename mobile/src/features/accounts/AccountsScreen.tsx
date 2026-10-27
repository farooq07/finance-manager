import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBank, createWallet, getBanks, getWallets } from '../../api/accounts';
import { apiError } from '../../api/client';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { Button, Chip, EmptyState, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';

type Row = { kind: 'bank' | 'wallet'; id: string; name: string; balance: number; asOf: string | null };

export const accountsKey = ['accounts'] as const;

export async function loadAccounts(): Promise<Row[]> {
    const [banks, wallets] = await Promise.all([getBanks(), getWallets()]);
    return [
        ...banks.map((b) => ({ kind: 'bank' as const, id: b.id, name: b.name, balance: Number(b.current_balance), asOf: (b as { balance_as_of?: string | null }).balance_as_of ?? null })),
        ...wallets.map((w) => ({ kind: 'wallet' as const, id: w.id, name: w.name, balance: Number(w.balance) * Number(w.exchange_rate ?? 1), asOf: (w as { balance_as_of?: string | null }).balance_as_of ?? null })),
    ];
}

/** Banks and wallets with their balances; add one; open one to import statements. */
export function AccountsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const accounts = useQuery({ queryKey: accountsKey, queryFn: loadAccounts });
    const [adding, setAdding] = useState(false);
    const rows = accounts.data ?? [];
    const total = rows.reduce((s, r) => s + r.balance, 0);

    return (
        <Screen refreshing={accounts.isRefetching} onRefresh={() => void accounts.refetch()}>
            <Text variant="title" accessibilityRole="header">Accounts</Text>

            {accounts.isPending && <Skeleton height={140} radius={tokens.radius.hero} />}
            {accounts.isError && !accounts.data && <ErrorState message={apiError(accounts.error)} onRetry={() => void accounts.refetch()} />}

            {accounts.data && (
                <>
                    <HeroCard label="In your accounts" value={fmtPKR(total)} caption={`${rows.length} account${rows.length === 1 ? '' : 's'}`} />
                    {rows.length === 0 ? (
                        <EmptyState title="No accounts yet" message="Add your bank or wallet, then import its statement." action={{ label: 'Add account', onPress: () => setAdding(true) }} />
                    ) : (
                        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                            {rows.map((r) => (
                                <ListRow
                                    key={`${r.kind}-${r.id}`}
                                    title={r.name}
                                    subtitle={r.asOf ? `${r.kind === 'bank' ? 'Bank' : 'Wallet'} · as of ${fmtDateLong(r.asOf)}` : r.kind === 'bank' ? 'Bank' : 'Wallet'}
                                    amount={r.balance}
                                    icon={<Ionicons name={r.kind === 'bank' ? 'business-outline' : 'wallet-outline'} size={20} color={colors.text} />}
                                    onPress={() => router.push(`/(app)/account/${r.kind}/${r.id}` as Href)}
                                />
                            ))}
                        </View>
                    )}
                    {rows.length > 0 && <Button label="Add account" variant="secondary" onPress={() => setAdding(true)} />}
                </>
            )}

            <AddAccountSheet visible={adding} onClose={() => setAdding(false)} />
        </Screen>
    );
}

function AddAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [kind, setKind] = useState<'bank' | 'wallet'>('bank');
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const parsed = parseBalance(balance);
        if (parsed.error) return setError(parsed.error);
        const amount = parsed.value ?? 0;
        setBusy(true);
        setError(null);
        try {
            if (kind === 'bank') await createBank(name.trim(), amount); else await createWallet(name.trim(), amount);
            await qc.invalidateQueries();
            setName(''); setBalance('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add account">
            <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <Chip label="Bank" selected={kind === 'bank'} onPress={() => setKind('bank')} />
                <Chip label="Wallet" selected={kind === 'wallet'} onPress={() => setKind('wallet')} />
            </View>
            <Field label={kind === 'bank' ? 'Bank name' : 'Wallet name'} value={name} onChangeText={setName} placeholder={kind === 'bank' ? 'e.g. Meezan Bank' : 'e.g. JazzCash'} />
            <Field label="Current balance" value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0" error={error} />
            <Button label="Add" onPress={save} loading={busy} disabled={!name.trim() || busy} />
        </Sheet>
    );
}
