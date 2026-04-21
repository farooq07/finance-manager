import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Colors } from '../../constants/colors';
import { rentSchema } from '../../utils/schemas';
import { RentEntry } from '../../types/api';
import { MONTHS } from '../../constants/categories';
import { BottomDrawer } from '../ui/BottomDrawer';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: any) => Promise<void>;
  editing?: RentEntry | null;
  payers: string[];
  accounts: string[];
  isLoading?: boolean;
}

type RentForm = z.infer<typeof rentSchema>;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 5 + i);
const TODAY = new Date().toISOString().split('T')[0];

export function AddPaymentForm({
  visible,
  onDismiss,
  onSubmit,
  editing,
  payers,
  accounts,
  isLoading,
}: Props) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<RentForm>({
    resolver: zodResolver(rentSchema),
    defaultValues: editing ? {
      month: editing.month,
      year: editing.year,
      payer_name: editing.payer_name,
      amount: parseFloat(editing.amount),
      payment_date: editing.payment_date,
      account_source: editing.account_source,
      notes: editing.notes ?? '',
    } : {
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: CURRENT_YEAR,
      payer_name: '',
      amount: 0,
      payment_date: TODAY,
      account_source: '',
      notes: '',
    },
  });

  const onFormSubmit = async (data: RentForm) => {
    await onSubmit(data);
    reset();
  };

  return (
    <BottomDrawer
      visible={visible}
      title={editing ? 'Edit Payment' : 'Add Payment'}
      onClose={onDismiss}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rent Month */}
        <Text style={styles.label}>Rent Month</Text>
        <Controller
          control={control}
          name="month"
          render={({ field: { value, onChange } }) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {MONTHS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, value === m && styles.chipActive]}
                  onPress={() => onChange(m)}
                >
                  <Text style={[styles.chipText, value === m && styles.chipTextActive]}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        />

        {/* Year */}
        <Text style={styles.label}>Year</Text>
        <Controller
          control={control}
          name="year"
          render={({ field: { value, onChange } }) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.chip, value === y && styles.chipActive]}
                  onPress={() => onChange(y)}
                >
                  <Text style={[styles.chipText, value === y && styles.chipTextActive]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        />

        {/* Received From */}
        <Controller
          control={control}
          name="payer_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Received From (Payer)"
              mode="outlined"
              placeholder="Enter payer name..."
              value={value}
              onChangeText={onChange}
              error={!!errors.payer_name}
              style={{ marginBottom: 4 }}
            />
          )}
        />
        {errors.payer_name && <Text style={styles.err}>{errors.payer_name.message}</Text>}

        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Amount (PKR)"
              mode="outlined"
              placeholder="0"
              keyboardType="decimal-pad"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
              error={!!errors.amount}
              style={{ marginTop: 16, marginBottom: 4 }}
            />
          )}
        />
        {errors.amount && <Text style={styles.err}>{errors.amount.message}</Text>}

        {/* Payment Date */}
        <Controller
          control={control}
          name="payment_date"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Payment Date (YYYY-MM-DD)"
              mode="outlined"
              placeholder={TODAY}
              value={value}
              onChangeText={onChange}
              error={!!errors.payment_date}
              style={{ marginTop: 16, marginBottom: 4 }}
            />
          )}
        />
        {errors.payment_date && <Text style={styles.err}>{errors.payment_date.message}</Text>}

        {/* Account Source */}
        <Controller
          control={control}
          name="account_source"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Received In (Account/Source)"
              mode="outlined"
              placeholder="e.g., Bank Account, Wallet..."
              value={value}
              onChangeText={onChange}
              error={!!errors.account_source}
              style={{ marginTop: 16, marginBottom: 4 }}
            />
          )}
        />
        {errors.account_source && <Text style={styles.err}>{errors.account_source.message}</Text>}

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Notes (Optional)"
              mode="outlined"
              placeholder="Any notes about this payment..."
              value={value ?? ''}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              style={{ marginTop: 16 }}
            />
          )}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit(onFormSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{editing ? 'Update Payment' : 'Add Payment'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 12 },
  err: { color: Colors.error, fontSize: 12, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
