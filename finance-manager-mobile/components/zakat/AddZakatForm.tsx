import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Text as RNText } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Colors } from '../../constants/colors';
import { zakatSchema } from '../../utils/schemas';
import { BottomDrawer } from '../ui/BottomDrawer';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

type ZakatForm = z.infer<typeof zakatSchema>;
const TODAY = new Date().toISOString().split("T")[0];

export function AddZakatForm({ visible, onDismiss, onSubmit, isLoading }: Props) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ZakatForm>({
    resolver: zodResolver(zakatSchema),
    defaultValues: { amount: 0, description: "", date: TODAY },
  });

  const onFormSubmit = async (data: ZakatForm) => {
    await onSubmit(data);
    reset();
  };

  return (
    <BottomDrawer visible={visible} title="Add Zakat Entry" onClose={onDismiss}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Date (YYYY-MM-DD)"
              mode="outlined"
              placeholder={TODAY}
              value={value}
              onChangeText={onChange}
              error={!!errors.date}
              style={{ marginBottom: 4 }}
            />
          )}
        />
        {errors.date && <RNText style={styles.err}>{errors.date.message}</RNText>}

        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Amount (PKR)"
              mode="outlined"
              placeholder="0"
              keyboardType="decimal-pad"
              value={value ? String(value) : ""}
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
              error={!!errors.amount}
              style={{ marginTop: 16, marginBottom: 4 }}
            />
          )}
        />
        {errors.amount && <RNText style={styles.err}>{errors.amount.message}</RNText>}

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Description"
              mode="outlined"
              placeholder="e.g. Paid to charity"
              value={value ?? ""}
              onChangeText={onChange}
              style={{ marginTop: 16 }}
            />
          )}
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit(onFormSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <RNText style={styles.saveBtnText}>Save Entry</RNText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  err: { color: Colors.error, fontSize: 12, marginBottom: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});