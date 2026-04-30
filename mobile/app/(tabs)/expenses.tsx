import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { BottomDrawer } from '../../components/ui/BottomDrawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import { expenseSchema } from '../../utils/schemas';
import { fmtPKR } from '../../utils/currency';
import { formatDate, todayISO } from '../../utils/dates';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { Expense } from '../../types/api';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { FAB } from '../../components/ui/FAB';

type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { data: expenses, isLoading, refetch, isRefetching } = useExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [search, setSearch] = useState('');

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: 0, category: '', expense_date: todayISO(), payment_method: '', notes: '' },
  });

  const openAdd = () => {
    setEditing(null);
    reset({ amount: 0, category: '', expense_date: todayISO(), payment_method: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (item: Expense) => {
    setEditing(item);
    reset({
      amount: parseFloat(item.amount),
      category: item.category,
      expense_date: item.expense_date,
      payment_method: item.payment_method ?? '',
      notes: item.notes ?? '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: ExpenseForm) => {
    try {
      if (editing) {
        await updateExpense.mutateAsync({ id: editing.id, ...data });
        Toast.show({ type: 'success', text1: 'Expense updated' });
      } else {
        await createExpense.mutateAsync(data);
        Toast.show({ type: 'success', text1: 'Expense added' });
      }
      setShowModal(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save expense' });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense.mutateAsync(id);
            Toast.show({ type: 'success', text1: 'Deleted' });
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete' });
          }
        },
      },
    ]);
  };

  const filtered = (expenses ?? []).filter((e) => {
    const matchCat = filterCategory === 'All' || e.category === filterCategory;
    const matchSearch = e.category.toLowerCase().includes(search.toLowerCase()) || (e.notes ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const categoryIcon = (cat: string) => EXPENSE_CATEGORIES.find((c) => c.name === cat)?.icon ?? 'ellipsis-horizontal-outline';
  const categoryColor = (cat: string) => EXPENSE_CATEGORIES.find((c) => c.name === cat)?.color ?? Colors.textSecondary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <Text style={styles.total}>{fmtPKR(total)}</Text>
      </View>

      {/* Search */}
      <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <TextInput
          label="Search expenses..."
          mode="outlined"
          placeholder="Search expenses..."
          value={search}
          onChangeText={setSearch}
          left={<TextInput.Icon icon="magnify" />}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {['All', ...EXPENSE_CATEGORIES.map((c) => c.name)].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
            onPress={() => setFilterCategory(cat)}
          >
            <Text style={[styles.filterText, filterCategory === cat && styles.filterTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={72} borderRadius={12} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No expenses found" subtitle="Tap + to add your first expense" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => openEdit(item)} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: categoryColor(item.category) + '20' }]}>
                <MaterialCommunityIcons name={categoryIcon(item.category) as any} size={20} color={categoryColor(item.category)} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowCat}>{item.category}</Text>
                <Text style={styles.rowDate}>{formatDate(item.expense_date)} · {item.payment_method ?? 'Cash'}</Text>
                {item.notes ? <Text style={styles.rowNotes} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>{fmtPKR(item.amount)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <MaterialCommunityIcons name="trash-can" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <FAB onPress={openAdd} />

      {/* Add/Edit Drawer */}
      <BottomDrawer
        visible={showModal}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        onClose={() => setShowModal(false)}
      >
        <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
          <TextInput
            label="Amount (PKR)"
            mode="outlined"
            placeholder="0"
            keyboardType="numeric"
            value={value ? String(value) : ''}
            onChangeText={(t) => onChange(parseFloat(t) || 0)}
            error={!!errors.amount}
          />
        )} />
        {errors.amount && <Text style={styles.err}>{errors.amount.message}</Text>}

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <Controller key={cat.name} control={control} name="category" render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[styles.catChip, value === cat.name && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => onChange(cat.name)}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={14} color={value === cat.name ? '#fff' : cat.color} />
                <Text style={[styles.catChipText, value === cat.name && { color: '#fff' }]}>{cat.name}</Text>
              </TouchableOpacity>
            )} />
          ))}
        </ScrollView>
        {errors.category && <Text style={styles.err}>{errors.category.message}</Text>}

        <Controller control={control} name="expense_date" render={({ field: { onChange, value } }) => (
          <TextInput
            label="Date (YYYY-MM-DD)"
            mode="outlined"
            placeholder={todayISO()}
            value={value}
            onChangeText={onChange}
            error={!!errors.expense_date}
            style={{ marginTop: 16 }}
          />
        )} />

        <Text style={styles.label}>Payment Method</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
          {PAYMENT_METHODS.map((m) => (
            <Controller key={m} control={control} name="payment_method" render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[styles.filterChip, value === m && styles.filterChipActive]}
                onPress={() => onChange(m)}
              >
                <Text style={[styles.filterText, value === m && styles.filterTextActive]}>{m}</Text>
              </TouchableOpacity>
            )} />
          ))}
        </ScrollView>

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <TextInput
            label="Notes"
            mode="outlined"
            placeholder="Optional notes..."
            value={value ?? ''}
            onChangeText={onChange}
            multiline
            numberOfLines={4}
            style={{ marginTop: 16 }}
          />
        )} />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit(onSubmit)}
          disabled={createExpense.isPending || updateExpense.isPending}
        >
          {(createExpense.isPending || updateExpense.isPending)
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Expense'}</Text>}
        </TouchableOpacity>
      </BottomDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  total: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.text },
  filterBar: { flexGrow: 0, flexShrink: 0, marginBottom: 8, paddingVertical: 4 },
  filterChip: { minHeight: 36, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  rowIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowInfo: { flex: 1 },
  rowCat: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowNotes: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowAmount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  deleteBtn: { padding: 4 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.surface, marginBottom: 4 },
  inputError: { borderColor: Colors.danger },
  err: { color: Colors.danger, fontSize: 12, marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  catChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
