import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { fmtPKR, fmtGL, glColor, pctChange } from '../../../utils/currency';
import { useMutualFunds } from '../../../hooks/useMutualFunds';
import { useStocks } from '../../../hooks/useStocks';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { MaskedBalance } from '../../../components/ui/MaskedBalance';

export default function PortfolioIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: mfData, isLoading: mfLoading, refetch: mfRefetch, isRefetching: mfRefetching } = useMutualFunds();
  const { data: stocks, isLoading: stocksLoading, refetch: stocksRefetch, isRefetching: stocksRefetching } = useStocks();

  const isLoading = mfLoading || stocksLoading;
  const isRefetching = mfRefetching || stocksRefetching;

  const mfValue = parseFloat(mfData?.portfolioSummary?.currentValuePKR?.replace(/[^0-9.]/g, '') ?? '0');
  const mfCost = parseFloat(mfData?.portfolioSummary?.totalInvestmentPKR?.replace(/[^0-9.]/g, '') ?? '0');

  const stockValue = (stocks ?? []).reduce((sum, s) => {
    const cmp = parseFloat(s.current_market_price);
    const qty = s.transactions.reduce((q, t) => q + t.quantity, 0);
    return sum + cmp * qty;
  }, 0);
  const stockCost = (stocks ?? []).reduce((sum, s) => {
    return sum + s.transactions.reduce((c, t) => c + parseFloat(t.buy_price) * t.quantity + parseFloat(t.brokerage_fee ?? '0'), 0);
  }, 0);

  const totalValue = mfValue + stockValue;
  const totalCost = mfCost + stockCost;
  const totalGL = totalValue - totalCost;
  const totalGLPct = pctChange(totalValue, totalCost);

  const tiles = [
    { label: 'Mutual Funds', value: fmtPKR(mfValue), gl: mfValue - mfCost, count: mfData?.funds?.length ?? 0, icon: 'pie-chart-outline', color: Colors.primary, route: '/(tabs)/portfolio/mutual-funds' },
    { label: 'Stocks (PSX)', value: fmtPKR(stockValue), gl: stockValue - stockCost, count: (stocks ?? []).length, icon: 'trending-up-outline', color: '#8B5CF6', route: '/(tabs)/portfolio/stocks' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { mfRefetch(); stocksRefetch(); }} tintColor={Colors.primary} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Portfolio</Text>
      </View>

      {/* Total value card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Portfolio Value</Text>
        {isLoading ? (
          <Skeleton width={200} height={36} borderRadius={8} style={{ marginVertical: 8 }} />
        ) : (
          <MaskedBalance value={fmtPKR(totalValue)} fontSize={32} color="#fff" />
        )}
        {!isLoading && (
          <View style={styles.glRow}>
            <Text style={[styles.glText, { color: totalGL >= 0 ? '#86EFAC' : '#FCA5A5' }]}>
              {fmtGL(totalGL)} ({totalGLPct.toFixed(2)}%)
            </Text>
          </View>
        )}
      </View>

      {/* Tiles */}
      <View style={styles.tilesSection}>
        {tiles.map((tile) => (
          <TouchableOpacity key={tile.label} onPress={() => router.push(tile.route as any)} activeOpacity={0.8}>
            <Card elevated style={styles.tile}>
              <View style={styles.tileTop}>
                <View style={[styles.tileIcon, { backgroundColor: tile.color + '18' }]}>
                  <MaterialCommunityIcons name={tile.icon as any} size={22} color={tile.color} />
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textTertiary} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              {isLoading ? <Skeleton width={120} height={22} borderRadius={6} style={{ marginTop: 8 }} /> : (
                <Text style={styles.tileValue}>{tile.value}</Text>
              )}
              {!isLoading && (
                <Text style={[styles.tileGL, { color: glColor(tile.gl) }]}>
                  {fmtGL(tile.gl)} · {tile.count} holdings
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        ))}

        {/* Snapshot links */}
        <View style={styles.row2}>
          {[
            { label: 'MF Snapshots', icon: 'albums-outline', route: '/(tabs)/portfolio/mutual-fund-snapshots', color: Colors.primary },
            { label: 'PSX Snapshots', icon: 'camera-outline', route: '/(tabs)/portfolio/psx-snapshots', color: '#8B5CF6' },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.snapTile} onPress={() => router.push(item.route as any)}>
              <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
              <Text style={styles.snapLabel}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  totalCard: { margin: 16, backgroundColor: Colors.primary, borderRadius: 20, padding: 24 },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  glRow: { marginTop: 8 },
  glText: { fontSize: 14, fontWeight: '500' },
  tilesSection: { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  tile: { padding: 16 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tileIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tileLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  tileValue: { fontSize: 22, fontWeight: '700', color: Colors.text, marginTop: 4 },
  tileGL: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  row2: { flexDirection: 'row', gap: 12 },
  snapTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  snapLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
});
