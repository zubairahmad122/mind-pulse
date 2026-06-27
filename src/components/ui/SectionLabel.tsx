import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing } from '@/constants/spacing';

type Props = {
  children: ReactNode;
  /** Optional trailing action (e.g. "See all"). */
  action?: { label: string; onPress: () => void };
  /** First label on a screen drops the large top margin so it hugs the header. */
  first?: boolean;
  /** Accent used for the trailing action label. Defaults to a soft blue. */
  accent?: string;
};

/**
 * Unified section header — a small uppercase eyebrow label with a hairline rule
 * that fills the remaining width, plus an optional trailing action.
 *
 * Use this for EVERY section divider across the app so the vertical rhythm and
 * label styling stay perfectly consistent (replaces the various ad-hoc
 * `SectionLabel` / `SectionHeader` implementations that lived inside screens).
 */
export function SectionLabel({ children, action, first = false, accent = '#60a5fa' }: Props) {
  return (
    <View style={[styles.row, { marginTop: first ? spacing.xs : spacing.md }]}>
      <Text style={styles.label}>{children}</Text>
      <View style={styles.line} />
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7} style={styles.actionWrap}>
          <Text style={[styles.action, { color: accent }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: 'rgba(245,247,251,0.5)',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  actionWrap: { paddingLeft: spacing.xs },
  action: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
