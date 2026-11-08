import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAIN_APP_TABS } from '@/constants';
import { HIDDEN_APP_TABS } from '@/constants/navigation';
import {
  FLOATING_TAB_BAR_HEIGHT,
  GlassTabBar,
  SleepLockProvider,
  TabBarSpaceProvider,
} from '@/components/layout/GlassTabBar';

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  // Space tab screens reserve at the bottom so content clears the floating bar.
  const tabBarSpace = FLOATING_TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 12;

  return (
    <SleepLockProvider>
      <TabBarSpaceProvider value={tabBarSpace}>
        <Tabs
          // Fully replace the default opaque bar with the floating glass bar.
          tabBar={(props) => <GlassTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            // Stop inactive tab trees (timers, SVG and Reanimated work) from
            // consuming CPU/GPU behind the currently visible screen.
            freezeOnBlur: true,
            lazy: true,
            // The bar floats over content; keep the scene transparent so the
            // shared starfield background shows through behind it.
            sceneStyle: { backgroundColor: 'transparent' },
          }}
        >
          {MAIN_APP_TABS.map(({ name, title }) => (
            <Tabs.Screen key={name} name={name} options={{ title }} />
          ))}
          {HIDDEN_APP_TABS.map(name => (
            <Tabs.Screen key={name} name={name} options={{ href: null }} />
          ))}
        </Tabs>
      </TabBarSpaceProvider>
    </SleepLockProvider>
  );
}
