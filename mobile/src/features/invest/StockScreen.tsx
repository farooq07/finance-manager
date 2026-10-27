import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { getDividends, getInvestments, getPriceHistory, getPsxMarket, investmentsKey } from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { BackHeader, Button, Chip, ErrorState, HeroCard, ListRow, Screen, Skeleton, Text, tokens, useTheme } from '../../ui';
import { AddStockSheet } from './AddStockSheet';
import { gainText, pctText } from './InvestScreen';
import { PriceChart } from './PriceChart';

const RANGES = [{ days: 30, label: '1M' }, { days: 90, label: '3M' }, { days: 365, label: '1Y' }];

/** One PSX stock: your holding, its price over time, and dividends it paid you. */
export function StockScreen({ symbol }: { symbol: string }) {
    const { colors } = useTheme();
    const [days, setDays] = useState(90);
    const [trade, setTrade] = useState<'buy' | 'sell' | null>(null);
    const overview = useQuery({ queryKey: investmentsKey, queryFn: getInvestments });
    const history = useQuery({ queryKey: ['price-history', symbol, days], queryFn: () => getPriceHistory(symbol, days) });
    const market = useQuery({ queryKey: ['psx-market'], queryFn: getPsxMarket, staleTime: 5 * 60_000 });
    const dividends = useQuery({ queryKey: ['dividends'], queryFn: getDividends });

    const holding = overview.data?.stocks.holdings.find((h) => h.symbol === symbol);
    const quote = market.data?.find((q) => q.ticker === symbol);
    const manual = overview.data?.stocks.source === 'manual';
    const paid = (dividends.data ?? []).filter((d) => d.security_symbol.toUpperCase() === symbol);
    const card = { backgroundColor: colors.card, borderRadius: tokens.radius.hero, padding: tokens.space.lg, gap: tokens.space.sm } as const;

    return (
        <Screen refreshing={history.isRefetching} onRefresh={() => { void overview.refetch(); void history.refetch(); }}>
            <BackHeader title={symbol} />
            {overview.isPending && <Skeleton height={150} radius={tokens.radius.hero} />}
            {overview.isError && <ErrorState message={apiError(overview.error)} onRetry={() => void overview.refetch()} />}

            {overview.data && (
                <HeroCard
                    label={holding ? 'Your holding' : quote?.companyName ?? 'Not held'}
                    value={holding ? fmtPKR(holding.value) : quote ? fmtPKR(quote.price) : '—'}
                    caption={holding
                        ? `${holding.quantity.toLocaleString()} shares @ ${fmtPKR(holding.price)}${holding.gain != null ? ` · ${gainText(holding.gain, holding.cost)}` : ''}`
                        : quote ? `Last close · ${pctText(quote.changePct)} on the day` : 'No price yet'}
                />
            )}

            {quote && holding && <Text variant="caption">{quote.companyName} · last close {fmtPKR(quote.price)} ({pctText(quote.changePct)})</Text>}

            <View style={card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="heading">Price</Text>
                    <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
                        {RANGES.map((r) => <Chip key={r.days} label={r.label} selected={days === r.days} onPress={() => setDays(r.days)} />)}
                    </View>
                </View>
                {history.isPending && <Skeleton height={120} radius={tokens.radius.card} />}
                {history.isError && <Text variant="caption">{apiError(history.error)}</Text>}
                {history.data && <PriceChart points={history.data} />}
            </View>

            {paid.length > 0 && (
                <View style={card}>
                    <Text variant="heading">Dividends from {symbol}</Text>
                    {paid.slice(0, 10).map((d) => (
                        <ListRow key={d.id} title={d.financial_year ? `FY ${d.financial_year}` : 'Dividend'}
                            subtitle={d.payment_date ? fmtDateLong(d.payment_date) : d.status ?? ''} amount={Number(d.net_dividend_amount)} signed />
                    ))}
                </View>
            )}

            {manual && (
                <View style={{ gap: tokens.space.sm }}>
                    <Button label="Record a purchase" variant="secondary" onPress={() => setTrade('buy')} />
                    {holding && holding.quantity > 0 && <Button label="Record a sale" variant="secondary" onPress={() => setTrade('sell')} />}
                    <Text variant="caption">After a sale, what's left is valued at your average cost per share.</Text>
                </View>
            )}
            {overview.data && !manual && <Text variant="caption">Your stocks follow your CDC statement — upload a newer one from the Invest tab to update them.</Text>}

            <AddStockSheet visible={trade !== null} side={trade ?? 'buy'} onClose={() => setTrade(null)}
                holdings={overview.data?.stocks.holdings ?? []} initialSymbol={symbol} />
        </Screen>
    );
}
