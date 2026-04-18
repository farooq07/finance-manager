import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Colors } from '../../../constants/colors';
import { fmtPKR, fmtGL, glColor } from '../../../utils/currency';
import { useStocks, useCreateStock, useDeleteStock, useSyncStockPrices } from '../../../hooks/useStocks';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FAB } from '../../../components/ui/FAB';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useRouter } from 'expo-router';

export default function StocksScreen() {
  const router = useRouter();
  const { data: stocks, isLoading, refetch, isRefetching } = useStocks();
  const createStock = useCreateStock();
  const deleteStock = useDeleteStock();
  const syncPrices = useSyncStockPrices();

  const [showModal, setShowModal] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleAdd = async () => {
    if (!symbol.trim()) return;
    try {
      await createStock.mutateAsync({ stock_symbol: symbol.toUpperCase(), company_name: companyName || undefined });
      Toast.show({ type: 'success', text1: 'Stock added' });
      setShowModal(false);
      setSymbol(''); setCompanyName('');
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to add stock' });
    }
  };

  const handleSync = async () => {
    try {
      await syncPrices.mutateAsync();
      Toast.show({ type: 'success', text1: 'Prices synced' });
    } catch {
      Toast.show({ type: 'error', text1: 'Sync failed' });
    }
  };

  const handleDelete = (id: string, symbol: string) => {
    Alert.alert(`Delete ${symbol}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteStock.mutate(id) },
    ]);
  };

  const totalValue = (stocks ?? []).reduce((sum, s) => {
    const qty = s.transactions.reduce((q, t) => q + t.quantity, 0);
    return sum + parseFloat(s.current_market_price) * qty;
  }, 0);

  const totalCost = (stocks ?? []).reduce((sum, s) =>
    sum + s.transactions.reduce((c, t) => c + parseFloat(t.buy_price) * t.quantity + parseFloat(t.brokerage_fee ?? '0'), 0), 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Stocks"
        showBack
        right={
          <TouchableOpacity onPress={handleSync} style={styles.syncBtn}>
            {syncPrices.isPending ? <ActivityIndicator size="small" color={Colors.primary} /> : <MaterialCommunityIcons name="sync" size={22} color={Colors.primary} />}
          </TouchableOpacity>
        }
      />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.sl}>Portfolio Value</Text>
          <Text style={styles.sv}>{fmtPKR(totalValue)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sl}>Gain/Loss</Text>
          <Text style={[styles.sv, { color: glColor(totalValue - totalCost) }]}>{fmtGL(totalValue - totalCost)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sl}>Holdings</Text>
          <Text style={styles.sv}>{(stocks ?? []).length}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={100} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={stocks ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="trending-up-outline" title="No stocks added" subtitle="Add your PSX stocks to track them" />}
          renderItem={({ item }) => {
            const qty = item.transactions.reduce((q, t) => q + t.quantity, 0);
            const cmp = parseFloat(item.current_market_price);
            const value = cmp * qty;
            const cost = item.transactions.reduce((c, t) => c + parseFloat(t.buy_price) * t.quantity, 0);
            const gl = value - cost;
            return (
              <TouchableOpacity onPress={() => router.push({ pathname: '/stocks/[stockId]', params: { stockId: item.id } })} activeOpacity={0.8}>
                <Card style={styles.stockCard}>
                  <View style={styles.stockHeader}>
                    <View>
                      <Text style={styles.symbol}>{item.stock_symbol}</Text>
                      <Text style={styles.company}>{item.company_name ?? '—'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.stock_symbol)}>
                      <MaterialCommunityIcons name="trash-can" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.stockGrid}>
                    <View><Text style={styles.fl}>Qty</Text><Text style={styles.fv}>{qty.toLocaleString()}</Text></View>
                    <View><Text style={styles.fl}>CMP</Text><Text style={styles.fv}>{fmtPKR(cmp)}</Text></View>
                    <View><Text style={styles.fl}>Value</Text><Text style={styles.fv}>{fmtPKR(value)}</Text></View>
                    <View><Text style={styles.fl}>G/L</Text><Text style={[styles.fv, { color: glColor(gl) }]}>{fmtGL(gl)}</Text></View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <FAB onPress={() => setShowModal(true)} />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Stock</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              label="Stock Symbol"
              mode="outlined"
              value={symbol}
              onChangeText={(t) => setSymbol(t.toUpperCase())}
              placeholder="e.g. ENGRO"
              autoCapitalize="characters"
            />
            <TextInput
              label="Company Name (optional)"
              mode="outlined"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="e.g. Engro Corporation"
              style={{ marginTop: 16 }}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={createStock.isPending}>
              {createStock.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Stock</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  syncBtn: { padding: 8 },
  summary: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  sl: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  sv: { fontSize: 13, fontWeight: '700', color: Colors.text },
  stockCard: { marginBottom: 12 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  symbol: { fontSize: 17, fontWeight: '700', color: Colors.text },
  company: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  stockGrid: { flexDirection: 'row', gap: 16 },
  fl: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  fv: { fontSize: 14, fontWeight: '600', color: Colors.text },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface, marginBottom: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
