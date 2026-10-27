import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { deleteMutualFund, getInvestments, investmentsKey, type FundHolding, type StockHolding } from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { Button, EmptyState, ErrorState, HeroCard, ListRow, Screen, Skeleton, Text, tokens, useTheme } from '../../ui';
import { AddFundSheet } from './AddFundSheet';
import { AddStockSheet } from './AddStockSheet';

/** "+PKR 1,200 (3.4%)" — a gain or loss against what it cost. */
export function gainText(gain: number, cost: number | null) {
    const pct = cost ? ` (${((gain / cost) * 100).toFixed(1)}%)` : '';
    return `${gain >= 0 ? '+' : ''}${fmtPKR(gain)}${pct}`;
}
export const pctText = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

/** Stocks, mutual funds and brokerage cash — valued exactly as net worth values them. */
export function InvestScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const qc = useQueryClient();
    const overview = useQuery({ queryKey: investmentsKey, queryFn: getInvestments });
    const [addingStock, setAddingStock] = useState(false);
    const [addingFund, setAddingFund] = useState(false);
    const d = overview.data;

    const cost = d ? d.stocks.cost + d.mutualFunds.cost : 0;
    const gain = d ? d.stocks.value + d.mutualFunds.value - cost : 0;
    const empty = d && d.stocks.holdings.length === 0 && d.mutualFunds.funds.length === 0 && !d.tradingCash;

    function openFund(f: FundHolding) {
        Alert.alert(f.name, `${f.units.toLocaleString()} units at NAV ${f.nav}\nInvested ${fmtPKR(f.invested)} · now ${fmtPKR(f.value)}`, [
            { text: 'Close', style: 'cancel' },
            {
                text: 'Remove fund', style: 'destructive', onPress: async () => {
                    try {
                        await deleteMutualFund(f.id);
                        await qc.invalidateQueries();
                    } catch (err) {
                        Alert.alert('Could not remove', apiError(err));
                    }
                },
            },
        ]);
    }

    const card = { backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md } as const;

    return (
        <Screen refreshing={overview.isRefetching} onRefresh={() => void overview.refetch()}>
            <Text variant="title" accessibilityRole="header">Invest</Text>

            {overview.isPending && <Skeleton height={150} radius={tokens.radius.hero} />}
            {overview.isError && !d && <ErrorState message={apiError(overview.error)} onRetry={() => void overview.refetch()} />}

            {d && (
                <HeroCard
                    label="Your investments"
                    value={fmtPKR(d.total)}
                    caption={cost > 0 ? `${gainText(gain, cost)} on ${fmtPKR(cost)} invested` : 'Stocks, mutual funds and brokerage cash'}
                    actions={[{ label: 'PSX market', glyph: '↗', onPress: () => router.push('/(app)/market' as Href) }]}
                />
            )}

            {empty && (
                <EmptyState title="No investments yet" message="Record a stock purchase or add a mutual fund. CDC and fund statements can be uploaded from the web app." />
            )}

            {d && d.stocks.holdings.length > 0 && (
                <View style={card}>
                    <SectionHeader title="Stocks (PSX)" value={d.stocks.value} />
                    <Text variant="caption">
                        {d.stocks.source === 'cdc'
                            ? `From your CDC statement${d.stocks.asOf ? ` · priced ${fmtDateLong(d.stocks.asOf)}` : ''}`
                            : 'Entered by you · priced at the latest PSX close'}
                    </Text>
                    {d.stocks.holdings.map((s) => <StockRow key={s.symbol} s={s} />)}
                </View>
            )}

            {d && d.tradingCash > 0 && (
                <View style={card}>
                    <ListRow title="Brokerage cash" subtitle="Uninvested cash with your broker" amount={d.tradingCash}
                        icon={<Ionicons name="cash-outline" size={20} color={colors.text} />} />
                </View>
            )}

            {d && d.mutualFunds.funds.length > 0 && (
                <View style={card}>
                    <SectionHeader title="Mutual funds" value={d.mutualFunds.value} />
                    {d.mutualFunds.asOf && <Text variant="caption">From your statement uploaded {fmtDateLong(d.mutualFunds.asOf)}</Text>}
                    {d.mutualFunds.funds.map((f) => (
                        <ListRow key={f.id} title={f.name} subtitle={`${f.units.toLocaleString()} units · NAV ${f.nav}`}
                            amount={f.value} amountCaption={gainText(f.gain, f.invested)}
                            icon={<Ionicons name="pie-chart-outline" size={20} color={colors.text} />}
                            onPress={() => openFund(f)} />
                    ))}
                </View>
            )}

            {d && (
                <View style={{ gap: tokens.space.sm }}>
                    {d.stocks.source === 'manual'
                        ? <Button label="Record a stock purchase" variant="secondary" onPress={() => setAddingStock(true)} />
                        : <Text variant="caption">Your stocks follow your CDC statement — upload a newer one from the web app to update them.</Text>}
                    <Button label="Add a mutual fund" variant="secondary" onPress={() => setAddingFund(true)} />
                </View>
            )}

            <AddStockSheet visible={addingStock} onClose={() => setAddingStock(false)} holdings={d?.stocks.holdings ?? []} />
            <AddFundSheet visible={addingFund} onClose={() => setAddingFund(false)} />
        </Screen>
    );
}

function SectionHeader({ title, value }: { title: string; value: number }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="heading" accessibilityRole="header">{title}</Text>
            <Text variant="heading">{fmtPKR(value)}</Text>
        </View>
    );
}

function StockRow({ s }: { s: StockHolding }) {
    const { colors } = useTheme();
    const today = s.dayChangePct != null ? ` · ${pctText(s.dayChangePct)} today` : '';
    return (
        <ListRow
            title={s.symbol}
            subtitle={`${s.quantity.toLocaleString()} @ ${fmtPKR(s.price)}${s.stale ? ' · old price' : today}`}
            amount={s.value}
            amountCaption={s.gain != null ? gainText(s.gain, s.cost) : undefined}
            icon={<Text variant="caption" style={{ color: colors.text, fontSize: 11 }}>{s.symbol.slice(0, 4)}</Text>}
        />
    );
}
