import { ScrollView, View, StyleSheet, RefreshControl, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Button } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { fmtPKR, fmtGL, glColor, pctChange } from '../../utils/currency';
import { MaskedBalance } from '../../components/ui/MaskedBalance';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../stores/authStore';
import { usePinVerification } from '../../hooks/usePinVerification';
import api from '../../services/api';
import { DashboardResponse } from '../../types/api';
import { QUERY_KEYS } from '../../constants/queryKeys';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [amountsVisible, setAmountsVisible] = useState(true);
  const { showPinModal, setShowPinModal, pinInput, setPinInput, verifying, handleVerify } = usePinVerification();

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardResponse>({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  });

  const sendSummary = useMutation({
    mutationFn: () => api.post('/dashboard/send-summary').then((r) => r.data),
    onSuccess: () => Toast.show({ type: 'success', text1: 'Summary Email Sent!' }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to send email' }),
  });

  const m = data?.metrics;

  const metrics = m
    ? [
      { label: 'Banks', value: fmtPKR(m.totalBankBalance), icon: 'bank', color: Colors.primary },
      { label: 'Wallets', value: fmtPKR(m.totalWalletBalance), icon: 'wallet', color: '#8B5CF6' },
      { label: 'Investments', value: fmtPKR(m.totalInvestments), icon: 'trending-up', color: Colors.success },
      { label: 'Assets', value: fmtPKR(m.totalAssetValue), icon: 'home', color: '#F59E0B' },
      { label: 'Receivable', value: fmtPKR(m.totalReceivable), icon: 'arrow-down-circle', color: Colors.success },
      { label: 'Payable', value: fmtPKR(m.totalPayable), icon: 'arrow-up-circle', color: Colors.danger },
      { label: 'Monthly Exp.', value: fmtPKR(m.currentMonthExpenses), icon: 'cash', color: '#F97316' },
      { label: 'Total Exp.', value: fmtPKR(m.totalExpenses), icon: 'receipt', color: '#64748B' },
    ]
    : [];

  const investmentGL = m ? pctChange(m.totalInvestments, m.mutualFundCost + m.stockCost) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerSub}>Your financial overview</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Eye Icon for Amount Privacy */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (amountsVisible) {
                setShowPinModal(true);
              } else {
                setAmountsVisible(true);
              }
            }}
          >
            <MaterialCommunityIcons
              name={amountsVisible ? 'eye' : 'eye-off'}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {/* Email Button */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => sendSummary.mutate()}
            disabled={sendSummary.isPending}
          >
            <MaterialCommunityIcons name="email" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Net Worth Card */}
      <View style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        {isLoading ? (
          <Skeleton width={200} height={36} borderRadius={8} style={{ marginVertical: 8 }} />
        ) : (
          <MaskedBalance value={fmtPKR(m?.netWorth ?? 0)} fontSize={32} color="#fff" />
        )}
        {m && (
          <View style={styles.glRow}>
            <Text style={[styles.glText, { color: investmentGL >= 0 ? '#86EFAC' : '#FCA5A5' }]}>
              Investments: {fmtGL(m.totalInvestments - m.mutualFundCost - m.stockCost)} ({investmentGL.toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      {/* Metrics Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading ? (
          <View style={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="48%" height={80} borderRadius={8} style={{ marginBottom: 4 }} />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {metrics.map((item) => (
              <Card key={item.label} style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={styles.metricValue}>{item.value}</Text>
                <Text style={styles.metricLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* Investment Breakdown */}
      {m && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investments</Text>
          <Card variant="elevated">
            <View style={styles.invRow}>
              <View style={styles.invItem}>
                <Text style={styles.invLabel}>Mutual Funds</Text>
                <Text style={styles.invValue}>{fmtPKR(m.mutualFundValue)}</Text>
                <Text style={[styles.invGL, { color: glColor(m.mutualFundValue - m.mutualFundCost) }]}>
                  {fmtGL(m.mutualFundValue - m.mutualFundCost)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.invItem}>
                <Text style={styles.invLabel}>Stocks (PSX)</Text>
                <Text style={styles.invValue}>{fmtPKR(m.stockValue)}</Text>
                <Text style={[styles.invGL, { color: glColor(m.stockValue - m.stockCost) }]}>
                  {fmtGL(m.stockValue - m.stockCost)}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Asset Allocation */}
      {data?.charts?.assetAllocation && data.charts.assetAllocation.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Allocation</Text>
          <Card variant="elevated">
            {data.charts.assetAllocation.map((item, i) => {
              const total = data.charts.assetAllocation.reduce((a, b) => a + b.value, 0);
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              const colors = [Colors.primary, '#8B5CF6', Colors.success, '#F59E0B', '#F97316', Colors.danger];
              const clr = colors[i % colors.length];
              return (
                <View key={item.name} style={styles.allocRow}>
                  <View style={[styles.allocDot, { backgroundColor: clr }]} />
                  <Text style={styles.allocName}>{item.name}</Text>
                  <Text style={styles.allocPct}>{pct}%</Text>
                  <Text style={styles.allocValue}>{fmtPKR(item.value)}</Text>
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* Monthly Expenses chart data */}
      {data?.charts?.monthlyExpenses && data.charts.monthlyExpenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Expenses</Text>
          <Card variant="elevated">
            {data.charts.monthlyExpenses.map((item) => {
              const max = Math.max(...data.charts.monthlyExpenses.map((e) => e.amount), 1);
              const pct = (item.amount / max) * 100;
              return (
                <View key={item.month} style={styles.barRow}>
                  <Text style={styles.barMonth}>{item.month}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.barValue}>{fmtPKR(item.amount)}</Text>
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* PIN Verification Modal for Amount Privacy */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPinModal(false);
          setPinInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModal}>
            <Text style={styles.pinTitle}>Enter PIN</Text>
            <Text style={styles.pinSubtitle}>Verify PIN to view amounts</Text>

            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="0000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />

            <View style={styles.pinButtonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={async () => {
                  const success = await handleVerify();
                  if (success) {
                    setAmountsVisible(false); // Hide amounts when unlocked
                    setShowPinModal(false);
                  }
                }}
                loading={verifying}
                disabled={!pinInput.trim() || verifying}
                style={{ flex: 1, marginLeft: 12 }}
              >
                {verifying ? '' : 'Verify'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 20,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  headerBtn: { padding: 10, backgroundColor: Colors.primaryTint, borderRadius: 12 },
  netWorthCard: {
    marginHorizontal: 16, marginTop: 20, marginBottom: 24,
    backgroundColor: Colors.primary, borderRadius: 24, padding: 28,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 6,
  },
  netWorthLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 8 },
  glRow: { marginTop: 12 },
  glText: { fontSize: 13, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  metricCard: { width: '48%', padding: 16 },
  metricIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricValue: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  invRow: { flexDirection: 'row', alignItems: 'center' },
  invItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 70, backgroundColor: Colors.border },
  invLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  invValue: { fontSize: 17, fontWeight: '700', color: Colors.text },
  invGL: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  allocRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight ?? '#F1F5F9' },
  allocDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  allocName: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  allocPct: { fontSize: 13, color: Colors.textSecondary, marginRight: 16, width: 40, textAlign: 'right' },
  allocValue: { fontSize: 13, fontWeight: '600', color: Colors.text, width: 100, textAlign: 'right' },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  barMonth: { fontSize: 12, color: Colors.textSecondary, width: 36, fontWeight: '500' },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  barValue: { fontSize: 12, color: Colors.text, fontWeight: '600', width: 90, textAlign: 'right' },

  // PIN Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    width: '80%',
    maxWidth: 320,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  pinSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: Colors.text,
    backgroundColor: Colors.background,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
    fontWeight: '600',
  },
  pinButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
