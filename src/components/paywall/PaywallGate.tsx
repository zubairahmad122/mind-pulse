import { Crown, Lock } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { glassCard } from '@/constants/glassCard';
import { COLORS, colors } from '@/constants/colors';
import { ENTITLEMENTS, FEATURE_NAMES, type FeatureId } from '@/constants/entitlements';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSubscription } from '@/context/SubscriptionContext';
import { usePaywall } from '@/hooks/usePaywall';

type Props = {
  featureId: FeatureId;
  children: ReactNode;
};

/**
 * Protects premium content — the single source of truth for "does the user
 * have access" everywhere in the app. Access = SubscriptionContext.isPremium,
 * OR the feature is tagged 'free' in ENTITLEMENTS (e.g. Reset Wave, Weekly
 * Summary). Pro/free users see `children` as-is.
 *
 * Everyone else sees `children` fully visible with a small gold "PRO" badge
 * resting on its outer top-right corner (or, if `children` is empty — the
 * whole-screen lock pattern — a standalone locked-feature card). Tapping
 * anywhere opens the global PaywallModal via usePaywall().
 */
export function PaywallGate({ featureId, children }: Props) {
  const { isPremium, loading } = useSubscription();
  const { showPaywall } = usePaywall();
  const hasAccess = isPremium || ENTITLEMENTS[featureId] === 'free';

  // While subscription state is resolving, show normal content rather than
  // flashing a lock badge that may disappear a moment later.
  if (loading || hasAccess) {
    return <>{children}</>;
  }

  if (Children.count(children) === 0) {
    return (
      <Pressable onPress={() => showPaywall(featureId)} style={styles.lockedCard}>
        <View style={styles.lockedIconWrap}>
          <Lock size={22} color={colors.accent.purple} />
        </View>
        <Text style={styles.lockedTitle}>{FEATURE_NAMES[featureId]}</Text>
        <Text style={styles.lockedSubtitle}>This is a Pro feature</Text>
        <View style={styles.badge}>
          <Lock size={14} color={colors.text.primary} />
          <Text style={styles.badgeLabel}>Unlock with Pro</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => showPaywall(featureId)} style={styles.wrapper}>
      <View pointerEvents="none">{children}</View>
      <View style={styles.cornerBadge}>
        <Crown size={10} color={COLORS.bg} />
        <Text style={styles.cornerBadgeText}>PRO</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  cornerBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  cornerBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: COLORS.bg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lockedCard: {
    ...glassCard,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  lockedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  lockedTitle: { ...typography.headingSmall, color: colors.text.primary },
  lockedSubtitle: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.purple,
  },
  badgeLabel: {
    ...typography.label,
    color: colors.text.primary,
    fontWeight: '700',
  },
});
