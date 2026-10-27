import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSession } from '../session/sessionStore';
import { Button, ListRow, Screen, Text, tokens, useTheme } from '../../ui';
import { COMING_SOON } from './ComingSoon';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const ITEMS: { label: string; hint: string; icon: IconName; href?: string }[] = [
    { label: 'Spending', hint: 'Month by month, by category', icon: 'pie-chart-outline', href: '/(app)/spending' },
    { label: 'Zakat', hint: 'What is due and how it is worked out', icon: 'heart-outline', href: '/(app)/zakat' },
    { label: 'Gold Vault', hint: 'Your gold at today\'s price', icon: 'diamond-outline', href: '/(app)/gold' },
    { label: 'Ledger', hint: 'Who owes you, who you owe, and loans', icon: 'people-outline', href: '/(app)/ledger' },
    { label: 'AI assistant', hint: 'Ask about your money in plain words', icon: 'sparkles-outline', href: '/(app)/assistant' },
    { label: 'Settings', hint: COMING_SOON, icon: 'settings-outline' },
];

export function MoreScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const signOut = useSession((s) => s.signOut);
    const name = useSession((s) => s.user?.name);

    return (
        <Screen>
            <Text variant="title" accessibilityRole="header">More</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                {ITEMS.map((item) => (
                    <View key={item.label} style={{ opacity: item.href ? 1 : 0.55 }}>
                        <ListRow title={item.label} subtitle={item.hint}
                            icon={<Ionicons name={item.icon} size={20} color={colors.text} />}
                            onPress={item.href ? () => router.push(item.href as Href) : undefined} />
                    </View>
                ))}
            </View>
            <Button label={name ? `Sign out (${name.split(' ')[0]})` : 'Sign out'} variant="text" onPress={() => void signOut()} />
        </Screen>
    );
}
