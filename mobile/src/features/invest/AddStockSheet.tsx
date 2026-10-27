import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addStockLot, getPsxMarket, type StockHolding } from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { parseBalance } from '../../lib/parseBalance';
import { Button, Chip, Field, Sheet, Text, tokens } from '../../ui';

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Props = { visible: boolean; onClose: () => void; holdings: StockHolding[]; initialSymbol?: string | null };

/** Record a PSX purchase: ticker (suggested from the market list), shares, price, date. */
export function AddStockSheet({ visible, onClose, holdings, initialSymbol }: Props) {
    const qc = useQueryClient();
    const market = useQuery({ queryKey: ['psx-market'], queryFn: getPsxMarket, enabled: visible, staleTime: 5 * 60_000 });
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(today());
    const [fee, setFee] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // Opened from the market list: start on that ticker, at its last price.
        if (!visible || !initialSymbol) return;
        setSymbol(initialSymbol);
        const q = market.data?.find((m) => m.ticker === initialSymbol);
        if (q) setPrice(String(q.price));
    }, [visible, initialSymbol, market.data]);

    const ticker = symbol.trim().toUpperCase();
    const quote = market.data?.find((q) => q.ticker === ticker);
    const suggestions = useMemo(() => {
        if (!ticker || quote || !market.data) return [];
        return market.data.filter((q) => q.ticker.startsWith(ticker) || q.companyName.toUpperCase().includes(ticker)).slice(0, 6);
    }, [ticker, quote, market.data]);

    function pick(t: string) {
        setSymbol(t);
        const q = market.data?.find((m) => m.ticker === t);
        if (q && !price) setPrice(String(q.price));
    }

    async function save() {
        const qty = parseBalance(quantity);
        const p = parseBalance(price);
        const f = parseBalance(fee);
        if (!ticker) return setError('Enter the ticker, e.g. ENGRO');
        if (qty.error || !qty.value || !Number.isInteger(qty.value)) return setError('Shares must be a whole number');
        if (p.error || !p.value) return setError(p.error ?? 'Enter the price per share');
        if (f.error) return setError(f.error);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return setError('Date must look like 2026-10-27');
        setBusy(true);
        setError(null);
        try {
            await addStockLot({
                existingId: holdings.find((h) => h.symbol === ticker)?.id ?? null,
                symbol: ticker, name: quote?.companyName ?? null,
                quantity: qty.value, price: p.value, date, fee: f.value ?? 0,
            });
            await qc.invalidateQueries();
            setSymbol(''); setQuantity(''); setPrice(''); setFee(''); setDate(today());
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    const qtyValue = parseBalance(quantity).value ?? 0;
    const priceValue = parseBalance(price).value ?? 0;

    return (
        <Sheet visible={visible} onClose={onClose} title="Record a stock purchase">
            <Field label="Ticker" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. ENGRO" />
            {quote && <Text variant="caption">{quote.companyName} · last {fmtPKR(quote.price)}</Text>}
            {suggestions.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                    {suggestions.map((q) => <Chip key={q.ticker} label={q.ticker} selected={false} onPress={() => pick(q.ticker)} />)}
                </View>
            )}
            <Field label="Shares" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="e.g. 100" />
            <Field label="Price per share (PKR)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <Field label="Bought on" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCorrect={false} />
            <Field label="Brokerage & fees (optional)" value={fee} onChangeText={setFee} keyboardType="decimal-pad" error={error} />
            {qtyValue > 0 && priceValue > 0 && <Text variant="caption">Total {fmtPKR(qtyValue * priceValue + (parseBalance(fee).value ?? 0))}</Text>}
            <Button label="Save purchase" onPress={save} loading={busy} disabled={!ticker || !quantity || !price || busy} />
        </Sheet>
    );
}
