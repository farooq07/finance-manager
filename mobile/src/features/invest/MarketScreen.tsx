import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { getInvestments, getPsxMarket, investmentsKey, type PsxQuote } from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { BackHeader, Chip, EmptyState, ErrorState, Field, ListRow, Screen, Skeleton, Text, tokens, useTheme } from '../../ui';
import { AddStockSheet } from './AddStockSheet';
import { pctText } from './InvestScreen';

type Sort = 'gainers' | 'losers' | 'active' | 'az';
const SORTS: { key: Sort; label: string }[] = [
    { key: 'gainers', label: 'Top gainers' },
    { key: 'losers', label: 'Top losers' },
    { key: 'active', label: 'Most active' },
    { key: 'az', label: 'A–Z' },
];
const SHOWN = 60;

const sorters: Record<Sort, (a: PsxQuote, b: PsxQuote) => number> = {
    gainers: (a, b) => b.changePct - a.changePct,
    losers: (a, b) => a.changePct - b.changePct,
    active: (a, b) => Number(b.volume) - Number(a.volume),
    az: (a, b) => a.ticker.localeCompare(b.ticker),
};

/** PSX closing prices: search, sort, and tap one to record a purchase. */
export function MarketScreen() {
    const { colors } = useTheme();
    const market = useQuery({ queryKey: ['psx-market'], queryFn: getPsxMarket, staleTime: 5 * 60_000 });
    const overview = useQuery({ queryKey: investmentsKey, queryFn: getInvestments });
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<Sort>('gainers');
    const [buying, setBuying] = useState<string | null>(null);

    const canRecord = overview.data?.stocks.source === 'manual';
    const term = search.trim().toUpperCase();
    const rows = useMemo(() => {
        const all = market.data ?? [];
        const hits = term ? all.filter((q) => q.ticker.includes(term) || q.companyName.toUpperCase().includes(term)) : all;
        return [...hits].sort(sorters[term ? 'az' : sort]);
    }, [market.data, term, sort]);
    const updated = market.data?.reduce<string | null>((m, q) => (!m || q.lastUpdated > m ? q.lastUpdated : m), null);

    return (
        <Screen keyboard refreshing={market.isRefetching} onRefresh={() => void market.refetch()}>
            <BackHeader title="PSX market" />
            <Field label="Search" value={search} onChangeText={setSearch} placeholder="Ticker or company" autoCapitalize="characters" autoCorrect={false} />
            {!term && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                    {SORTS.map((s) => <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />)}
                </View>
            )}

            {market.isPending && <Skeleton height={300} radius={tokens.radius.hero} />}
            {market.isError && <ErrorState message={apiError(market.error)} onRetry={() => void market.refetch()} />}
            {market.data && market.data.length === 0 && (
                <EmptyState title="No prices yet" message="PSX prices arrive with the weekday price sync after market close." />
            )}

            {rows.length > 0 && (
                <>
                    {updated && <Text variant="caption">Closing prices · updated {fmtDateLong(updated)}{canRecord ? ' · tap a stock to record a purchase' : ''}</Text>}
                    <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                        {rows.slice(0, SHOWN).map((q) => (
                            <ListRow key={q.ticker} title={q.ticker} subtitle={q.companyName}
                                amount={q.price} amountCaption={pctText(q.changePct)}
                                onPress={canRecord ? () => setBuying(q.ticker) : undefined} />
                        ))}
                    </View>
                    {rows.length > SHOWN && <Text variant="caption">Showing {SHOWN} of {rows.length} — search to find others.</Text>}
                </>
            )}
            {term && market.data && rows.length === 0 && <Text variant="caption">Nothing matches "{search.trim()}".</Text>}

            <AddStockSheet visible={buying != null} onClose={() => setBuying(null)}
                holdings={overview.data?.stocks.holdings ?? []} initialSymbol={buying} />
        </Screen>
    );
}
