import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { createContext, useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAIN_APP_TABS } from '@/constants';

/** Approximate height of the floating glass bar's content (excludes safe-area inset). */
export const FLOATING_TAB_BAR_HEIGHT = 74;

/**
 * The vertical space a tab screen should reserve at the bottom so its scroll
 * content clears the floating glass bar. Provided by the tabs layout, consumed
 * by ScreenShell. Defaults to 0 for non-tab (pushed/modal) screens.
 */
const TabBarSpaceContext = createContext(0);
export const TabBarSpaceProvider = TabBarSpaceContext.Provider;
export const useTabBarSpace = () => useContext(TabBarSpaceContext);

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = '#6B7280';

/**
 * Minimal structural type for the props expo-router's Tabs passes to `tabBar`.
 * Declared locally to avoid the @react-navigation type-version mismatch that
 * surfaces when importing `BottomTabBarProps` directly.
 */
type GlassTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/**
 * Premium floating glass tab bar — a frosted, rounded pill that hovers above the
 * system nav, with a glowing gradient halo behind the focused tab's icon. Shared
 * by every main tab screen for a cohesive, high-end "deep space" feel.
 *
 * Rendered via the Tabs navigator's `tabBar` prop so it fully replaces the
 * default opaque bar.
 */
export function GlassTabBar({ state, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();

  // Only render the configured main tabs (hidden routes like report/recovery
  // are excluded), preserving their order from MAIN_APP_TABS.
  const items = MAIN_APP_TABS.map((tab) => {
    const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
    return routeIndex === -1 ? null : { tab, routeIndex, route: state.routes[routeIndex] };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,15,26,0.95)' }} />

        {items.map(({ tab, routeIndex, route }) => {
          const isFocused = state.index === routeIndex;
          const Icon = isFocused ? tab.iconFocused : tab.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tab.title}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.item}
            >
              <View style={styles.iconWrap}>
                {isFocused && <View style={styles.activeCircle} />}
                <Icon
                  size={22}
                  color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  strokeWidth={isFocused ? 2.2 : 1.8}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR },
                  isFocused && styles.labelActive,
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 12,
    paddingHorizontal: 10,
    // Full-width bar — rounded on the top corners only.
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    // Glow lifting up from the bottom edge.
    shadowColor: 'rgba(124,58,237,0.55)',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 16,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: '800',
  },
});
