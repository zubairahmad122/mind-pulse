import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedBackground from '@/components/AnimatedBackground';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

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
};

export function ScreenShell({
  children,
  scroll = true,
  contentStyle,
  edges = ['top'],
  safeBottom = false,
}: Props) {
  const insets = useSafeAreaInsets();

  const scrollBottomPadding =
    spacing.xl + (safeBottom ? Math.max(insets.bottom, spacing.sm) : 0);

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
      <AnimatedBackground />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
});
