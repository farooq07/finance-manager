import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiError } from '../../api/client';
import { addGoldItem, deleteGoldItem, goldHasPin, goldItems, goldResetPin, goldSetPin, goldVerifyPin, updateGoldItem, type GoldItem } from '../../api/money';
import { clearVaultToken, setVaultToken } from '../../api/vault';
import { fmtPKR } from '../../lib/currency';
import { fmtDateLong } from '../../lib/dates';
import { parseBalance } from '../../lib/parseBalance';
import { BackHeader, Button, Chip, EmptyState, ErrorState, Field, HeroCard, ListRow, Screen, Sheet, Skeleton, Text, tokens, useTheme } from '../../ui';
import { PinPad } from '../lock/PinPad';
import { useSession } from '../session/sessionStore';

const TYPES = ['ring', 'set', 'chain', 'bangle', 'earring', 'other'] as const;
const CARATS = [24, 22, 21, 20, 18] as const;

/** The Gold Vault: its own 6-digit PIN, then your pieces valued at today's price. */
export function GoldScreen() {
    const [unlocked, setUnlocked] = useState(false);
    const [resetting, setResetting] = useState(false);
    const hasPin = useQuery({ queryKey: ['gold', 'has-pin'], queryFn: goldHasPin });

    // Leaving the vault locks it again.
    useEffect(() => () => clearVaultToken(), []);

    return (
        <Screen>
            <BackHeader title="Gold Vault" />
            {hasPin.isPending && <Skeleton height={200} radius={tokens.radius.hero} />}
            {hasPin.isError && <ErrorState message={apiError(hasPin.error)} onRetry={() => void hasPin.refetch()} />}
            {hasPin.data && !unlocked && (
                resetting
                    ? <ResetVaultPin onDone={() => { setResetting(false); setUnlocked(true); }} onCancel={() => setResetting(false)} />
                    : hasPin.data.hasGoldPin
                        ? <UnlockVault onUnlocked={() => setUnlocked(true)} onForgot={() => setResetting(true)} />
                        : <CreateVaultPin onCreated={() => { void hasPin.refetch(); setUnlocked(true); }} />
            )}
            {unlocked && <VaultContents />}
        </Screen>
    );
}

function UnlockVault({ onUnlocked, onForgot }: { onUnlocked: () => void; onForgot: () => void }) {
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
            <Text variant="caption">Separate from your app PIN.</Text>
            <PinPad onComplete={check} disabled={busy} resetKey={reset} />
            {error ? <Text variant="caption">{error}</Text> : null}
            <Button label="Forgot vault PIN?" variant="text" onPress={onForgot} />
        </View>
    );
}

/**
 * Forgot the vault PIN: choose a new one. The server allows this only within
 * 10 minutes of a full sign-in (password + emailed code) — that sign-in is the
 * proof it's really you, since the old PIN can't be.
 */
function ResetVaultPin({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
    const signOut = useSession((s) => s.signOut);
    const [first, setFirst] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsSignIn, setNeedsSignIn] = useState(false);
    const [reset, setReset] = useState(0);

    async function enter(pin: string) {
        if (!first) { setFirst(pin); setError(null); setReset((n) => n + 1); return; }
        if (pin !== first) { setFirst(null); setError("PINs didn't match. Try again."); setReset((n) => n + 1); return; }
        try {
            const r = await goldResetPin(pin);
            if (r.vaultToken) setVaultToken(r.vaultToken, r.expiresIn);
            onDone();
        } catch (err) {
            const code = isAxiosError(err) ? (err.response?.data as { code?: string } | undefined)?.code : undefined;
            setNeedsSignIn(code === 'REAUTH_REQUIRED');
            setError(apiError(err));
            setFirst(null);
            setReset((n) => n + 1);
        }
    }

    if (needsSignIn) {
        return (
            <View style={{ gap: tokens.space.lg }}>
                <Text variant="heading">Sign in again first</Text>
                <Text variant="body">To reset your vault PIN we need you to prove it's you: sign out, sign back in with your password and the emailed code, then come back here within 10 minutes.</Text>
                <Button label="Sign out now" onPress={() => void signOut()} />
                <Button label="Cancel" variant="text" onPress={onCancel} />
            </View>
        );
    }

    return (
        <View style={{ alignItems: 'center', gap: tokens.space.lg }}>
            <Text variant="heading">{first ? 'Enter the new PIN again' : 'Choose a new 6-digit vault PIN'}</Text>
            <Text variant="caption">Works only if you signed in during the last 10 minutes.</Text>
            <PinPad onComplete={(p) => void enter(p)} resetKey={reset} />
            {error ? <Text variant="caption">{error}</Text> : null}
            <Button label="Cancel" variant="text" onPress={onCancel} />
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
    const [editing, setEditing] = useState<GoldItem | null>(null);
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
                                    amount={g.current_value_pkr} icon={<Ionicons name="diamond-outline" size={20} color={colors.text} />}
                                    onPress={() => setEditing(g)} />
                            ))}
                        </View>
                    )}
                </>
            )}
            <Button label="Add gold" variant="secondary" onPress={() => setAdding(true)} />
            <GoldSheet visible={adding || editing !== null} item={editing} onClose={() => { setAdding(false); setEditing(null); }} />
        </>
    );
}

/** Add a piece, or (with `item`) change or remove one. */
function GoldSheet({ visible, item, onClose }: { visible: boolean; item: GoldItem | null; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState<string>('ring');
    const [carats, setCarats] = useState<number>(22);
    const [weight, setWeight] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setError(null);
        setName(item?.name ?? '');
        setType(item?.type ?? 'ring');
        setCarats(item?.carats ?? 22);
        setWeight(item ? String(Number(item.weight_grams)) : '');
    }, [visible, item]);

    async function save() {
        const w = parseBalance(weight);
        if (w.error || !w.value) return setError(w.error ?? 'Enter the weight in grams');
        setBusy(true);
        try {
            const body = { name: name.trim(), type, carats, weight_grams: w.value };
            if (item) await updateGoldItem(item.id, body);
            else await addGoldItem(body);
            await qc.invalidateQueries({ queryKey: ['gold'] });
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    function remove() {
        if (!item) return;
        Alert.alert(`Remove ${item.name}?`, 'It no longer counts in your net worth or Zakat.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try { await deleteGoldItem(item.id); await qc.invalidateQueries({ queryKey: ['gold'] }); onClose(); } catch (err) { Alert.alert('Could not remove', apiError(err)); }
                },
            },
        ]);
    }

    return (
        <Sheet visible={visible} onClose={onClose} title={item ? 'Edit gold' : 'Add gold'}>
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Wedding set" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {TYPES.map((t) => <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                {CARATS.map((c) => <Chip key={c} label={`${c}K`} selected={carats === c} onPress={() => setCarats(c)} />)}
            </View>
            <Field label="Weight (grams)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" error={error} />
            <Button label="Save" onPress={save} loading={busy} disabled={!name.trim() || !weight || busy} />
            {item && <Button label="Remove this piece" variant="text" onPress={remove} />}
        </Sheet>
    );
}
