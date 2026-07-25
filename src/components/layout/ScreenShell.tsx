import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedBackground from '@/components/AnimatedBackground';
import { BACKGROUND, SPACING } from '@/constants/designSystem';
import { PillarProvider, type PillarKey } from '@/context/PillarContext';
import { useTabBarSpace } from '@/components/layout/GlassTabBar';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Safe-area edges for the shell. Tab screens: top only. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /**
   * Stack / modal screens: pad above the system nav bar.
   * Do not use on tab screens (they already sit above the tab bar).
   */
  safeBottom?: boolean;
  /**
   * Pillar accent for this screen's icons/highlights/progress fill.
   * Background is global and identical on every screen — this only drives
   * per-screen accent color via `PillarProvider`.
   */
  pillar?: PillarKey;
  /**
   * Optional fixed footer (e.g. a primary CTA) — rendered below the scroll
   * area, outside it, so it never scrolls away and the user never has to
   * scroll to reach it. Only meaningful when `scroll` is true.
   */
  footer?: React.ReactNode;
};

export function ScreenShell({
  children,
  scroll = true,
  contentStyle,
  edges = ['top'],
  safeBottom = false,
  pillar = 'mind',
  ambient,
  footer,
}: Props & { ambient?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  // On tab screens this is the floating glass bar's reserved space; 0 elsewhere.
  const tabBarSpace = useTabBarSpace();

  const bottomClearance =
    SPACING.screenBottom + tabBarSpace + (safeBottom ? Math.max(insets.bottom, 8) : 0);

  const safeAreaEdges: Props['edges'] = safeBottom
    ? edges.includes('bottom')
      ? edges
      : [...edges, 'bottom']
    : edges;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: footer ? SPACING.section : bottomClearance },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.scrollContent,
        { paddingBottom: bottomClearance },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={safeAreaEdges}>
      {/* Global background — identical on every screen (spec section 2):
          base fill + overlay gradient + top-left radial glow. */}
      <AnimatedBackground />
      <PillarProvider pillar={pillar}>
        {/* Fixed ambient overlay (glow, beams, particles) — rendered outside
            ScrollView, but inside PillarProvider so it picks up this
            screen's accent instead of the context default. */}
        {ambient}
        <View style={styles.flex}>
          {content}
          {footer && (
            <View style={[styles.footer, { paddingBottom: tabBarSpace + 12 }]}>
              {footer}
            </View>
          )}
        </View>
      </PillarProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND.base,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screenH,
  },
  footer: {
    paddingHorizontal: SPACING.screenH,
    paddingTop: 12,
    backgroundColor: BACKGROUND.base,
  },
});
