import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { debtTypeLabel, getDebts, getPeople, ledgerKey } from '../../api/ledger';
import { fmtPKR } from '../../lib/currency';
import { BackHeader, Button, Chip, EmptyState, ErrorState, HeroCard, ListRow, Screen, Skeleton, Text, tokens, useTheme } from '../../ui';
import { AddLoanSheet } from './AddLoanSheet';
import { AddPersonSheet } from './AddPersonSheet';

type Tab = 'people' | 'loans';

/** "Owes you PKR 5,000" / "You owe PKR 2,000" / "Settled" — from a person's net. */
export function owesText(net: number) {
    if (Math.abs(net) < 0.005) return 'Settled';
    return net > 0 ? `Owes you ${fmtPKR(net)}` : `You owe ${fmtPKR(-net)}`;
}

/** Who owes you, who you owe, and your loans. */
export function LedgerScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ tab?: string }>();
    const [tab, setTab] = useState<Tab>(params.tab === 'loans' ? 'loans' : 'people');
    const [adding, setAdding] = useState<Tab | null>(null);
    const people = useQuery({ queryKey: [...ledgerKey, 'people'], queryFn: getPeople });
    const debts = useQuery({ queryKey: [...ledgerKey, 'debts'], queryFn: getDebts });

    // Netted per person, like the server: one person's debt never offsets another's.
    const nets = (people.data ?? []).map((p) => p.netBalance);
    const owedToYou = nets.filter((n) => n > 0).reduce((s, n) => s + n, 0);
    const youOwe = -nets.filter((n) => n < 0).reduce((s, n) => s + n, 0);
    const activeDebts = (debts.data ?? []).filter((d) => d.is_active);
    const loansOutstanding = activeDebts.reduce((s, d) => s + Number(d.outstanding), 0);

    const loading = people.isPending || debts.isPending;
    const failed = (people.isError && !people.data) || (debts.isError && !debts.data);
    const card = { backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm } as const;

    // Settled people last; within each group, biggest balance first.
    const sortedPeople = [...(people.data ?? [])].sort((a, b) =>
        Number(Math.abs(a.netBalance) < 0.005) - Number(Math.abs(b.netBalance) < 0.005) || Math.abs(b.netBalance) - Math.abs(a.netBalance));
    const sortedDebts = [...(debts.data ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || Number(b.outstanding) - Number(a.outstanding));

    return (
        <Screen refreshing={people.isRefetching || debts.isRefetching} onRefresh={() => { void people.refetch(); void debts.refetch(); }}>
            <BackHeader title="Ledger" />

            {loading && <Skeleton height={150} radius={tokens.radius.hero} />}
            {failed && <ErrorState message={apiError(people.error ?? debts.error)} onRetry={() => { void people.refetch(); void debts.refetch(); }} />}

            {!loading && !failed && (
                <HeroCard
                    label="Owed to you"
                    value={fmtPKR(owedToYou)}
                    caption={`You owe ${fmtPKR(youOwe)} to people${loansOutstanding ? ` · ${fmtPKR(loansOutstanding)} on loans` : ''}`}
                />
            )}

            <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <Chip label={`People${people.data ? ` (${people.data.length})` : ''}`} selected={tab === 'people'} onPress={() => setTab('people')} />
                <Chip label={`Loans${debts.data ? ` (${activeDebts.length})` : ''}`} selected={tab === 'loans'} onPress={() => setTab('loans')} />
            </View>

            {tab === 'people' && people.data && (
                people.data.length === 0 ? (
                    <EmptyState title="No one yet" message="Add a friend or relative, then record money you lent or borrowed." action={{ label: 'Add a person', onPress: () => setAdding('people') }} />
                ) : (
                    <>
                        <View style={card}>
                            {sortedPeople.map((p) => (
                                <ListRow key={p.id} title={p.name} subtitle={`${owesText(p.netBalance)} · ${p.transactions.length} entr${p.transactions.length === 1 ? 'y' : 'ies'}`}
                                    amount={p.netBalance} signed
                                    icon={<Text variant="heading">{p.name.trim().charAt(0).toUpperCase()}</Text>}
                                    onPress={() => router.push(`/(app)/person/${p.id}` as Href)} />
                            ))}
                        </View>
                        <Text variant="caption">Green: they owe you. Plain: you owe them.</Text>
                        <Button label="Add a person" variant="secondary" onPress={() => setAdding('people')} />
                    </>
                )
            )}

            {tab === 'loans' && debts.data && (
                debts.data.length === 0 ? (
                    <EmptyState title="No loans" message="Add a credit card, car loan or other loan to track what's left and when it's paid off." action={{ label: 'Add a loan', onPress: () => setAdding('loans') }} />
                ) : (
                    <>
                        <View style={card}>
                            {sortedDebts.map((d) => (
                                <View key={d.id} style={{ opacity: d.is_active ? 1 : 0.55 }}>
                                    <ListRow title={d.name}
                                        subtitle={`${debtTypeLabel(d.debt_type)}${d.is_active ? (d.due_day ? ` · due on the ${ordinal(d.due_day)}` : '') : ' · closed'}`}
                                        amount={Number(d.outstanding)} amountCaption={`of ${fmtPKR(Number(d.principal))}`}
                                        icon={<Ionicons name={d.debt_type === 'credit_card' ? 'card-outline' : 'document-text-outline'} size={20} color={colors.text} />}
                                        onPress={() => router.push(`/(app)/loan/${d.id}` as Href)} />
                                </View>
                            ))}
                        </View>
                        <Button label="Add a loan" variant="secondary" onPress={() => setAdding('loans')} />
                    </>
                )
            )}

            <AddPersonSheet visible={adding === 'people'} onClose={() => setAdding(null)} />
            <AddLoanSheet visible={adding === 'loans'} onClose={() => setAdding(null)} />
        </Screen>
    );
}

export function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
