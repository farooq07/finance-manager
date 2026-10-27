import { ScrollView, View } from 'react-native';
import { Chip, Text, tokens, useTheme } from '../../ui';

export type ColumnField = 'date' | 'description' | 'amount' | 'debit' | 'credit' | 'balance' | 'type';
export type ColumnMapping = Record<ColumnField, number>;

const FIELDS: { key: ColumnField; label: string; hint: string }[] = [
    { key: 'date', label: 'Date', hint: 'Required' },
    { key: 'description', label: 'Description', hint: 'What the transaction was' },
    { key: 'amount', label: 'Amount', hint: 'One column, money out shown as minus — or use Debit and Credit' },
    { key: 'debit', label: 'Debit (money out)', hint: 'If out and in are separate columns' },
    { key: 'credit', label: 'Credit (money in)', hint: 'If out and in are separate columns' },
    { key: 'balance', label: 'Balance', hint: 'Optional — helps check nothing was missed' },
    { key: 'type', label: 'Type (Dr/Cr)', hint: 'Optional — only when Amount has no minus sign' },
];

/** The same rules the server applies before importing a mapped CSV. */
export function mappingProblem(m: ColumnMapping): string | null {
    if (m.date < 0) return 'Pick the Date column.';
    if (m.amount < 0 && m.debit < 0 && m.credit < 0) return 'Pick an Amount column, or the Debit and Credit columns.';
    return null;
}

/** Pick which column of the CSV holds each field, checking against a sample row. */
export function ColumnMapper({ headers, sampleRows, value, onChange }: {
    headers: string[]; sampleRows: string[][]; value: ColumnMapping; onChange: (m: ColumnMapping) => void;
}) {
    const { colors } = useTheme();
    const sample = (idx: number) => sampleRows.map((r) => r[idx]).find((v) => v != null && String(v).trim() !== '');
    const columnName = (h: string, i: number) => (h && h.trim() ? h.trim() : `Column ${i + 1}`);

    return (
        <View style={{ gap: tokens.space.lg }}>
            {FIELDS.map((f) => {
                const chosen = value[f.key];
                return (
                    <View key={f.key} style={{ gap: tokens.space.xs }}>
                        <Text variant="label">{f.label}</Text>
                        <Text variant="caption">{f.hint}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.space.sm }}>
                            <Chip label="None" selected={chosen < 0} onPress={() => onChange({ ...value, [f.key]: -1 })} />
                            {headers.map((h, i) => (
                                <Chip key={`${f.key}-${i}`} label={columnName(h, i)} selected={chosen === i} onPress={() => onChange({ ...value, [f.key]: i })} />
                            ))}
                        </ScrollView>
                        {chosen >= 0 && (
                            <Text variant="caption" style={{ color: colors.textMuted }}>
                                e.g. {sample(chosen) ?? '(empty in the first rows)'}
                            </Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
}
