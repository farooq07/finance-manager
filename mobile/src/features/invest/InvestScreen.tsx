import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import * as DocumentPicker from 'expo-document-picker';
import {
    addDividend, deleteDividend, deleteMutualFund, getDividends, getInvestments, investmentsKey, uploadCdcStatement, uploadFundStatement,
    type Dividend, type FundHolding, type StockHolding,
} from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { Button, EmptyState, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
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
    const [addingDividend, setAddingDividend] = useState(false);
    const [uploading, setUploading] = useState<'cdc' | 'funds' | null>(null);
    const dividends = useQuery({ queryKey: ['dividends'], queryFn: getDividends });
    const d = overview.data;
    const year = new Date().getFullYear();
    const dividendsThisYear = (dividends.data ?? [])
        .filter((x) => x.payment_date && new Date(x.payment_date).getFullYear() === year)
        .reduce((sum, x) => sum + Number(x.net_dividend_amount), 0);

    async function upload(kind: 'cdc' | 'funds') {
        const res = await DocumentPicker.getDocumentAsync({
            type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.[0]) return;
        const a = res.assets[0];
        const file = { uri: a.uri, name: a.name, mimeType: a.mimeType };
        setUploading(kind);
        try {
            if (kind === 'cdc') {
                const r = await uploadCdcStatement(file);
                Alert.alert('Holdings updated', `Your stocks are now worth ${fmtPKR(Number(r.total_custody))} as of ${fmtDateLong(r.snapshot_date)}.`);
            } else {
                const r = await uploadFundStatement(file);
                Alert.alert('Funds updated', r.message);
            }
            await qc.invalidateQueries();
        } catch (err) {
            Alert.alert('Could not read that file', apiError(err));
        } finally {
            setUploading(null);
        }
    }

    function openDividend(x: Dividend) {
        Alert.alert(`${x.security_symbol} dividend`, `${fmtPKR(Number(x.net_dividend_amount))} received${x.payment_date ? ` on ${fmtDateLong(x.payment_date)}` : ''}`, [
            { text: 'Close', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteDividend(x.id); await qc.invalidateQueries(); } catch (err) { Alert.alert('Could not delete', apiError(err)); }
                },
            },
        ]);
    }

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
                    {d.stocks.holdings.map((s) => <StockRow key={s.symbol} s={s} onPress={() => router.push(`/(app)/stock/${s.symbol}` as Href)} />)}
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

            {dividends.data && dividends.data.length > 0 && (
                <View style={card}>
                    <SectionHeader title="Dividends" value={dividendsThisYear} />
                    <Text variant="caption">Received in {year}, after tax</Text>
                    {dividends.data.slice(0, 5).map((x) => (
                        <ListRow key={x.id} title={x.security_symbol} subtitle={x.payment_date ? fmtDateLong(x.payment_date) : x.status ?? ''}
                            amount={Number(x.net_dividend_amount)} signed onPress={() => openDividend(x)} />
                    ))}
                </View>
            )}

            {d && (
                <View style={{ gap: tokens.space.sm }}>
                    {d.stocks.source === 'manual'
                        ? <Button label="Record a stock purchase" variant="secondary" onPress={() => setAddingStock(true)} />
                        : <Text variant="caption">Your stocks follow your CDC statement — upload a newer one to update them.</Text>}
                    <Button label={uploading === 'cdc' ? 'Reading…' : 'Upload CDC / broker statement'} variant="secondary" onPress={() => void upload('cdc')} disabled={uploading !== null} />
                    <Button label="Add a mutual fund" variant="secondary" onPress={() => setAddingFund(true)} />
                    <Button label={uploading === 'funds' ? 'Reading…' : 'Upload fund statement'} variant="secondary" onPress={() => void upload('funds')} disabled={uploading !== null} />
                    <Button label="Record a dividend" variant="text" onPress={() => setAddingDividend(true)} />
                    <Text variant="caption">Statements: the holdings CSV or Excel export from CDC, your broker, or your fund manager. A CDC upload replaces stocks you entered by hand.</Text>
                </View>
            )}

            <AddStockSheet visible={addingStock} onClose={() => setAddingStock(false)} holdings={d?.stocks.holdings ?? []} />
            <AddFundSheet visible={addingFund} onClose={() => setAddingFund(false)} />
            <DividendSheet visible={addingDividend} onClose={() => setAddingDividend(false)} />
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

function StockRow({ s, onPress }: { s: StockHolding; onPress: () => void }) {
    const { colors } = useTheme();
    const today = s.dayChangePct != null ? ` · ${pctText(s.dayChangePct)} today` : '';
    return (
        <ListRow
            title={s.symbol}
            subtitle={`${s.quantity.toLocaleString()} @ ${fmtPKR(s.price)}${s.stale ? ' · old price' : today}`}
            amount={s.value}
            amountCaption={s.gain != null ? gainText(s.gain, s.cost) : undefined}
            icon={<Text variant="caption" style={{ color: colors.text, fontSize: 11 }}>{s.symbol.slice(0, 4)}</Text>}
            onPress={onPress}
        />
    );
}

const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A dividend credited to you, entered by hand. */
function DividendSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [symbol, setSymbol] = useState('');
    const [net, setNet] = useState('');
    const [date, setDate] = useState(todayIso());
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const n = parseBalance(net);
        if (!symbol.trim()) return setError('Enter the ticker');
        if (n.error || !n.value) return setError(n.error ?? 'Enter the amount received');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return setError('Date must look like 2026-10-27');
        setBusy(true);
        try {
            await addDividend({ symbol: symbol.trim().toUpperCase(), net: n.value, date });
            await qc.invalidateQueries({ queryKey: ['dividends'] });
            setSymbol(''); setNet(''); setDate(todayIso()); setError(null);
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Record a dividend">
            <Field label="Ticker" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. FFC" />
            <Field label="Amount received, after tax (PKR)" value={net} onChangeText={setNet} keyboardType="decimal-pad" />
            <Field label="Paid on" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCorrect={false} error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={busy || !symbol || !net} />
        </Sheet>
    );
}
