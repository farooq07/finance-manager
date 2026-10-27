import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../api/accounts';
import { apiError } from '../../api/client';
import { fmtPKR } from '../../lib/currency';
import { useSession } from '../session/sessionStore';
import { ErrorState, HeroCard, OfflineBanner, Screen, Skeleton, Text, tokens } from '../../ui';

/** Home: greeting and net worth. Money, Zakat and charts join in the Money core sub-project. */
export function HomeScreen() {
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
                />
            )}
        </Screen>
    );
}
