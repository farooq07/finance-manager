import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import { BottomDrawer } from '../../components/ui/BottomDrawer';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR } from '../../utils/currency';
import { useDues, useCreateDuesPerson, useDeleteDuesPerson } from '../../hooks/useDues';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { Skeleton } from '../../components/ui/Skeleton';

export default function DuesScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useDues();
  const createPerson = useCreateDuesPerson();
  const deletePerson = useDeleteDuesPerson();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const totalReceivable = (data ?? [])
    .filter((d) => d.netBalance > 0)
    .reduce((s, d) => s + d.netBalance, 0);
  const totalPayable = (data ?? [])
    .filter((d) => d.netBalance < 0)
    .reduce((s, d) => s + Math.abs(d.netBalance), 0);

  const handleAdd = async () => {
    if (!name.trim()) { Toast.show({ type: 'error', text1: 'Name is required' }); return; }
    try {
      await createPerson.mutateAsync({ name, email: email.trim() || undefined });
      Toast.show({ type: 'success', text1: 'Person added' });
      setShowModal(false);
      setName(''); setEmail('');
    } catch { Toast.show({ type: 'error', text1: 'Failed to add person' }); }
  };

  const handleDelete = (id: string, personName: string) => {
    Alert.alert(`Delete ${personName}?`, 'This will remove all dues for this person.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePerson.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dues Ledger" showBack />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.sl}>Total Receivable</Text>
          <Text style={[styles.sv, { color: Colors.success }]}>{fmtPKR(totalReceivable)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.sl}>Total Payable</Text>
          <Text style={[styles.sv, { color: Colors.danger }]}>{fmtPKR(totalPayable)}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={80} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No people added" subtitle="Tap + to add a person and track dues" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/dues/[personId]', params: { personId: item.id } })}
              activeOpacity={0.8}
            >
              <Card style={styles.personCard}>
                <View style={styles.personRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personSub}>
                      {item.email ?? `${item.transactions.length} transactions`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.balance, { color: item.netBalance >= 0 ? Colors.success : Colors.danger }]}>
                      {item.netBalance >= 0 ? '+' : ''}{fmtPKR(item.netBalance)}
                    </Text>
                    <Text style={styles.balanceLabel}>{item.netBalance >= 0 ? 'owes you' : 'you owe'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={{ marginLeft: 8 }}>
                    <MaterialCommunityIcons name="trash-can" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      <FAB onPress={() => setShowModal(true)} />

      <BottomDrawer visible={showModal} title="Add Person" onClose={() => setShowModal(false)}>
            <TextInput
              label="Name *"
              mode="outlined"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ahmad"
            />
            <TextInput
              label="Email (optional)"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginTop: 16 }}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={createPerson.isPending}>
              {createPerson.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Add Person</Text>}
            </TouchableOpacity>
      </BottomDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  sl: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  sv: { fontSize: 16, fontWeight: '700' },
  personCard: { marginBottom: 10 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  personName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  personSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  balance: { fontSize: 15, fontWeight: '700' },
  balanceLabel: { fontSize: 11, color: Colors.textSecondary },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
