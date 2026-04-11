import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR, fmtGL, glColor } from '../../utils/currency';
import { formatDate, todayISO } from '../../utils/dates';
import { useStocks, useAddStockTransaction } from '../../hooks/useStocks';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';

export default function StockDetailScreen() {
  const { stockId } = useLocalSearchParams<{ stockId: string }>();
  const { data: stocks } = useStocks();
  const addTx = useAddStockTransaction();
  const [showModal, setShowModal] = useState(false);
  const [buyDate, setBuyDate] = useState(todayISO());
  const [buyPrice, setBuyPrice] = useState('');
  const [qty, setQty] = useState('');
  const [brokerage, setBrokerage] = useState('');

  const stock = (stocks ?? []).find((s) => s.id === stockId);
  if (!stock) return <View style={styles.container}><ScreenHeader title="Stock" showBack /></View>;

  const totalQty = stock.transactions.reduce((q, t) => q + t.quantity, 0);
  const cmp = parseFloat(stock.current_market_price);
  const currentValue = cmp * totalQty;
  const totalCost = stock.transactions.reduce((c, t) => c + parseFloat(t.buy_price) * t.quantity + parseFloat(t.brokerage_fee ?? '0'), 0);
  const gl = currentValue - totalCost;
  const avgBuy = totalQty > 0 ? totalCost / totalQty : 0;

  const handleAdd = async () => {
    if (!buyPrice || !qty) return;
    try {
      await addTx.mutateAsync({ stockId: stock.id, buy_date: buyDate, buy_price: parseFloat(buyPrice), quantity: parseInt(qty), brokerage_fee: brokerage ? parseFloat(brokerage) : undefined });
      Toast.show({ type: 'success', text1: 'Transaction added' });
      setShowModal(false);
      setBuyDate(todayISO()); setBuyPrice(''); setQty(''); setBrokerage('');
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to add transaction' });
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={stock.stock_symbol} subtitle={stock.company_name ?? ''} showBack />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <View style={styles.sRow}>
            <View><Text style={styles.sl}>CMP</Text><Text style={styles.sv}>{fmtPKR(cmp)}</Text></View>
            <View><Text style={styles.sl}>Qty</Text><Text style={styles.sv}>{totalQty.toLocaleString()}</Text></View>
            <View><Text style={styles.sl}>Avg Buy</Text><Text style={styles.sv}>{fmtPKR(avgBuy)}</Text></View>
          </View>
          <View style={[styles.sRow, { marginTop: 12 }]}>
            <View><Text style={styles.sl}>Value</Text><Text style={styles.sv}>{fmtPKR(currentValue)}</Text></View>
            <View><Text style={styles.sl}>Cost</Text><Text style={styles.sv}>{fmtPKR(totalCost)}</Text></View>
            <View><Text style={styles.sl}>Gain/Loss</Text><Text style={[styles.sv, { color: glColor(gl) }]}>{fmtGL(gl)}</Text></View>
          </View>
        </View>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Transactions</Text>
      <FlatList
        data={stock.transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" title="No transactions" subtitle="Tap + to add a buy transaction" />}
        renderItem={({ item }) => (
          <Card style={styles.txCard}>
            <View style={styles.txRow}>
              <View>
                <Text style={styles.txDate}>{formatDate(item.buy_date)}</Text>
                <Text style={styles.txDetail}>Qty: {item.quantity.toLocaleString()} @ {fmtPKR(item.buy_price)}</Text>
                {parseFloat(item.brokerage_fee) > 0 && <Text style={styles.txDetail}>Brokerage: {fmtPKR(item.brokerage_fee)}</Text>}
              </View>
              <Text style={styles.txTotal}>{fmtPKR(parseFloat(item.buy_price) * item.quantity)}</Text>
            </View>
          </Card>
        )}
      />

      <FAB onPress={() => setShowModal(true)} />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {[
              { label: 'Buy Date (YYYY-MM-DD)', value: buyDate, onChange: setBuyDate },
              { label: 'Buy Price (PKR)', value: buyPrice, onChange: setBuyPrice, numeric: true },
              { label: 'Quantity', value: qty, onChange: setQty, numeric: true },
              { label: 'Brokerage Fee (optional)', value: brokerage, onChange: setBrokerage, numeric: true },
            ].map((f) => (
              <View key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.onChange}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={addTx.isPending}>
              {addTx.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Transaction</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: { padding: 16 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  sRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sl: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  sv: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, marginBottom: 12 },
  txCard: { marginBottom: 10, padding: 14 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  txDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  txTotal: { fontSize: 15, fontWeight: '700', color: Colors.text },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface, marginBottom: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
