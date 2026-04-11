import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors } from '../../../constants/colors';
import { fmtPKR } from '../../../utils/currency';
import { formatDate } from '../../../utils/dates';
import { useMutualFundSnapshots } from '../../../hooks/useMutualFunds';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function MutualFundSnapshotsScreen() {
  const { data, isLoading, refetch, isRefetching } = useMutualFundSnapshots();

  return (
    <View style={styles.container}>
      <ScreenHeader title="MF Snapshots" showBack />
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={100} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="albums-outline" title="No snapshots yet" subtitle="Upload a CSV to create snapshots" />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.date}>{formatDate(item.upload_date)}</Text>
              </View>
              <View style={styles.grid}>
                <View><Text style={styles.fl}>Invested</Text><Text style={styles.fv}>{fmtPKR(item.total_invested)}</Text></View>
                <View><Text style={styles.fl}>Current Value</Text><Text style={styles.fv}>{fmtPKR(item.total_value)}</Text></View>
                <View><Text style={styles.fl}>Gain</Text>
                  <Text style={[styles.fv, { color: parseFloat(item.total_gain) >= 0 ? Colors.success : Colors.danger }]}>
                    {fmtPKR(item.total_gain)}
                  </Text>
                </View>
              </View>
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
  row: { marginBottom: 10 },
  date: { fontSize: 15, fontWeight: '700', color: Colors.text },
  grid: { flexDirection: 'row', gap: 20 },
  fl: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  fv: { fontSize: 14, fontWeight: '600', color: Colors.text },
});
