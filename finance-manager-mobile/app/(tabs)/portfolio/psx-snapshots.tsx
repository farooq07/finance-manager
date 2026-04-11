import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors } from '../../../constants/colors';
import { fmtPKR } from '../../../utils/currency';
import { formatDate } from '../../../utils/dates';
import { usePsxSnapshots } from '../../../hooks/useStocks';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function PsxSnapshotsScreen() {
  const { data, isLoading, refetch, isRefetching } = usePsxSnapshots();

  return (
    <View style={styles.container}>
      <ScreenHeader title="PSX Snapshots" showBack />
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={120} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="camera-outline" title="No PSX snapshots" subtitle="Upload broker statements to create snapshots" />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.date}>{formatDate(item.snapshot_date)}</Text>
              <View style={styles.grid}>
                <View><Text style={styles.fl}>Invested</Text><Text style={styles.fv}>{fmtPKR(item.total_invested)}</Text></View>
                <View><Text style={styles.fl}>Custody Value</Text><Text style={styles.fv}>{fmtPKR(item.total_custody)}</Text></View>
              </View>
              {item.holdings_data?.length > 0 && (
                <View style={styles.holdings}>
                  <Text style={styles.holdingsTitle}>Holdings ({item.holdings_data.length})</Text>
                  {item.holdings_data.slice(0, 5).map((h, i) => (
                    <View key={i} style={styles.holdingRow}>
                      <Text style={styles.holdingSymbol}>{h.symbol}</Text>
                      <Text style={styles.holdingQty}>{h.holding.toLocaleString()} units</Text>
                      <Text style={styles.holdingVal}>{fmtPKR(h.custody_val)}</Text>
                    </View>
                  ))}
                  {item.holdings_data.length > 5 && <Text style={styles.more}>+{item.holdings_data.length - 5} more</Text>}
                </View>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { marginBottom: 12 },
  date: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  grid: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  fl: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  fv: { fontSize: 14, fontWeight: '600', color: Colors.text },
  holdings: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  holdingsTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  holdingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  holdingSymbol: { width: 70, fontSize: 13, fontWeight: '600', color: Colors.text },
  holdingQty: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  holdingVal: { fontSize: 13, fontWeight: '600', color: Colors.text },
  more: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
