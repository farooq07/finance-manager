import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { useBrokers, useCreateBroker, useDeleteBroker } from '../../hooks/useBrokers';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';

export default function BrokerScreen() {
  const { data: brokers, isLoading } = useBrokers();
  const createBroker = useCreateBroker();
  const deleteBroker = useDeleteBroker();

  const [showModal, setShowModal] = useState(false);
  const [accountTitle, setAccountTitle] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [participantAccNo, setParticipantAccNo] = useState('');
  const [cdcSubAccNo, setCdcSubAccNo] = useState('');
  const [stockPinCode, setStockPinCode] = useState('');

  const handleAdd = async () => {
    if (!accountTitle.trim() || !clientCode.trim()) {
      Toast.show({ type: 'error', text1: 'Account title and client code are required' });
      return;
    }
    try {
      await createBroker.mutateAsync({
        account_title: accountTitle,
        client_code: clientCode,
        participant_acc_no: participantAccNo.trim() || undefined,
        cdc_sub_acc_no: cdcSubAccNo.trim() || undefined,
        stock_pin_code: stockPinCode.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Broker account saved' });
      setShowModal(false);
      setAccountTitle(''); setClientCode(''); setParticipantAccNo('');
      setCdcSubAccNo(''); setStockPinCode('');
    } catch { Toast.show({ type: 'error', text1: 'Failed to save broker account' }); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Broker Account?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBroker.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Broker Account" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {!isLoading && (brokers ?? []).length === 0 && (
          <EmptyState icon="briefcase-outline" title="No broker account" subtitle="Add your CDC/broker account details" />
        )}

        {(brokers ?? []).map((b) => (
          <Card key={b.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="briefcase-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{b.account_title}</Text>
                <Text style={styles.cardSub}>Client Code: {b.client_code}</Text>
                {b.participant_acc_no && <Text style={styles.cardSub}>Participant: {b.participant_acc_no}</Text>}
                {b.cdc_sub_acc_no && <Text style={styles.cardSub}>CDC Sub: {b.cdc_sub_acc_no}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(b.id)}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <FAB onPress={() => setShowModal(true)} />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Broker Account</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {[
              { label: 'Account Title *', value: accountTitle, onChange: setAccountTitle, placeholder: 'e.g. Farooq - Arif Habib' },
              { label: 'Client Code *', value: clientCode, onChange: setClientCode, placeholder: 'e.g. AH12345' },
              { label: 'Participant Account No', value: participantAccNo, onChange: setParticipantAccNo, placeholder: 'Optional' },
              { label: 'CDC Sub Account No', value: cdcSubAccNo, onChange: setCdcSubAccNo, placeholder: 'Optional' },
              { label: 'Stock PIN Code', value: stockPinCode, onChange: setStockPinCode, placeholder: 'Optional' },
            ].map((f) => (
              <View key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={createBroker.isPending}>
              {createBroker.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Account</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
