import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR } from '../../utils/currency';
import { formatDate, todayISO } from '../../utils/dates';
import { useDuesPerson, useAddDuesTransaction } from '../../hooks/useDues';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { Skeleton } from '../../components/ui/Skeleton';

export default function PersonLedgerScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person, isLoading, refetch, isRefetching } = useDuesPerson(personId);
  const addTx = useAddDuesTransaction();

  const [showModal, setShowModal] = useState(false);
  const [txType, setTxType] = useState<'receivable' | 'payable'>('receivable');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    if (!amount.trim()) { Toast.show({ type: 'error', text1: 'Amount is required' }); return; }
    try {
      await addTx.mutateAsync({
        personId,
        transaction_type: txType,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Transaction added' });
      setShowModal(false);
      setAmount(''); setDescription('');
    } catch { Toast.show({ type: 'error', text1: 'Failed to add transaction' }); }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={person?.name ?? 'Person'}
        subtitle={person?.email ?? ''}
        showBack
      />

      {person && (
        <View style={[styles.balanceCard, { backgroundColor: person.netBalance >= 0 ? Colors.success : Colors.danger }]}>
          <Text style={styles.balanceLabel}>Net Balance</Text>
          <Text style={styles.balanceValue}>
            {person.netBalance >= 0 ? '+' : ''}{fmtPKR(person.netBalance)}
          </Text>
          <Text style={styles.balanceHint}>
            {person.netBalance >= 0 ? `${person.name} owes you` : `You owe ${person.name}`}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={72} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={person?.transactions ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="swap-horizontal-outline" title="No transactions" subtitle="Tap + to add the first transaction" />
          }
          renderItem={({ item }) => (
            <Card style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={[
                  styles.txIcon,
                  { backgroundColor: item.transaction_type === 'receivable' ? Colors.success + '20' : Colors.danger + '20' },
                ]}>
                  <Ionicons
                    name={item.transaction_type === 'receivable' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={item.transaction_type === 'receivable' ? Colors.success : Colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>
                    {item.description ?? (item.transaction_type === 'receivable' ? 'Receivable' : 'Payable')}
                  </Text>
                  <Text style={styles.txDate}>{formatDate(item.transaction_date)}</Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  { color: item.transaction_type === 'receivable' ? Colors.success : Colors.danger },
                ]}>
                  {item.transaction_type === 'receivable' ? '+' : '-'}{fmtPKR(item.amount)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}

      <FAB onPress={() => setShowModal(true)} />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {(['receivable', 'payable'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    { borderColor: t === 'receivable' ? Colors.success : Colors.danger },
                    txType === t && { backgroundColor: t === 'receivable' ? Colors.success : Colors.danger },
                  ]}
                  onPress={() => setTxType(t)}
                >
                  <Text style={[styles.typeBtnText, txType === t && { color: '#fff' }]}>
                    {t === 'receivable' ? 'They owe me' : 'I owe them'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Amount (PKR) *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional note"
              placeholderTextColor={Colors.textTertiary}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={addTx.isPending}>
              {addTx.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Add Transaction</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  balanceCard: { margin: 16, borderRadius: 16, padding: 20, alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  balanceValue: { fontSize: 30, fontWeight: '700', color: '#fff' },
  balanceHint: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  txCard: { marginBottom: 10, padding: 14 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: Colors.text },
  txDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
