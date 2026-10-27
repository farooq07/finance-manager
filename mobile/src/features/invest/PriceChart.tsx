import { View } from 'react-native';
import type { PricePoint } from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { Text, tokens, useTheme } from '../../ui';

/**
 * Closing prices as thin columns, one per trading day, scaled between the
 * period's low and high. Plain views — no chart library or native graphics.
 */
export function PriceChart({ points, height = 120 }: { points: PricePoint[]; height?: number }) {
    const { colors } = useTheme();
    if (points.length < 2) return <Text variant="caption">Not enough price history yet — it builds up with each weekday's close.</Text>;

    const closes = points.map((p) => p.close);
    const lo = Math.min(...closes);
    const hi = Math.max(...closes);
    const span = hi - lo || 1;
    const first = closes[0];
    const last = closes[closes.length - 1];
    const up = last >= first;
    const pct = first ? ((last - first) / first) * 100 : 0;
    const tone = up ? colors.moneyIn : colors.danger;

    return (
        <View style={{ gap: tokens.space.sm }}>
            <View accessible accessibilityLabel={`Price from ${fmtPKR(first)} to ${fmtPKR(last)}, ${pct.toFixed(1)}%`}
                style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                {closes.map((c, i) => (
                    <View key={points[i].date} style={{ flex: 1, height: Math.max(2, ((c - lo) / span) * (height - 8) + 4), borderRadius: 1, backgroundColor: tone, opacity: 0.35 + 0.65 * (i / closes.length) }} />
                ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption">{fmtDateLong(points[0].date)}</Text>
                <Text variant="caption" style={{ color: tone }}>{up ? '+' : ''}{pct.toFixed(1)}%</Text>
                <Text variant="caption">{fmtDateLong(points[points.length - 1].date)}</Text>
            </View>
            <Text variant="caption">Low {fmtPKR(lo)} · High {fmtPKR(hi)}</Text>
        </View>
    );
}
