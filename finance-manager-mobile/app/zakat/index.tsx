import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { useZakat, useCreateZakat, useDeleteZakat } from '../../hooks/useZakat';
import { useDashboard } from '../../hooks/useDashboard';
import { fmtPKR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { ZakatEntry } from '../../types/api';
import { AddZakatForm } from '../../components/zakat/AddZakatForm';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { FAB } from '../../components/ui/FAB';

const CURRENT_YEAR = new Date().getFullYear();

export default function ZakatScreen() {
  const insets = useSafeAreaInsets();
  const { data: zakatData, isLoading, refetch, isRefetching } = useZakat();
  const { data: dashboardData } = useDashboard();
  const createZakat = useCreateZakat();
  const deleteZakat = useDeleteZakat();
  const [showModal, setShowModal] = useState(false);

  const metrics = dashboardData?.metrics;
  const estimatedZakat = ((metrics?.netWorth ?? 0) - (metrics?.totalReceivable ?? 0)) * 0.025;
  const entries = zakatData?.entries ?? [];
  const currentYearTotal = zakatData?.currentYearTotal ?? 0;
  const currentYearEntries = entries.filter((e) => new Date(e.date).getFullYear() === CURRENT_YEAR);

  const onSubmit = async (data: any) => {
    try {
      await createZakat.mutateAsync(data);
      Toast.show({ type: "success", text1: "Zakat entry added" });
      setShowModal(false);
    } catch {
      Toast.show({ type: "error", text1: "Failed to save" });
    }
  };

  const handleDelete = (item: ZakatEntry) => {
    Alert.alert("Delete", "Remove this entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteZakat.mutateAsync(item.id);
          Toast.show({ type: "success", text1: "Deleted" });
        } catch {
          Toast.show({ type: "error", text1: "Failed" });
        }
      } },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineLarge">Zakat Management</Text>
        <Text variant="bodyMedium" style={{ color: Colors.textSecondary, marginTop: 4 }}>Track contributions</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={120} borderRadius={12} />
          <Skeleton height={120} borderRadius={12} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}>
          <Card style={styles.metricCard}>
            <Card.Content style={{ padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>ESTIMATED (2.5%)</Text>
                  <Text variant="displaySmall" style={{ color: Colors.tertiary }}>{fmtPKR(estimatedZakat)}</Text>
                </View>
                <MaterialCommunityIcons name="calculator" size={28} color={Colors.tertiary} />
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.metricCard, { marginTop: 12 }]}>
            <Card.Content style={{ padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>GIVEN ({CURRENT_YEAR})</Text>
                  <Text variant="displaySmall" style={{ color: Colors.success }}>{fmtPKR(currentYearTotal)}</Text>
                </View>
                <MaterialCommunityIcons name="heart-handshake" size={28} color={Colors.success} />
              </View>
            </Card.Content>
          </Card>

          <View style={{ marginTop: 24 }}>
            <Text variant="titleMedium">Entries ({currentYearEntries.length})</Text>
            {currentYearEntries.length === 0 ? (
              <View style={{ marginVertical: 40 }}>
                <EmptyState icon="heart-outline" title="No entries" subtitle="Add zakat entries" />
              </View>
            ) : (
              currentYearEntries.map((entry) => (
                <Card key={entry.id} style={{ marginBottom: 12 }}>
                  <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{formatDate(entry.date)}</Text>
                        <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{entry.description}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text variant="titleMedium" style={{ color: Colors.success }}>{fmtPKR(parseFloat(entry.amount))}</Text>
                        <Button mode="text" icon="trash-can" compact onPress={() => handleDelete(entry)} textColor={Colors.error}>Delete</Button>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <FAB onPress={() => setShowModal(true)} icon="plus" style={{ position: "absolute", bottom: 80, right: 16 }} />
      <AddZakatForm visible={showModal} onDismiss={() => setShowModal(false)} onSubmit={onSubmit} isLoading={createZakat.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  metricCard: { backgroundColor: Colors.surface },
});