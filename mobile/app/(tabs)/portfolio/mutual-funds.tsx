import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomDrawer } from '../../../components/ui/BottomDrawer';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '../../../constants/colors';
import { fmtPKR, fmtGL, glColor } from '../../../utils/currency';
import { useMutualFunds, useCreateMutualFund, useDeleteMutualFund, useUploadMutualFundCSV } from '../../../hooks/useMutualFunds';
import { mutualFundSchema } from '../../../utils/schemas';
import { z } from 'zod';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FAB } from '../../../components/ui/FAB';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Skeleton } from '../../../components/ui/Skeleton';

type MFForm = z.infer<typeof mutualFundSchema>;

export default function MutualFundsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useMutualFunds();
  const createFund = useCreateMutualFund();
  const deleteFund = useDeleteMutualFund();
  const uploadCSV = useUploadMutualFundCSV();
  const [showModal, setShowModal] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<MFForm>({
    resolver: zodResolver(mutualFundSchema),
    defaultValues: { fund_name: '', fund_symbol: '', units: 0, current_nav: 0, invested_amount: 0 },
  });

  const onSubmit = async (formData: MFForm) => {
    try {
      await createFund.mutateAsync(formData);
      Toast.show({ type: 'success', text1: 'Fund added' });
      setShowModal(false);
      reset();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to add fund' });
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] });
      if (result.canceled) return;
      const file = result.assets[0];
      const fd = new FormData();
      fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'text/csv' } as any);
      await uploadCSV.mutateAsync(fd);
      Toast.show({ type: 'success', text1: 'Portfolio uploaded!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Upload failed' });
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Delete ${name}?`, 'This will remove the fund.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFund.mutate(id) },
    ]);
  };

  const summary = data?.portfolioSummary;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Mutual Funds"
        showBack
        right={
          <TouchableOpacity onPress={handleUpload} style={styles.uploadBtn}>
            {uploadCSV.isPending ? <ActivityIndicator size="small" color={Colors.primary} /> : <MaterialCommunityIcons name="cloud-upload" size={22} color={Colors.primary} />}
          </TouchableOpacity>
        }
      />

      {/* Summary */}
      {summary && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Invested</Text>
            <Text style={styles.summaryValue}>{summary.totalInvestmentPKR}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Current</Text>
            <Text style={styles.summaryValue}>{summary.currentValuePKR}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gain/Loss</Text>
            <Text style={[styles.summaryValue, { color: summary.totalGainLossPKR.startsWith('-') ? Colors.danger : Colors.success }]}>
              {summary.totalGainLossPKR}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={100} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={data?.funds ?? []}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="pie-chart-outline" title="No mutual funds" subtitle="Upload a CSV or add manually" />}
          renderItem={({ item }) => {
            const gl = parseFloat(item.current_value) - parseFloat(item.invested_amount);
            return (
              <Card style={styles.fundCard}>
                <View style={styles.fundHeader}>
                  <View>
                    <Text style={styles.fundName}>{item.fund_name}</Text>
                    <Text style={styles.fundSymbol}>{item.fund_symbol} · {item.status}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.fund_name)}>
                    <MaterialCommunityIcons name="trash-can" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
                <View style={styles.fundGrid}>
                  <View><Text style={styles.fl}>Units</Text><Text style={styles.fv}>{parseFloat(item.units).toLocaleString()}</Text></View>
                  <View><Text style={styles.fl}>NAV</Text><Text style={styles.fv}>{fmtPKR(item.current_nav)}</Text></View>
                  <View><Text style={styles.fl}>Value</Text><Text style={styles.fv}>{fmtPKR(item.current_value)}</Text></View>
                  <View><Text style={styles.fl}>Gain/Loss</Text><Text style={[styles.fv, { color: glColor(gl) }]}>{fmtGL(gl)}</Text></View>
                </View>
              </Card>
            );
          }}
        />
      )}

      <FAB onPress={() => setShowModal(true)} />

      <BottomDrawer visible={showModal} title="Add Mutual Fund" onClose={() => setShowModal(false)}>
            {[
              { name: 'fund_name' as const, label: 'Fund Name', placeholder: 'e.g. Meezan Islamic Fund' },
              { name: 'fund_symbol' as const, label: 'Symbol', placeholder: 'e.g. MIF' },
            ].map((f) => (
              <View key={f.name}>
                <Text style={styles.label}>{f.label}</Text>
                <Controller control={control} name={f.name} render={({ field: { onChange, value } }) => (
                  <View style={[styles.input, errors[f.name] && styles.inputError]}>
                    <Text onPress={() => {}} style={{ color: Colors.textTertiary }}>{/* just a wrapper */}</Text>
                    <TextInputWrapper value={String(value)} onChange={onChange} placeholder={f.placeholder} />
                  </View>
                )} />
                {errors[f.name] && <Text style={styles.err}>{errors[f.name]?.message}</Text>}
              </View>
            ))}
            {[
              { name: 'units' as const, label: 'Units' },
              { name: 'current_nav' as const, label: 'Current NAV (PKR)' },
              { name: 'invested_amount' as const, label: 'Invested Amount (PKR)' },
            ].map((f) => (
              <View key={f.name}>
                <Text style={styles.label}>{f.label}</Text>
                <Controller control={control} name={f.name} render={({ field: { onChange, value } }) => (
                  <TextInputWrapper value={String(value)} onChange={(t) => onChange(parseFloat(t) || 0)} placeholder="0" numeric />
                )} />
                {errors[f.name] && <Text style={styles.err}>{(errors[f.name] as any)?.message}</Text>}
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit(onSubmit)} disabled={createFund.isPending}>
              {createFund.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Fund</Text>}
            </TouchableOpacity>
      </BottomDrawer>
    </View>
  );
}

import { TextInput } from 'react-native';
function TextInputWrapper({ value, onChange, placeholder, numeric }: { value: string; onChange: (t: string) => void; placeholder?: string; numeric?: boolean }) {
  return (
    <TextInput
      style={[{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface, marginBottom: 4 }]}
      value={value === '0' ? '' : value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.textTertiary}
      keyboardType={numeric ? 'numeric' : 'default'}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  uploadBtn: { padding: 8 },
  summary: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  fundCard: { marginBottom: 12 },
  fundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  fundName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  fundSymbol: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  fundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fl: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  fv: { fontSize: 14, fontWeight: '600', color: Colors.text },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginBottom: 4 },
  inputError: { borderColor: Colors.danger },
  err: { color: Colors.danger, fontSize: 12, marginBottom: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
