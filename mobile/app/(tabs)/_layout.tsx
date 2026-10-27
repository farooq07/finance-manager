import { Tabs } from 'expo-router';
import { TabBar, type TabName } from '../../src/ui/TabBar';

// Four real tabs; the centre "Add" lives only in the TabBar (it opens a sheet).
export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={({ state, navigation }) => (
                <TabBar
                    active={state.routes[state.index].name as TabName}
                    onSelect={(tab) => navigation.navigate(tab)}
                />
            )}
        >
            <Tabs.Screen name="home" />
            <Tabs.Screen name="accounts" />
            <Tabs.Screen name="invest" />
            <Tabs.Screen name="more" />
        </Tabs>
    );
}
