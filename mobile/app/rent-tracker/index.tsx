import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { useRent, useCreateRentPayment, useUpdateRentPayment, useDeleteRentPayment } from '../../hooks/useRent';
import { fmtPKR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { RentEntry } from '../../types/api';
import { AddPaymentForm } from '../../components/rent/AddPaymentForm';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { FAB } from '../../components/ui/FAB';

const CURRENT_YEAR = new Date().getFullYear();

export default function RentTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useRent();
  const createPayment = useCreateRentPayment();
  const updatePayment = useUpdateRentPayment();
  const deletePayment = useDeleteRentPayment();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentEntry | null>(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const entries = data?.entries ?? [];
  const totalReceived = data?.totalReceived ?? 0;

  // Extract unique payers and accounts from entries
  const payers = useMemo(() => {
    const unique = new Set(entries.map((e) => e.payer_name));
    return Array.from(unique).sort();
  }, [entries]);

  const accounts = useMemo(() => {
    const unique = new Set(entries.map((e) => e.account_source));
    return Array.from(unique).sort();
  }, [entries]);

  // Filter entries for selected year
  const yearEntries = useMemo(() => {
    return entries.filter((e) => e.year === selectedYear).sort((a, b) => {
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  }, [entries, selectedYear]);

  // Monthly breakdown for chart
  const monthlyBreakdown = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((month, idx) => {
      const fullMonth = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][idx];
      const total = yearEntries
        .filter((e) => e.month === fullMonth)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      return { month, amount: total };
    });
    return data.filter((d) => d.amount > 0);
  }, [yearEntries]);

  // Year summary
  const yearTotal = useMemo(() => {
    return yearEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  }, [yearEntries]);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => e.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (item: RentEntry) => {
    setEditing(item);
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        await updatePayment.mutateAsync({ id: editing.id, ...data });
        Toast.show({ type: 'success', text1: 'Payment updated' });
      } else {
        await createPayment.mutateAsync(data);
        Toast.show({ type: 'success', text1: 'Payment added' });
      }
      setShowModal(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save payment' });
    }
  };

  const handleDelete = (item: RentEntry) => {
    Alert.alert('Delete Payment', `Remove payment from ${item.payer_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePayment.mutateAsync(item.id);
            Toast.show({ type: 'success', text1: 'Deleted' });
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete' });
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineLarge" style={{ color: Colors.text }}>
          Rent Tracker
        </Text>
        <Text variant="bodyMedium" style={{ color: Colors.textSecondary, marginTop: 4 }}>
          Track monthly rent payments received
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={200} borderRadius={12} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        >
          {/* Metrics Cards */}
          <Card style={styles.metricCard}>
            <Card.Content style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>
                    TOTAL RECEIVED (ALL TIME)
                  </Text>
                  <Text variant="displaySmall" style={{ color: Colors.primary, marginTop: 8 }}>
                    {fmtPKR(totalReceived)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: Colors.textSecondary, marginTop: 4 }}>
                    {entries.length} payments
                  </Text>
                </View>
                <MaterialCommunityIcons name="cash-multiple" size={24} color={Colors.primary} />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.metricCard}>
            <Card.Content style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>
                    {selectedYear} TOTAL
                  </Text>
                  <Text variant="displaySmall" style={{ color: Colors.success, marginTop: 8 }}>
                    {fmtPKR(yearTotal)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: Colors.textSecondary, marginTop: 4 }}>
                    {yearEntries.length} payments
                  </Text>
                </View>
                <MaterialCommunityIcons name="calendar-check" size={24} color={Colors.success} />
              </View>
            </Card.Content>
          </Card>


          {/* Year Selector */}
          <View style={{ marginVertical: 16 }}>
            <Text variant="labelMedium" style={{ color: Colors.textSecondary, marginBottom: 8 }}>
              SELECT YEAR
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => setSelectedYear(year)}
                  style={[
                    styles.yearChip,
                    selectedYear === year && { backgroundColor: Colors.primary },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={{
                      color: selectedYear === year ? Colors.onPrimary : Colors.text,
                    }}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Monthly Breakdown Chart */}
          {monthlyBreakdown.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <Card.Content style={{ padding: 16 }}>
                <Text variant="titleMedium" style={{ marginBottom: 12, color: Colors.text }}>
                  Monthly Breakdown — {selectedYear}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120, paddingBottom: 8 }}>
                  {monthlyBreakdown.map((item) => {
                    const maxAmount = Math.max(...monthlyBreakdown.map((m) => m.amount));
                    const heightPercent = (item.amount / maxAmount) * 100;
                    return (
                      <View key={item.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View
                          style={{
                            width: '100%',
                            height: `${heightPercent}%`,
                            backgroundColor: Colors.primary,
                            borderRadius: 4,
                          }}
                        />
                        <Text variant="labelSmall" style={{ color: Colors.textSecondary }}>
                          {item.month}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Payment Records */}
          <Text variant="titleMedium" style={{ marginBottom: 12, color: Colors.text }}>
            Payment Records — {selectedYear}
          </Text>

          {yearEntries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <EmptyState
                icon="calendar-outline"
                title="No payments recorded"
                subtitle={`No rent payments for ${selectedYear}`}
              />
              <Button mode="contained" onPress={openAdd} style={{ marginTop: 16 }}>
                Add Payment
              </Button>
            </View>
          ) : (
            <View>
              {yearEntries.map((payment) => (
                <View key={payment.id}>
                  <Card style={{ marginBottom: 8 }}>
                    <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Text variant="labelLarge" style={{ color: Colors.text, fontWeight: '600' }}>
                              {payment.month}
                            </Text>
                            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>
                              {formatDate(payment.payment_date)}
                            </Text>
                          </View>

                          <View style={{ marginBottom: 8 }}>
                            <Text variant="bodyMedium" style={{ color: Colors.text, fontWeight: '500' }}>
                              {payment.payer_name}
                            </Text>
                            <Text variant="bodySmall" style={{ color: Colors.textSecondary, marginTop: 2 }}>
                              {payment.account_source}
                            </Text>
                          </View>

                          {payment.notes && (
                            <Text variant="bodySmall" style={{ color: Colors.textTertiary }}>
                              {payment.notes}
                            </Text>
                          )}
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text variant="titleMedium" style={{ color: Colors.success, fontWeight: '600', marginBottom: 8 }}>
                            +{fmtPKR(parseFloat(payment.amount))}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            <Button
                              mode="text"
                              icon="pencil"
                              compact
                              onPress={() => openEdit(payment)}
                              textColor={Colors.primary}
                            >
                              Edit
                            </Button>
                            <Button
                              mode="text"
                              icon="trash-can"
                              compact
                              onPress={() => handleDelete(payment)}
                              textColor={Colors.error}
                            >
                              Delete
                            </Button>
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Button */}
      <FAB
        onPress={openAdd}
        icon="plus"
        style={{ position: 'absolute', bottom: 80, right: 16 }}
      />

      {/* Add Payment Form */}
      <AddPaymentForm
        visible={showModal}
        onDismiss={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        editing={editing}
        payers={payers}
        accounts={accounts}
        isLoading={createPayment.isPending || updatePayment.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginVertical: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
});
