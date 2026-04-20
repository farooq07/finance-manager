import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput, Button } from 'react-native-paper';
import { BottomDrawer } from '../../components/ui/BottomDrawer';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR } from '../../utils/currency';
import { formatDate, todayISO } from '../../utils/dates';
import { useZakat, useCreateZakat, useDeleteZakat } from '../../hooks/useZakat';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { Skeleton } from '../../components/ui/Skeleton';
import api from '../../services/api';
import { DashboardResponse } from '../../types/api';
import { QUERY_KEYS } from '../../constants/queryKeys';

export default function ZakatScreen() {
  const { data, isLoading, refetch, isRefetching } = useZakat();
  const createZakat = useCreateZakat();
  const deleteZakat = useDeleteZakat();

  // Fetch dashboard data for net worth
  const { data: dashboardData } = useQuery<DashboardResponse>({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  });

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [calculating, setCalculating] = useState(false);

  const handleAdd = async () => {
    if (!amount.trim()) { Toast.show({ type: 'error', text1: 'Amount is required' }); return; }
    try {
      await createZakat.mutateAsync({ amount: parseFloat(amount), description: description.trim() || undefined, date });
      Toast.show({ type: 'success', text1: 'Zakat entry added' });
      setShowModal(false);
      setAmount(''); setDescription(''); setDate(todayISO());
    } catch { Toast.show({ type: 'error', text1: 'Failed to add entry' }); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteZakat.mutate(id) },
    ]);
  };

  // Auto-calculate 2.5% of net worth
  const handleAutoCalculate = async () => {
    if (!dashboardData?.metrics?.netWorth) {
      Toast.show({
        type: 'error',
        text1: 'Unable to calculate',
        text2: 'Net worth data not available',
      });
      return;
    }

    setCalculating(true);
    try {
      // Simulate calculation delay for UX
      await new Promise((resolve) => setTimeout(resolve, 300));

      const netWorth = dashboardData.metrics.netWorth;
      const estimatedZakat = Math.round(netWorth * 0.025); // 2.5% of net worth

      setAmount(estimatedZakat.toString());

      Toast.show({
        type: 'success',
        text1: 'Zakat Calculated',
        text2: `2.5% of Net Worth: ${fmtPKR(estimatedZakat)}`,
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Zakat" showBack />

      {data && (
        <View style={styles.totalBanner}>
          <View>
            <Text style={styles.totalLabel}>This Year's Total</Text>
            <Text style={styles.totalValue}>{fmtPKR(data.currentYearTotal)}</Text>
          </View>
          <View style={styles.totalIcon}>
            <MaterialCommunityIcons name="heart" size={24} color={Colors.success} />
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data?.entries ?? []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="heart-outline" title="No zakat entries" subtitle="Record your zakat payments to track them" />
          }
          renderItem={({ item }) => (
            <Card style={styles.entry}>
              <View style={styles.entryRow}>
                <View style={styles.entryIconWrap}>
                  <MaterialCommunityIcons name="heart" size={20} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryAmount}>{fmtPKR(item.amount)}</Text>
                  <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
                  {item.description && <Text style={styles.entryDesc}>{item.description}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <MaterialCommunityIcons name="trash-can" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      <FAB onPress={() => setShowModal(true)} icon="add" />

      <BottomDrawer visible={showModal} title="Add Zakat" onClose={() => setShowModal(false)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, gap: 12 }}>
              <View style={{ flex: 1 }} />
              <Button
                mode="outlined"
                onPress={handleAutoCalculate}
                loading={calculating}
                disabled={!dashboardData?.metrics?.netWorth || calculating}
              >
                {calculating ? '' : 'Auto Calculate'}
              </Button>
            </View>
            <TextInput
              label="Amount (PKR) *"
              mode="outlined"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
            />
            <TextInput
              label="Date (YYYY-MM-DD)"
              mode="outlined"
              value={date}
              onChangeText={setDate}
              placeholder={todayISO()}
              style={{ marginTop: 12 }}
            />
            <TextInput
              label="Description"
              mode="outlined"
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              style={{ marginTop: 12 }}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={createZakat.isPending}>
              {createZakat.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Add Entry</Text>}
            </TouchableOpacity>
      </BottomDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F0FDF4', borderBottomWidth: 1, borderBottomColor: '#BBF7D0' },
  totalLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  totalValue: { fontSize: 20, fontWeight: '700', color: Colors.success },
  totalIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.success + '20', justifyContent: 'center', alignItems: 'center' },
  entry: { marginBottom: 10, padding: 14 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.success + '15', justifyContent: 'center', alignItems: 'center' },
  entryAmount: { fontSize: 17, fontWeight: '700', color: Colors.success },
  entryDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  entryDesc: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  saveBtn: { backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
