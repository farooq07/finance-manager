import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, ScrollView, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR } from '../../utils/currency';
import { formatDate, todayISO } from '../../utils/dates';
import { useAssets, useCreateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { ASSET_TYPES } from '../../constants/categories';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { Skeleton } from '../../components/ui/Skeleton';

const ASSET_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Property: 'home-outline',
  Gold: 'diamond-outline',
  Vehicle: 'car-outline',
  Electronics: 'laptop-outline',
  Jewelry: 'sparkles-outline',
  Business: 'briefcase-outline',
  Other: 'cube-outline',
};

export default function AssetsScreen() {
  const { data, isLoading, refetch, isRefetching } = useAssets();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(ASSET_TYPES[0]);
  const [value, setValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) { Toast.show({ type: 'error', text1: 'Asset name is required' }); return; }
    try {
      await createAsset.mutateAsync({
        name,
        type,
        value: value ? parseFloat(value) : undefined,
        purchase_date: purchaseDate.trim() || undefined,
        description: description.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Asset added' });
      setShowModal(false);
      setName(''); setValue(''); setDescription(''); setPurchaseDate('');
      setType(ASSET_TYPES[0]);
    } catch { Toast.show({ type: 'error', text1: 'Failed to add asset' }); }
  };

  const handleDelete = (id: string, assetName: string) => {
    Alert.alert(`Delete ${assetName}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAsset.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Physical Assets" showBack />

      {data && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Value</Text>
          <Text style={styles.totalValue}>{fmtPKR(data.totalValue)}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data?.assets ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="diamond-outline" title="No assets added" subtitle="Add your property, gold, vehicles, etc." />
          }
          renderItem={({ item }) => (
            <Card style={styles.assetCard}>
              <View style={styles.assetRow}>
                <View style={styles.assetIcon}>
                  <Ionicons name={ASSET_ICONS[item.type] ?? 'cube-outline'} size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assetName}>{item.name}</Text>
                  <Text style={styles.assetMeta}>
                    {item.type}{item.purchase_date ? ' · ' + formatDate(item.purchase_date) : ''}
                  </Text>
                  {item.description && <Text style={styles.assetDesc}>{item.description}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.assetValue}>{fmtPKR(item.value)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
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
            <Text style={styles.modalTitle}>Add Asset</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Asset Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. House in Karachi"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {ASSET_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, type === t && styles.chipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Current Value (PKR)</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>Purchase Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="Optional"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={createAsset.isPending}>
              {createAsset.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Add Asset</Text>}
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
  totalValue: { fontSize: 20, fontWeight: '700', color: '#F59E0B' },
  assetCard: { marginBottom: 10 },
  assetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  assetIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  assetName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  assetMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  assetDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  assetValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, marginRight: 8 },
  chipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
