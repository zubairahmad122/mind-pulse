import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedBackground from '@/components/AnimatedBackground';
import { PILLAR_THEME, type PillarKey } from '@/constants/theme';
import { PillarProvider } from '@/context/PillarContext';
import { spacing } from '@/constants/spacing';
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
   * Pillar theme for the background gradient.
   * - 'mind': dark navy (default, matches dashboard)
   * - 'sleep': deep purple
   * - 'eyes': dark teal
   * Screens can also pass a custom gradient array via `customGradient`.
   */
  pillar?: PillarKey;
  /** Override the gradient colors entirely. Takes precedence over `pillar`. */
  customGradient?: readonly [string, string, string];
};

export function ScreenShell({
  children,
  scroll = true,
  contentStyle,
  edges = ['top'],
  safeBottom = false,
  pillar = 'mind',
  customGradient,
  ambient,
}: Props & { ambient?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  // On tab screens this is the floating glass bar's reserved space; 0 elsewhere.
  const tabBarSpace = useTabBarSpace();

  const gradientColors = customGradient ?? PILLAR_THEME[pillar].bgGradient;

  const scrollBottomPadding =
    spacing.xl + tabBarSpace + (safeBottom ? Math.max(insets.bottom, spacing.sm) : 0);

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
        { paddingBottom: scrollBottomPadding },
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
        { paddingBottom: scrollBottomPadding },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={safeAreaEdges}>
      {/* Pillar gradient background — replaces the old flat backgroundColor */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Animated ambient depth layer */}
      <AnimatedBackground />
      {/* Fixed ambient overlay (glow, beams, particles) — rendered outside ScrollView */}
      {ambient}
      <PillarProvider pillar={pillar}>
        {content}
      </PillarProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#040810',
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
});
