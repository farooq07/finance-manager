import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addBeneficiaryAccount, beneficiariesKey, deleteBeneficiary, deleteBeneficiaryAccount, getBeneficiary, rescanBeneficiary, updateBeneficiary,
    type BeneficiaryDetail,
} from '../../api/beneficiaries';
import { apiError } from '../../api/client';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { BackHeader, Button, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';

/** One beneficiary: their accounts, and every transfer found in your statements. */
export function BeneficiaryScreen({ id }: { id: string }) {
    const router = useRouter();
    const { colors } = useTheme();
    const qc = useQueryClient();
    const detail = useQuery({ queryKey: [...beneficiariesKey, id], queryFn: () => getBeneficiary(id) });
    const [sheet, setSheet] = useState<'account' | 'edit' | null>(null);
    const [scanning, setScanning] = useState(false);
    const b = detail.data;

    const sent = (b?.transactions ?? []).filter((t) => t.direction === 'debit').reduce((s, t) => s + Number(t.amount), 0);
    const received = (b?.transactions ?? []).filter((t) => t.direction === 'credit').reduce((s, t) => s + Number(t.amount), 0);
    const refresh = () => qc.invalidateQueries({ queryKey: beneficiariesKey });

    async function rescan() {
        setScanning(true);
        try {
            const r = await rescanBeneficiary(id);
            await refresh();
            Alert.alert('Search finished', r.linked ? r.message : 'No new transfers found in your imported statements.');
        } catch (err) {
            Alert.alert('Could not search', apiError(err));
        } finally {
            setScanning(false);
        }
    }

    function removeAccount(accountId: string, number: string) {
        Alert.alert('Remove this account?', `${number}\nTransfers already found stay on this page.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: async () => { try { await deleteBeneficiaryAccount(id, accountId); await refresh(); } catch (err) { Alert.alert('Could not remove', apiError(err)); } } },
        ]);
    }

    function remove() {
        if (!b) return;
        Alert.alert(`Delete ${b.name}?`, 'Their accounts and found transfers are removed from WealthAxis. Your statements are not changed.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteBeneficiary(id); await refresh(); router.back(); } catch (err) { Alert.alert('Could not delete', apiError(err)); } } },
        ]);
    }

    const card = { backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm } as const;

    return (
        <Screen refreshing={detail.isRefetching} onRefresh={() => void detail.refetch()}>
            <BackHeader title={b?.name ?? 'Beneficiary'} action={b ? (
                <View style={{ flexDirection: 'row', gap: tokens.space.lg }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${b.name}`} hitSlop={12} onPress={() => setSheet('edit')}>
                        <Ionicons name="create-outline" size={22} color={colors.text} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${b.name}`} hitSlop={12} onPress={remove}>
                        <Ionicons name="trash-outline" size={22} color={colors.text} />
                    </Pressable>
                </View>
            ) : undefined} />
            {detail.isPending && <Skeleton height={150} radius={tokens.radius.hero} />}
            {detail.isError && !b && <ErrorState message={apiError(detail.error)} onRetry={() => void detail.refetch()} />}

            {b && (
                <>
                    <HeroCard label="Sent to them" value={fmtPKR(sent)}
                        caption={`${received ? `Received ${fmtPKR(received)} · ` : ''}${b.transactions.length} transfer${b.transactions.length === 1 ? '' : 's'} found`} />

                    <View style={card}>
                        <Text variant="heading" style={{ marginTop: tokens.space.sm }}>Accounts</Text>
                        {b.accounts.length === 0 && <Text variant="caption">No account numbers yet — add one so transfers can be found.</Text>}
                        {b.accounts.map((a) => (
                            <ListRow key={a.id} title={a.account_no} subtitle={a.account_label ?? 'Account'}
                                icon={<Ionicons name="card-outline" size={20} color={colors.text} />}
                                onPress={() => removeAccount(a.id, a.account_no)} />
                        ))}
                        <Button label="Add an account number" variant="text" onPress={() => setSheet('account')} />
                    </View>

                    {b.transactions.length > 0 && (
                        <View style={card}>
                            <Text variant="heading" style={{ marginTop: tokens.space.sm }}>Transfers</Text>
                            {b.transactions.map((t) => (
                                <ListRow key={t.id} title={t.description || (t.direction === 'debit' ? 'Sent' : 'Received')}
                                    subtitle={fmtDateLong(t.transaction_date)}
                                    amount={t.direction === 'credit' ? Number(t.amount) : -Number(t.amount)} signed />
                            ))}
                        </View>
                    )}

                    <Button label={scanning ? 'Searching…' : 'Search my statements again'} variant="secondary" onPress={() => void rescan()} disabled={scanning} />
                    {b.phone ? <Text variant="caption">Phone: {b.phone}</Text> : null}
                </>
            )}

            <AccountSheet visible={sheet === 'account'} id={id} onClose={() => setSheet(null)} />
            {b && <EditSheet visible={sheet === 'edit'} b={b} onClose={() => setSheet(null)} />}
        </Screen>
    );
}

function AccountSheet({ visible, id, onClose }: { visible: boolean; id: string; onClose: () => void }) {
    const qc = useQueryClient();
    const [number, setNumber] = useState('');
    const [label, setLabel] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            await addBeneficiaryAccount(id, number.trim(), label.trim() || undefined);
            await qc.invalidateQueries({ queryKey: beneficiariesKey });
            setNumber(''); setLabel('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add an account number">
            <Field label="Account, IBAN or wallet number" value={number} onChangeText={setNumber} autoCapitalize="characters" autoCorrect={false} autoFocus />
            <Field label="Which account is it? (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Meezan current" error={error} />
            <Button label="Add" onPress={save} loading={busy} disabled={!number.trim() || busy} />
        </Sheet>
    );
}

function EditSheet({ visible, b, onClose }: { visible: boolean; b: BeneficiaryDetail; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState(b.name);
    const [nickname, setNickname] = useState(b.nickname ?? '');
    const [phone, setPhone] = useState(b.phone ?? '');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (visible) { setName(b.name); setNickname(b.nickname ?? ''); setPhone(b.phone ?? ''); setError(null); } }, [visible, b]);

    async function save() {
        setBusy(true);
        try {
            await updateBeneficiary(b.id, { name: name.trim(), nickname: nickname.trim() || null, phone: phone.trim() || null, notes: b.notes });
            await qc.invalidateQueries({ queryKey: beneficiariesKey });
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Edit beneficiary">
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Nickname (optional)" value={nickname} onChangeText={setNickname} />
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!name.trim() || busy} />
        </Sheet>
    );
}
