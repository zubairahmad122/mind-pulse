import { Check, Crown, Lock } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { ENTITLEMENTS, FEATURE_DESCRIPTIONS, FEATURE_NAMES, type FeatureId } from '@/constants/entitlements';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { FONTS, GLASS_CARD, PRO_GOLD, RADIUS, SHADOWS } from '@/constants/designSystem';
import { useSubscription } from '@/context/SubscriptionContext';
import { usePaywall } from '@/hooks/usePaywall';
import { GradientCTA } from '@/components/ui/GradientCTA';

const BENEFITS = ['Unlimited sessions', 'Track your weekly progress', 'Advanced insights', 'Full premium toolkit'];

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
      <View style={styles.lockedCard}>
        <View style={styles.lockedTopBadge}>
          <Crown size={12} color={colors.background.primary} />
          <Text style={styles.lockedTopBadgeText}>MindPulse Pro</Text>
        </View>

        <View style={styles.lockedIconWrap}>
          <Lock size={30} color={colors.accent.purple} />
        </View>

        <Text style={styles.lockedTitle}>{FEATURE_NAMES[featureId]}</Text>
        <Text style={styles.lockedSubtitle}>{FEATURE_DESCRIPTIONS[featureId]}</Text>

        <GradientCTA
          label="Unlock with Pro"
          onPress={() => showPaywall(featureId)}
          textColor="#03212C"
          style={styles.lockedCta}
        />

        <View style={styles.lockedBenefits}>
          {BENEFITS.map(b => (
            <View key={b} style={styles.lockedBenefitRow}>
              <Check size={14} color={colors.text.secondary} strokeWidth={2.5} />
              <Text style={styles.lockedBenefitText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={() => showPaywall(featureId)} style={styles.wrapper}>
      <View pointerEvents="none">{children}</View>
      <View style={styles.cornerBadge}>
        <Crown size={10} color={colors.background.primary} />
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
    backgroundColor: PRO_GOLD,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  cornerBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.background.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lockedCard: {
    backgroundColor: GLASS_CARD.bg,
    borderWidth: 1,
    borderColor: GLASS_CARD.border,
    borderRadius: RADIUS.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...SHADOWS.card,
  },
  lockedTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: PRO_GOLD,
    marginBottom: spacing.xs,
  },
  lockedTopBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.4,
  },
  lockedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: colors.accent.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  lockedTitle: {
    fontFamily: FONTS.heading,
    fontSize: 30,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  lockedSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  lockedCta: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
  lockedBenefits: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  lockedBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedBenefitText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
