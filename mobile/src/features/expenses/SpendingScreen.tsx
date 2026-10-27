import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { getInsights, getSpending, type SpendingRow } from '../../api/money';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { BackHeader, Button, EmptyState, ErrorState, HeroCard, ListRow, Screen, Skeleton, Text, tokens, useTheme } from '../../ui';
import { AddExpenseSheet } from './AddExpenseSheet';
import { EditTransactionSheet } from './EditTransactionSheet';

const monthAnchor = (offset: number) => {
    const d = new Date();
    const m = new Date(d.getFullYear(), d.getMonth() + offset, 15);
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-15`;
};
const monthLabel = (anchor: string) =>
    new Date(`${anchor}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const FLOW_NOTE: Record<string, string> = {
    transfer: 'Between your accounts', cash: 'Cash withdrawn', investment: 'Invested', debt: 'Loan repayment', refund: 'Refund',
};

/** A month of money out (and in): totals, by category, every transaction. */
export function SpendingScreen() {
    const { colors } = useTheme();
    const [offset, setOffset] = useState(0);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<SpendingRow | null>(null);
    const anchor = monthAnchor(offset);
    const insights = useQuery({ queryKey: ['insights', anchor], queryFn: () => getInsights(anchor) });
    const rows = useQuery({ queryKey: ['spending', anchor], queryFn: () => getSpending(anchor) });

    const groups = useMemo(() => {
        const byDay = new Map<string, SpendingRow[]>();
        for (const r of rows.data?.rows ?? []) {
            const key = String(r.date).slice(0, 10);
            byDay.set(key, [...(byDay.get(key) ?? []), r]);
        }
        return [...byDay.entries()];
    }, [rows.data]);

    const t = insights.data?.totals;
    const maxCat = Math.max(1, ...(insights.data?.categoryBreakdown ?? []).map((c) => c.total));

    return (
        <Screen refreshing={rows.isRefetching} onRefresh={() => { void insights.refetch(); void rows.refetch(); }}>
            <BackHeader title="Spending" />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={12} onPress={() => setOffset((o) => o - 1)}>
                    <Ionicons name="chevron-back-circle-outline" size={28} color={colors.text} />
                </Pressable>
                <Text variant="heading">{monthLabel(anchor)}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={12} disabled={offset >= 0} onPress={() => setOffset((o) => o + 1)} style={{ opacity: offset >= 0 ? 0.3 : 1 }}>
                    <Ionicons name="chevron-forward-circle-outline" size={28} color={colors.text} />
                </Pressable>
            </View>

            {insights.isPending && <Skeleton height={140} radius={tokens.radius.hero} />}
            {insights.isError && <ErrorState message={apiError(insights.error)} onRetry={() => void insights.refetch()} />}
            {t && (
                <HeroCard
                    label="Spent"
                    value={fmtPKR(t.currentSpend)}
                    caption={`Income ${fmtPKR(t.currentIncome)}${t.cashWithdrawn ? ` · Cash withdrawn ${fmtPKR(t.cashWithdrawn)}` : ''}`}
                />
            )}

            {insights.data && insights.data.categoryBreakdown.length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, padding: tokens.space.lg, gap: tokens.space.sm }}>
                    <Text variant="heading" accessibilityRole="header">By category</Text>
                    {insights.data.categoryBreakdown.slice(0, 8).map((c) => (
                        <View key={c.category} style={{ gap: 4 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text variant="body">{c.category}</Text>
                                <Text variant="body">{fmtPKR(c.total)}</Text>
                            </View>
                            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardBorder }}>
                                <View style={{ height: 6, borderRadius: 3, width: `${Math.round((c.total / maxCat) * 100)}%`, backgroundColor: colors.accent }} />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <Button label="Add expense" variant="secondary" onPress={() => setAdding(true)} />

            {rows.data && rows.data.rows.length === 0 && <EmptyState title="Nothing this month" message="Import a statement or add an expense." />}
            {groups.length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md }}>
                    {groups.map(([day, items]) => (
                        <View key={day} style={{ marginTop: tokens.space.sm }}>
                            <Text variant="caption" style={{ color: colors.textFaint }}>{fmtDateLong(day)}</Text>
                            {items.map((r) => (
                                <ListRow key={r.id} title={r.description || r.category}
                                    subtitle={`${FLOW_NOTE[r.flow] ?? r.category} · ${r.sourceLabel}`}
                                    amount={r.kind === 'credit' ? r.amount : -r.amount} signed
                                    onPress={() => setEditing(r)} />
                            ))}
                        </View>
                    ))}
                </View>
            )}

            {groups.length > 0 && <Text variant="caption">Tap a transaction to change its category, or to edit or delete an expense you added.</Text>}

            <AddExpenseSheet visible={adding} onClose={() => setAdding(false)} />
            <EditTransactionSheet row={editing} onClose={() => setEditing(null)} />
        </Screen>
    );
}
