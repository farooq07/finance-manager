import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, updatePreferences } from '../../api/accounts';
import { apiError } from '../../api/client';
import { fmtPKR } from '../../lib/currency';
import { useSession } from '../session/sessionStore';
import { Button, HeroCard, Screen, Text, tokens, useTheme } from '../../ui';
import { InterestPicker } from './InterestPicker';
import { AccountRows } from './AccountRows';

/**
 * First-run setup — same steps and copy as the web: what to track →
 * accounts with today's balance → net worth. Finishing or skipping stamps
 * onboarded_at; reloading the user lets the route guard move on to Home.
 */
export function OnboardingScreen() {
    const { colors } = useTheme();
    const user = useSession((s) => s.user);
    const refreshUser = useSession((s) => s.refreshUser);
    const [step, setStep] = useState(1);
    const [interests, setInterests] = useState<string[]>(() => (Array.isArray(user?.interests) ? user.interests : []));
    const [typedTotal, setTypedTotal] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save(body: Parameters<typeof updatePreferences>[0], after?: () => void) {
        setBusy(true);
        setError(null);
        try {
            await updatePreferences(body);
            await refreshUser();
            after?.();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    const finish = () => save({ completeOnboarding: true });

    return (
        <Screen keyboard>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="caption">Step {step} of 3</Text>
                {step < 3 && <View style={{ width: 120 }}><Button label="Skip setup" variant="text" onPress={finish} disabled={busy} /></View>}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {[1, 2, 3].map((n) => (
                    <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= step ? colors.accent : colors.cardBorder }} />
                ))}
            </View>
            {error ? <Text variant="caption" accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}

            {step === 1 && (
                <View style={{ gap: tokens.space.lg }}>
                    <View style={{ gap: 4 }}>
                        <Text variant="title" accessibilityRole="header">What do you want to track?</Text>
                        <Text variant="caption">Accounts, expenses, Zakat and reports are always included.</Text>
                    </View>
                    <InterestPicker value={interests} onChange={setInterests} />
                    <Button label="Continue" onPress={() => save({ interests }, () => setStep(2))} loading={busy} disabled={busy} />
                </View>
            )}

            {step === 2 && (
                <View style={{ gap: tokens.space.lg }}>
                    <View style={{ gap: 4 }}>
                        <Text variant="title" accessibilityRole="header">Add your accounts</Text>
                        <Text variant="caption">Your banks and wallets with today's balance. You can import statements later.</Text>
                    </View>
                    <AccountRows onDone={(total) => { setTypedTotal(total); setStep(3); }} />
                </View>
            )}

            {step === 3 && <SetUpStep typedTotal={typedTotal} onFinish={finish} busy={busy} />}
        </Screen>
    );
}

function SetUpStep({ typedTotal, onFinish, busy }: { typedTotal: number; onFinish: () => void; busy: boolean }) {
    const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary, retry: false });
    // If the summary can't load, show what the user just entered.
    const netWorth = summary.data?.metrics?.netWorth ?? (summary.isError ? typedTotal : null);

    return (
        <View style={{ gap: tokens.space.lg }}>
            <Text variant="title" accessibilityRole="header">You're set up</Text>
            <HeroCard label="Your net worth:" value={netWorth == null ? '…' : fmtPKR(netWorth)} caption="You can import statements later to see your history." />
            <Button label="Go to Home" onPress={onFinish} loading={busy} disabled={busy} />
        </View>
    );
}
