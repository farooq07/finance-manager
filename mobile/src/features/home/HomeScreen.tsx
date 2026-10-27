import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../api/accounts';
import { apiError } from '../../api/client';
import { fmtPKR } from '../../lib/currency';
import { useSession } from '../session/sessionStore';
import { ErrorState, HeroCard, ListRow, OfflineBanner, Screen, Skeleton, Text, tokens, useTheme } from '../../ui';

/** Home: greeting, net worth, this month's spending and quick ways in. */
export function HomeScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const firstName = useSession((s) => s.user?.name?.split(' ')[0]);
    const offline = useSession((s) => s.offline);
    const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
    const metrics = summary.data?.metrics;

    return (
        <Screen refreshing={summary.isRefetching} onRefresh={() => void summary.refetch()}>
            <Text variant="title" accessibilityRole="header">{firstName ? `Hi, ${firstName}` : 'Hi there'}</Text>
            {offline && <OfflineBanner />}

            {summary.isPending && (
                <View style={{ gap: tokens.space.md }}>
                    <Skeleton height={150} radius={tokens.radius.hero} />
                    <Skeleton height={20} width="60%" />
                </View>
            )}

            {summary.isError && !metrics && (
                <ErrorState message={apiError(summary.error)} onRetry={() => void summary.refetch()} />
            )}

            {metrics && (
                <HeroCard
                    label="Net worth"
                    value={fmtPKR(metrics.netWorth)}
                    caption={metrics.currentMonthExpenses ? `Spent this month: ${fmtPKR(metrics.currentMonthExpenses)}` : 'Across your banks, wallets and investments'}
                    actions={[
                        { label: 'Import statement', glyph: '↙', onPress: () => router.push('/(app)/import' as Href) },
                        { label: 'Accounts', glyph: '↗', onPress: () => router.push('/(tabs)/accounts' as Href) },
                    ]}
                />
            )}

            {metrics && (
                <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                    <ListRow title="This month" subtitle="See where it went" amount={-(metrics.currentMonthExpenses || 0)}
                        icon={<Ionicons name="pie-chart-outline" size={20} color={colors.text} />} onPress={() => router.push('/(app)/spending' as Href)} />
                    <ListRow title="Zakat" subtitle="What is due" icon={<Ionicons name="heart-outline" size={20} color={colors.text} />}
                        onPress={() => router.push('/(app)/zakat' as Href)} />
                </View>
            )}
        </Screen>
    );
}
