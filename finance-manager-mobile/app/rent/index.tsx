import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, ScrollView, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR } from '../../utils/currency';
import { formatDate, todayISO } from '../../utils/dates';
import { useRent, useCreateRent, useDeleteRent } from '../../hooks/useRent';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { Skeleton } from '../../components/ui/Skeleton';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function RentScreen() {
  const { data, isLoading, refetch, isRefetching } = useRent();
  const createRent = useCreateRent();
  const deleteRent = useDeleteRent();

  // Refetch data when screen comes into focus (mobile UX improvement)
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [showModal, setShowModal] = useState(false);
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!payer.trim() || !amount.trim()) {
      Toast.show({ type: 'error', text1: 'Payer name and amount are required' });
      return;
    }
    try {
      await createRent.mutateAsync({
        month,
        year: parseInt(year) || new Date().getFullYear(),
        payer_name: payer,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        account_source: source.trim() || 'Cash',
        notes: notes.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Rent entry added' });
      setShowModal(false);
      setPayer(''); setAmount(''); setSource(''); setNotes('');
      setPaymentDate(todayISO());
    } catch { Toast.show({ type: 'error', text1: 'Failed to add entry' }); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry?', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRent.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Rental Income" showBack />

      {data && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Received</Text>
          <Text style={styles.totalValue}>{fmtPKR(data.totalReceived)}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={80} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data?.entries ?? []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="home-outline" title="No rent entries" subtitle="Tap + to record a rent payment" />
          }
          renderItem={({ item }) => (
            <Card style={styles.entryCard}>
              <View style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryPayer}>{item.payer_name}</Text>
                  <Text style={styles.entryMeta}>
                    {item.month} {item.year} · {formatDate(item.payment_date)}
                  </Text>
                  <Text style={styles.entrySource}>{item.account_source}</Text>
                  {item.notes && <Text style={styles.entryNotes}>{item.notes}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={styles.entryAmount}>{fmtPKR(item.amount)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <MaterialCommunityIcons name="trash-can" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <FAB onPress={() => setShowModal(true)} />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Rent Entry</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {MONTHS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, month === m && styles.chipActive]}
                  onPress={() => setMonth(m)}
                >
                  <Text style={[styles.chipText, month === m && styles.chipTextActive]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {[
              { label: 'Year', value: year, onChange: setYear, numeric: true },
              { label: 'Payer Name *', value: payer, onChange: setPayer },
              { label: 'Amount (PKR) *', value: amount, onChange: setAmount, numeric: true },
              { label: 'Payment Date (YYYY-MM-DD)', value: paymentDate, onChange: setPaymentDate },
              { label: 'Account Source', value: source, onChange: setSource, placeholder: 'e.g. HBL, JazzCash' },
              { label: 'Notes', value: notes, onChange: setNotes, placeholder: 'Optional' },
            ].map((f, idx) => (
              <TextInput
                key={f.label}
                label={f.label}
                mode="outlined"
                value={f.value}
                onChangeText={f.onChange}
                keyboardType={f.numeric ? 'numeric' : 'default'}
                placeholder={f.placeholder ?? ''}
                style={{ marginTop: idx === 0 ? 12 : 16 }}
              />
            ))}

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={createRent.isPending}>
              {createRent.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Add Entry</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  entryCard: { marginBottom: 10 },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryPayer: { fontSize: 15, fontWeight: '600', color: Colors.text },
  entryMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  entrySource: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  entryNotes: { fontSize: 12, color: Colors.textTertiary, marginTop: 2, fontStyle: 'italic' },
  entryAmount: { fontSize: 16, fontWeight: '700', color: Colors.success },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, marginRight: 8 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
