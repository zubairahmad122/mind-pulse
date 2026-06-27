import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAIN_APP_TABS } from '@/constants';
import {
  FLOATING_TAB_BAR_HEIGHT,
  GlassTabBar,
  TabBarSpaceProvider,
} from '@/components/layout/GlassTabBar';

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  // Space tab screens reserve at the bottom so content clears the floating bar.
  const tabBarSpace = FLOATING_TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 12;

  return (
    <TabBarSpaceProvider value={tabBarSpace}>
      <Tabs
        // Fully replace the default opaque bar with the floating glass bar.
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // The bar floats over content; keep the scene transparent so the
          // shared starfield background shows through behind it.
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        {MAIN_APP_TABS.map(({ name, title }) => (
          <Tabs.Screen key={name} name={name} options={{ title }} />
        ))}
        {/* Hidden tabs — accessible via push, not shown in bar */}
        <Tabs.Screen name="report" options={{ href: null }} />
        <Tabs.Screen name="recovery" options={{ href: null }} />
      </Tabs>
    </TabBarSpaceProvider>
  );
}
