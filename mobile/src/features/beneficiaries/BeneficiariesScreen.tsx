import { useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addBeneficiary, beneficiariesKey, getBeneficiaries } from '../../api/beneficiaries';
import { apiError } from '../../api/client';
import { BackHeader, Button, EmptyState, ErrorState, Field, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';

/** People you send money to, found in your statements by their account numbers. */
export function BeneficiariesScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const list = useQuery({ queryKey: beneficiariesKey, queryFn: getBeneficiaries });
    const [adding, setAdding] = useState(false);
    const rows = list.data ?? [];

    return (
        <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
            <BackHeader title="Beneficiaries" />
            <Text variant="caption">Add the people you send money to with their account or wallet numbers. Transfers to them in your imported statements are collected on their page.</Text>
            {list.isPending && <Skeleton height={160} radius={tokens.radius.hero} />}
            {list.isError && !list.data && <ErrorState message={apiError(list.error)} onRetry={() => void list.refetch()} />}

            {list.data && (rows.length === 0 ? (
                <EmptyState title="No beneficiaries yet" message="Family, landlord, a supplier — anyone you transfer money to." action={{ label: 'Add a beneficiary', onPress: () => setAdding(true) }} />
            ) : (
                <>
                    <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                        {rows.map((b) => (
                            <ListRow key={b.id} title={b.nickname ? `${b.name} (${b.nickname})` : b.name}
                                subtitle={`${b.accounts.length} account${b.accounts.length === 1 ? '' : 's'} · ${b._count?.transactions ?? 0} transfers found`}
                                icon={<Text variant="heading">{b.name.trim().charAt(0).toUpperCase()}</Text>}
                                onPress={() => router.push(`/(app)/beneficiary/${b.id}` as Href)} />
                        ))}
                    </View>
                    <Button label="Add a beneficiary" variant="secondary" onPress={() => setAdding(true)} />
                </>
            ))}

            <AddBeneficiarySheet visible={adding} onClose={() => setAdding(false)} />
        </Screen>
    );
}

function AddBeneficiarySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const router = useRouter();
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [label, setLabel] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            const b = await addBeneficiary({
                name: name.trim(), nickname: nickname.trim() || undefined,
                accounts: accountNo.trim() ? [{ account_no: accountNo.trim(), account_label: label.trim() || undefined }] : [],
            });
            await qc.invalidateQueries({ queryKey: beneficiariesKey });
            setName(''); setNickname(''); setAccountNo(''); setLabel('');
            onClose();
            router.push(`/(app)/beneficiary/${b.id}` as Href);
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add a beneficiary">
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Ammi" autoFocus />
            <Field label="Nickname (optional)" value={nickname} onChangeText={setNickname} />
            <Field label="Account, IBAN or wallet number" value={accountNo} onChangeText={setAccountNo} autoCapitalize="characters" autoCorrect={false}
                placeholder="e.g. PK36SCBL… or 0300…" />
            <Field label="Which account is it? (optional)" value={label} onChangeText={setLabel} placeholder="e.g. HBL savings, JazzCash" error={error} />
            <Text variant="caption">Even the last few digits work — statements often show only part of the number. Your imported statements are searched straight away.</Text>
            <Button label="Add" onPress={save} loading={busy} disabled={!name.trim() || busy} />
        </Sheet>
    );
}
