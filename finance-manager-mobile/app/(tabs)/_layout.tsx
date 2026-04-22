import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { BottomNavigation } from 'react-native-paper';
import { Colors } from '../../constants/colors';

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          navigationState={state}
          safeAreaInsets={insets}
          activeColor={Colors.primary}
          inactiveColor={Colors.textTertiary}
          style={{
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
          activeIndicatorStyle={{ backgroundColor: 'transparent' }}
          labeled={true}
          onTabPress={({ route, preventDefault }) => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) {
              preventDefault();
            } else {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          }}
          renderIcon={({ route, focused, color }) => {
            const { options } = descriptors[route.key];
            if (options.tabBarIcon) {
              return options.tabBarIcon({ focused, color, size: 24 });
            }
            return null;
          }}
          getLabelText={({ route }) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
            return label as string;
          }}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'trending-up' : 'trending-up'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'credit-card' : 'credit-card-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="menu" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
