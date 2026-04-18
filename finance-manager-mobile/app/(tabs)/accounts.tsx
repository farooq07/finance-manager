import { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Alert, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR } from '../../utils/currency';
import { useBanks, useCreateBank, useDeleteBank } from '../../hooks/useBanks';
import { useWallets, useCreateWallet, useDeleteWallet } from '../../hooks/useWallets';
import { Card } from '../../components/ui/Card';
import { MaskedBalance } from '../../components/ui/MaskedBalance';
import { Skeleton } from '../../components/ui/Skeleton';

const WALLET_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const { data: banks, isLoading: banksLoading, refetch: banksRefetch, isRefetching: banksRefetching } = useBanks();
  const { data: wallets, isLoading: walletsLoading, refetch: walletsRefetch, isRefetching: walletsRefetching } = useWallets();
  const createBank = useCreateBank();
  const deleteBank = useDeleteBank();
  const createWallet = useCreateWallet();
  const deleteWallet = useDeleteWallet();

  const [showBankModal, setShowBankModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Bank form
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [iban, setIban] = useState('');
  const [startBalance, setStartBalance] = useState('0');

  // Wallet form
  const [walletName, setWalletName] = useState('');
  const [institution, setInstitution] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [accountNum, setAccountNum] = useState('');

  const isLoading = banksLoading || walletsLoading;
  const isRefetching = banksRefetching || walletsRefetching;

  const totalBankBalance = (banks ?? []).reduce((s, b) => s + parseFloat(b.current_balance), 0);
  const totalWalletBalance = (wallets ?? []).reduce((s, w) => s + parseFloat(w.balance), 0);
  const grandTotal = totalBankBalance + totalWalletBalance;

  const handleAddBank = async () => {
    if (!bankName.trim() || !accountNo.trim() || !iban.trim()) {
      Toast.show({ type: 'error', text1: 'Bank name, account no, and IBAN are required' });
      return;
    }
    try {
      await createBank.mutateAsync({ name: bankName, account_no: accountNo, iban_no: iban, starting_balance: parseFloat(startBalance) || 0 });
      Toast.show({ type: 'success', text1: 'Bank added' });
      setShowBankModal(false);
      setBankName(''); setAccountNo(''); setIban(''); setStartBalance('0');
    } catch { Toast.show({ type: 'error', text1: 'Failed to add bank' }); }
  };

  const handleAddWallet = async () => {
    if (!walletName.trim() || !institution.trim()) {
      Toast.show({ type: 'error', text1: 'Name and institution are required' });
      return;
    }
    try {
      await createWallet.mutateAsync({ name: walletName, institution, balance: parseFloat(walletBalance) || 0, account_num: accountNum || undefined });
      Toast.show({ type: 'success', text1: 'Wallet added' });
      setShowWalletModal(false);
      setWalletName(''); setInstitution(''); setWalletBalance('0'); setAccountNum('');
    } catch { Toast.show({ type: 'error', text1: 'Failed to add wallet' }); }
  };

  const confirmDeleteBank = (id: string, name: string) =>
    Alert.alert(`Delete ${name}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBank.mutate(id) },
    ]);

  const confirmDeleteWallet = (id: string, name: string) =>
    Alert.alert(`Delete ${name}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWallet.mutate(id) },
    ]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowBankModal(true)}>
            <MaterialCommunityIcons name="bank" size={15} color={Colors.primary} />
            <Text style={styles.addBtnText}>Bank</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowWalletModal(true)}>
            <MaterialCommunityIcons name="wallet" size={15} color={Colors.primary} />
            <Text style={styles.addBtnText}>Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Total card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Balance</Text>
        <MaskedBalance value={fmtPKR(grandTotal)} fontSize={28} color="#fff" />
        <View style={styles.totalSubRow}>
          <Text style={styles.totalSub}>Banks: {fmtPKR(totalBankBalance)}</Text>
          <Text style={styles.totalSub}>Wallets: {fmtPKR(totalWalletBalance)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { banksRefetch(); walletsRefetch(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Banks */}
        <Text style={styles.sectionTitle}>Banks</Text>
        {isLoading ? (
          <Skeleton height={76} borderRadius={12} style={{ marginBottom: 10 }} />
        ) : (banks ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No banks added yet</Text>
        ) : (
          (banks ?? []).map((bank) => (
            <Card key={bank.id} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={styles.iconWrap}>
                  <Ionicons name="business-outline" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{bank.name}</Text>
                  <Text style={styles.accountSub}>•••• {bank.account_no.slice(-4)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <MaskedBalance value={fmtPKR(bank.current_balance)} fontSize={15} />
                  <TouchableOpacity onPress={() => confirmDeleteBank(bank.id, bank.name)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}

        {/* Wallets */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Wallets</Text>
        {isLoading ? (
          <Skeleton height={76} borderRadius={12} />
        ) : (wallets ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No wallets added yet</Text>
        ) : (
          (wallets ?? []).map((wallet, i) => {
            const clr = wallet.color_theme || WALLET_COLORS[i % WALLET_COLORS.length];
            return (
              <Card key={wallet.id} style={[styles.accountCard, { borderLeftColor: clr, borderLeftWidth: 4 }]}>
                <View style={styles.accountRow}>
                  <View style={[styles.iconWrap, { backgroundColor: clr + '20' }]}>
                    <Ionicons name="wallet-outline" size={20} color={clr} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>{wallet.name}</Text>
                    <Text style={styles.accountSub}>{wallet.institution}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <MaskedBalance value={fmtPKR(wallet.balance)} fontSize={15} />
                    <TouchableOpacity onPress={() => confirmDeleteWallet(wallet.id, wallet.name)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Bank Modal */}
      <Modal visible={showBankModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBankModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Bank</Text>
            <TouchableOpacity onPress={() => setShowBankModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {[
              { label: 'Bank Name *', value: bankName, onChange: setBankName, placeholder: 'e.g. HBL' },
              { label: 'Account Number *', value: accountNo, onChange: setAccountNo, placeholder: '1234567890' },
              { label: 'IBAN *', value: iban, onChange: setIban, placeholder: 'PK00XXXX...' },
              { label: 'Starting Balance', value: startBalance, onChange: setStartBalance, placeholder: '0', numeric: true },
            ].map((f) => (
              <View key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddBank} disabled={createBank.isPending}>
              {createBank.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Bank</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Wallet Modal */}
      <Modal visible={showWalletModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowWalletModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Wallet</Text>
            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {[
              { label: 'Name *', value: walletName, onChange: setWalletName, placeholder: 'e.g. JazzCash' },
              { label: 'Institution *', value: institution, onChange: setInstitution, placeholder: 'e.g. Jazz' },
              { label: 'Balance', value: walletBalance, onChange: setWalletBalance, placeholder: '0', numeric: true },
              { label: 'Account Number', value: accountNum, onChange: setAccountNum, placeholder: 'Optional' },
            ].map((f) => (
              <View key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddWallet} disabled={createWallet.isPending}>
              {createWallet.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Wallet</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  headerBtns: { flexDirection: 'row', gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.primary },
  addBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  totalCard: { margin: 16, backgroundColor: Colors.primary, borderRadius: 20, padding: 20, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  totalSubRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  totalSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, marginBottom: 12 },
  accountCard: { marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  accountName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  accountSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
