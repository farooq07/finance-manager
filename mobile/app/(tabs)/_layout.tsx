import { useState } from 'react';
import { Tabs, useRouter, type Href } from 'expo-router';
import { TabBar, type TabName } from '../../src/ui/TabBar';
import { AddExpenseSheet } from '../../src/features/expenses/AddExpenseSheet';

// Four real tabs; the centre "Add" lives only in the TabBar (it opens a sheet).
export default function TabsLayout() {
    const router = useRouter();
    const [addingExpense, setAddingExpense] = useState(false);

    return (
        <>
            <Tabs
                screenOptions={{ headerShown: false }}
                tabBar={({ state, navigation }) => (
                    <TabBar
                        active={state.routes[state.index].name as TabName}
                        onSelect={(tab) => navigation.navigate(tab)}
                        quickActions={[
                            { label: 'Expense', icon: 'receipt-outline', onPress: () => setAddingExpense(true) },
                            { label: 'Import statement', icon: 'document-text-outline', onPress: () => router.push('/(app)/import' as Href) },
                            { label: 'Transfer', icon: 'swap-horizontal-outline' },
                            { label: 'Ask AI', icon: 'sparkles-outline' },
                        ]}
                    />
                )}
            >
                <Tabs.Screen name="home" />
                <Tabs.Screen name="accounts" />
                <Tabs.Screen name="invest" />
                <Tabs.Screen name="more" />
            </Tabs>
            <AddExpenseSheet visible={addingExpense} onClose={() => setAddingExpense(false)} />
        </>
    );
}
