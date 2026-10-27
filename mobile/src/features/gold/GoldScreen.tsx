import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addGoldItem, goldHasPin, goldItems, goldSetPin, goldVerifyPin } from '../../api/money';
import { clearVaultToken, setVaultToken } from '../../api/vault';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, Chip, EmptyState, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
import { PinPad } from '../lock/PinPad';

const TYPES = ['ring', 'set', 'chain', 'bangle', 'earring', 'other'] as const;
const CARATS = [24, 22, 21, 20, 18] as const;

/** The Gold Vault: its own 6-digit PIN, then your pieces valued at today's price. */
export function GoldScreen() {
    const [unlocked, setUnlocked] = useState(false);
    const hasPin = useQuery({ queryKey: ['gold', 'has-pin'], queryFn: goldHasPin });

    // Leaving the vault locks it again.
    useEffect(() => () => clearVaultToken(), []);

    return (
        <Screen>
            <BackHeader title="Gold Vault" />
            {hasPin.isPending && <Skeleton height={200} radius={tokens.radius.hero} />}
            {hasPin.isError && <ErrorState message={apiError(hasPin.error)} onRetry={() => void hasPin.refetch()} />}
            {hasPin.data && !unlocked && (
                hasPin.data.hasGoldPin
                    ? <UnlockVault onUnlocked={() => setUnlocked(true)} />
                    : <CreateVaultPin onCreated={() => { void hasPin.refetch(); setUnlocked(true); }} />
            )}
            {unlocked && <VaultContents />}
        </Screen>
    );
}

function UnlockVault({ onUnlocked }: { onUnlocked: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reset, setReset] = useState(0);

    async function check(pin: string) {
        setBusy(true);
        setError(null);
        try {
            const r = await goldVerifyPin(pin);
            if (r.success && r.vaultToken) {
                setVaultToken(r.vaultToken, r.expiresIn);
                onUnlocked();
            } else {
                setError(r.attemptsLeft === 0 ? 'Too many wrong PINs — the vault is locked for 15 minutes.' : `Wrong PIN.${r.attemptsLeft != null ? ` ${r.attemptsLeft} tries left.` : ''}`);
                setReset((n) => n + 1);
            }
        } catch (err) {
            setError(apiError(err));
            setReset((n) => n + 1);
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={{ alignItems: 'center', gap: tokens.space.lg }}>
            <Text variant="heading">Enter your vault PIN</Text>
            <Text variant="caption">Separate from your app PIN. Forgot it? Reset it from the web app right after signing in.</Text>
            <PinPad onComplete={check} disabled={busy} resetKey={reset} />
            {error ? <Text variant="caption">{error}</Text> : null}
        </View>
    );
}

function CreateVaultPin({ onCreated }: { onCreated: () => void }) {
    const [first, setFirst] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reset, setReset] = useState(0);

    async function enter(pin: string) {
        if (!first) { setFirst(pin); setError(null); setReset((n) => n + 1); return; }
        if (pin !== first) { setFirst(null); setError("PINs didn't match. Try again."); setReset((n) => n + 1); return; }
        try {
            const r = await goldSetPin(pin);
            setVaultToken(r.vaultToken, r.expiresIn);
            onCreated();
        } catch (err) {
            setError(apiError(err));
            setFirst(null);
            setReset((n) => n + 1);
        }
    }

    return (
        <View style={{ alignItems: 'center', gap: tokens.space.lg }}>
            <Text variant="heading">{first ? 'Enter it again' : 'Choose a 6-digit vault PIN'}</Text>
            <Text variant="caption">Your gold is behind its own PIN, separate from the app PIN.</Text>
            <PinPad onComplete={(p) => void enter(p)} resetKey={reset} />
            {error ? <Text variant="caption">{error}</Text> : null}
        </View>
    );
}

function VaultContents() {
    const { colors } = useTheme();
    const items = useQuery({ queryKey: ['gold', 'items'], queryFn: goldItems });
    const [adding, setAdding] = useState(false);
    const d = items.data;

    return (
        <>
            {items.isPending && <Skeleton height={140} radius={tokens.radius.hero} />}
            {items.isError && <ErrorState message={apiError(items.error)} onRetry={() => void items.refetch()} />}
            {d && (
                <>
                    <HeroCard label="Your gold" value={d.latest_price ? fmtPKR(d.total_value_pkr) : 'Price unavailable'}
                        caption={d.latest_price ? `24K at ${fmtPKR(Number(d.latest_price.price_24k_per_gram))}/g · ${fmtDateLong(d.latest_price.date)}` : 'Shown once a gold price is recorded'} />
                    {d.items.length === 0 ? (
                        <EmptyState title="No gold added" message="Add rings, sets and other pieces by weight and carat." />
                    ) : (
                        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                            {d.items.map((g) => (
                                <ListRow key={g.id} title={g.name} subtitle={`${g.type} · ${Number(g.weight_grams)} g · ${g.carats}K`}
                                    amount={g.current_value_pkr} icon={<Ionicons name="diamond-outline" size={20} color={colors.text} />} />
                            ))}
                        </View>
                    )}
                </>
            )}
            <Button label="Add gold" variant="secondary" onPress={() => setAdding(true)} />
            <AddGoldSheet visible={adding} onClose={() => setAdding(false)} />
        </>
    );
}

function AddGoldSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState<(typeof TYPES)[number]>('ring');
    const [carats, setCarats] = useState<number>(22);
    const [weight, setWeight] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function save() {
        const w = parseBalance(weight);
        if (w.error || !w.value) return setError(w.error ?? 'Enter the weight in grams');
        setBusy(true);
        try {
            await addGoldItem({ name: name.trim(), type, carats, weight_grams: w.value });
            await qc.invalidateQueries({ queryKey: ['gold'] });
            setName(''); setWeight('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add gold">
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Wedding set" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {TYPES.map((t) => <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {CARATS.map((c) => <Chip key={c} label={`${c}K`} selected={carats === c} onPress={() => setCarats(c)} />)}
            </View>
            <Field label="Weight (grams)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!name.trim() || !weight || busy} />
        </Sheet>
    );
}
