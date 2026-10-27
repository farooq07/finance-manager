import { useLocalSearchParams } from 'expo-router';
import { StockScreen } from '../../../src/features/invest/StockScreen';

export default function Stock() {
    const { symbol } = useLocalSearchParams<{ symbol: string }>();
    return <StockScreen symbol={String(symbol).toUpperCase()} />;
}
