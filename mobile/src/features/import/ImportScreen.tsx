import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { isAxiosError } from 'axios';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { commitStatement, deleteStatement, previewStatement, type AccountKind, type CommitResult, type PickedFile, type Preview } from '../../api/money';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, EmptyState, Field, ListRow, Screen, Text, tokens, useTheme } from '../../ui';
import { accountsKey, loadAccounts } from '../accounts/AccountsScreen';

type Step = 'pick' | 'password' | 'review' | 'done';

const status = (err: unknown) => (isAxiosError(err) ? err.response?.status : undefined);
const body = (err: unknown) => (isAxiosError(err) ? (err.response?.data as Record<string, unknown> | undefined) : undefined);

/** Import a bank/wallet statement: pick → (password) → review → import → undo if wrong. */
export function ImportScreen() {
    const params = useLocalSearchParams<{ kind?: AccountKind; id?: string }>();
    const router = useRouter();
    const qc = useQueryClient();
    const { colors } = useTheme();
    const accounts = useQuery({ queryKey: accountsKey, queryFn: loadAccounts, enabled: !params.id });

    const [account, setAccount] = useState<{ kind: AccountKind; id: string } | null>(params.kind && params.id ? { kind: params.kind, id: params.id } : null);
    const [step, setStep] = useState<Step>('pick');
    const [file, setFile] = useState<PickedFile | null>(null);
    const [password, setPassword] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [opening, setOpening] = useState('');
    const [closing, setClosing] = useState('');
    const [result, setResult] = useState<CommitResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function readFile(picked: PickedFile, pdfPassword?: string) {
        if (!account) return;
        setBusy(true);
        setError(null);
        try {
            const p = await previewStatement(account.kind, account.id, picked, pdfPassword);
            setPreview(p);
            const o = p.type === 'csv' ? p.meta.opening : p.opening;
            const c = p.type === 'csv' ? p.meta.closing : p.closing;
            setOpening(o != null ? String(o) : '');
            setClosing(c != null ? String(c) : '');
            setStep('review');
        } catch (err) {
            const code = body(err)?.code;
            if (code === 'PDF_PASSWORD_REQUIRED' || code === 'PDF_PASSWORD_INCORRECT') {
                setStep('password');
                setError(code === 'PDF_PASSWORD_INCORRECT' ? 'That password is not right.' : null);
            } else {
                setError(apiError(err));
            }
        } finally {
            setBusy(false);
        }
    }

    async function pick() {
        const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.[0]) return;
        const a = res.assets[0];
        const picked = { uri: a.uri, name: a.name, mimeType: a.mimeType };
        setFile(picked);
        await readFile(picked);
    }

    async function commit(extra: Record<string, unknown> = {}) {
        if (!account || !preview) return;
        const o = parseBalance(opening).value;
        const c = parseBalance(closing).value;
        const payload: Record<string, unknown> = preview.type === 'csv'
            ? { uploadId: preview.uploadId, type: 'csv', mapping: { headerRowIndex: preview.headerRowIndex, ...preview.autoMap, opening: o ?? '', closing: c ?? '' } }
            : { uploadId: preview.uploadId, type: 'pdf', transactions: preview.transactions, opening: o, closing: c, password: password || undefined };
        setBusy(true);
        setError(null);
        try {
            const r = await commitStatement(account.kind, account.id, { ...payload, ...extra });
            setResult(r);
            setStep('done');
            await qc.invalidateQueries();
        } catch (err) {
            const s = status(err);
            const data = body(err);
            if (s === 409 && data?.duplicate) {
                Alert.alert('Already imported', 'This statement was imported before. Replace the earlier import with this one?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Replace', onPress: () => void commit({ ...extra, force: true }) },
                ]);
            } else if (s === 422 && data?.needsConfirmation) {
                Alert.alert("This statement doesn't add up", String(data.message ?? ''), [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Import anyway', onPress: () => void commit({ ...extra, acceptMismatch: true }) },
                ]);
            } else {
                setError(apiError(err));
            }
        } finally {
            setBusy(false);
        }
    }

    async function undo() {
        if (!account || !result) return;
        setBusy(true);
        try {
            await deleteStatement(account.kind, account.id, result.statementId);
            await qc.invalidateQueries();
            setResult(null);
            setPreview(null);
            setStep('pick');
            Alert.alert('Import undone');
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    // Step 0: which account?
    if (!account) {
        const rows = accounts.data ?? [];
        return (
            <Screen>
                <BackHeader title="Import statement" />
                <Text variant="body">Which account is this statement for?</Text>
                {rows.length === 0 && accounts.isSuccess ? (
                    <EmptyState title="No accounts yet" message="Add a bank or wallet first." action={{ label: 'Go to Accounts', onPress: () => router.replace('/(tabs)/accounts' as Href) }} />
                ) : (
                    <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg }}>
                        {rows.map((r) => (
                            <ListRow key={`${r.kind}-${r.id}`} title={r.name} subtitle={r.kind === 'bank' ? 'Bank' : 'Wallet'} onPress={() => setAccount({ kind: r.kind, id: r.id })}
                                icon={<Ionicons name={r.kind === 'bank' ? 'business-outline' : 'wallet-outline'} size={20} color={colors.text} />} />
                        ))}
                    </View>
                )}
            </Screen>
        );
    }

    return (
        <Screen keyboard>
            <BackHeader title="Import statement" />

            {step === 'pick' && (
                <>
                    <Text variant="body">Choose the PDF or CSV statement you downloaded from your bank or wallet app.</Text>
                    <Button label="Choose file" onPress={pick} loading={busy} disabled={busy} />
                </>
            )}

            {step === 'password' && file && (
                <>
                    <Text variant="body">{file.name} is password-protected. Banks usually use your CNIC or date of birth.</Text>
                    <Field label="PDF password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
                    <Button label="Open" onPress={() => void readFile(file, password)} loading={busy} disabled={!password || busy} />
                </>
            )}

            {step === 'review' && preview && (
                <>
                    {preview.type === 'pdf' ? (
                        <Text variant="body">
                            Found {preview.transactions.length} transactions in {file?.name}.
                            {preview.reconciliation.ok ? ' The balances add up.' : preview.reconciliation.message ? ` ${preview.reconciliation.message}` : ''}
                        </Text>
                    ) : (
                        <Text variant="body">
                            {preview.rowCount} rows in {file?.name}.
                            {preview.autoMap.date < 0 || preview.autoMap.description < 0 ? ' The date or description column wasn\'t recognised — import this CSV from the web app, where you can pick the columns.' : ''}
                        </Text>
                    )}
                    {preview.alreadyImported && <Text variant="caption">This file was imported before — importing again will offer to replace it.</Text>}
                    {preview.type === 'pdf' && preview.transactions.slice(0, 5).map((t, i) => (
                        <ListRow key={i} title={t.description} subtitle={String(t.transaction_date).slice(0, 10)} amount={Number(t.net_amount)} signed />
                    ))}
                    <Field label="Opening balance" value={opening} onChangeText={setOpening} keyboardType="decimal-pad" placeholder="From the statement" />
                    <Field label="Closing balance" value={closing} onChangeText={setClosing} keyboardType="decimal-pad" placeholder="From the statement" />
                    <Text variant="caption">Both balances let WealthAxis check that nothing was missed.</Text>
                    <Button label="Import" onPress={() => void commit()} loading={busy}
                        disabled={busy || (preview.type === 'pdf' && preview.transactions.length === 0) || (preview.type === 'csv' && (preview.autoMap.date < 0 || preview.autoMap.description < 0))} />
                </>
            )}

            {step === 'done' && result && (
                <>
                    <Text variant="title">Imported ✓</Text>
                    <Text variant="body">
                        {result.summary.unique} new transactions
                        {result.summary.duplicates ? ` · ${result.summary.duplicates} already imported (skipped)` : ''}
                        {result.summary.possibleDuplicates ? ` · ${result.summary.possibleDuplicates} to check as possible duplicates` : ''}.
                    </Text>
                    {result.reconciliation && !result.reconciliation.ok && result.reconciliation.message ? <Text variant="caption">{result.reconciliation.message}</Text> : null}
                    <Text variant="caption">Spending totals already include them; approving just confirms each category.</Text>
                    <Button label="Review transactions" onPress={() => router.replace(`/(app)/account/${account.kind}/${account.id}` as Href)} />
                    <Button label="Undo import" variant="text" onPress={() => void undo()} disabled={busy} />
                </>
            )}

            {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : null}
        </Screen>
    );
}
