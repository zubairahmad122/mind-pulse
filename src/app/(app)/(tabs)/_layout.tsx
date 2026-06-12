import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, MAIN_APP_TABS } from '@/constants';

/** Icon + label row height (excluding safe-area padding). */
const TAB_BAR_CONTENT_HEIGHT = 52;

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.purple,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomInset,
          height: TAB_BAR_CONTENT_HEIGHT + 8 + bottomInset,
        },
      }}
    >
      {MAIN_APP_TABS.map(({ name, title, icon: Icon, iconFocused: IconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size, focused }) => {
              const TabIcon = focused ? IconFocused : Icon;
              return <TabIcon size={focused ? size + 1 : size} color={color} strokeWidth={1.8} />;
            },
          }}
        />
      ))}
      {/* Hidden tabs — accessible via push, not shown in bar */}
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="recovery" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
