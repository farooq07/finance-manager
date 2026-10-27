import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { Sheet } from './Sheet';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

export type TabName = 'home' | 'accounts' | 'invest' | 'more';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: TabName | 'add'; label: string; icon: IconName }[] = [
    { name: 'home', label: 'Home', icon: 'home-outline' },
    { name: 'accounts', label: 'Accounts', icon: 'wallet-outline' },
    { name: 'add', label: 'Add', icon: 'add' },
    { name: 'invest', label: 'Invest', icon: 'trending-up-outline' },
    { name: 'more', label: 'More', icon: 'grid-outline' },
];

export type QuickAction = { label: string; icon: IconName; onPress?: () => void };

// Quick actions behind the centre button. Ones without onPress show as
// "Coming in the next update"; the tabs layout passes the real ones.
const QUICK_ADD: QuickAction[] = [
    { label: 'Expense', icon: 'receipt-outline' },
    { label: 'Transfer', icon: 'swap-horizontal-outline' },
    { label: 'Import statement', icon: 'document-text-outline' },
    { label: 'Ask AI', icon: 'sparkles-outline' },
];

/** Bottom bar: Home · Accounts · (raised) Add · Invest · More. Add opens a sheet. */
export function TabBar({ active, onSelect, quickActions = QUICK_ADD }: { active: TabName; onSelect: (tab: TabName) => void; quickActions?: QuickAction[] }) {
    const { colors } = useTheme();
    const [adding, setAdding] = useState(false);
    const tap = () => void Haptics.selectionAsync().catch(() => {});

    return (
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 4 }}>
                {TABS.map((tab) => {
                    if (tab.name === 'add') {
                        return (
                            <Pressable key="add" accessibilityRole="tab" accessibilityLabel="Add" onPress={() => { tap(); setAdding(true); }} style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ width: 52, height: 52, borderRadius: 26, marginTop: -22, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="add" size={28} color={colors.card} />
                                </View>
                                <Text variant="caption" style={{ fontSize: 11, marginTop: 2 }}>Add</Text>
                            </Pressable>
                        );
                    }
                    const selected = tab.name === active;
                    const color = selected ? colors.text : colors.textFaint;
                    return (
                        <Pressable
                            key={tab.name}
                            accessibilityRole="tab"
                            accessibilityLabel={tab.label}
                            accessibilityState={{ selected }}
                            onPress={() => { tap(); onSelect(tab.name as TabName); }}
                            style={{ flex: 1, alignItems: 'center', gap: 2 }}
                        >
                            <Ionicons name={tab.icon} size={22} color={color} />
                            <Text variant="caption" style={{ fontSize: 11, color }}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <Sheet visible={adding} onClose={() => setAdding(false)} title="Add">
                {quickActions.map((item) => (
                    <Pressable
                        key={item.label}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        disabled={!item.onPress}
                        onPress={() => { setAdding(false); item.onPress?.(); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, paddingVertical: 6, opacity: item.onPress ? 1 : 0.6 }}
                    >
                        <Ionicons name={item.icon} size={22} color={colors.text} />
                        <View>
                            <Text variant="heading">{item.label}</Text>
                            {!item.onPress && <Text variant="caption">Coming in the next update</Text>}
                        </View>
                    </Pressable>
                ))}
            </Sheet>
        </SafeAreaView>
    );
}
