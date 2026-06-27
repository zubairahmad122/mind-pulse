// ──────────────────────────────────────────────────────────────────────────────
// PaywallScreen — Premium paywall with features, pricing, and CTA
// ──────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { MPButton } from '@/components/atoms/MPButton';
import { MPCard } from '@/components/atoms/MPCard';
import { MPPaywallFeatureList } from '@/components/organisms/MPPaywallFeatureList';
import { useUserStore } from '@/stores/useUserStore';
import { useHaptics } from '@/hooks/useHaptics';
import { COLORS, SPACING, RADIUS } from '@/theme';

const FEATURES = [
  { label: 'Unlimited Eye Training Games' },
  { label: 'Advanced Sleep Analysis & Smart Alarm' },
  { label: 'All Relaxation Sessions (Breathe, Release, Ground, Sleep)' },
  { label: 'Personalized AI Wellness Insights' },
  { label: 'Priority Support & Future Updates' },
];

const TRUST_BADGES = [
  { iconName: 'Shield', label: 'Secure Payment' },
  { iconName: 'RefreshCw', label: '30-Day Money Back' },
  { iconName: 'Check', label: 'Cancel Anytime' },
];

const AVATARS = [COLORS.purple, COLORS.cyan, COLORS.green, COLORS.gold];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mediumImpact } = useHaptics();
  const upgradeToPro = useUserStore((s) => s.upgradeToPro);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  // ── SAVE 40% pulse animation ──────────────────────────────
  const saveScale = useSharedValue(1);
  useEffect(() => {
    saveScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [saveScale]);

  const saveBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const handleSubscribe = () => {
    mediumImpact();
    upgradeToPro();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Close paywall"
        style={{
          position: 'absolute',
          top: insets.top + SPACING.sm,
          left: SPACING['2xl'],
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: COLORS.elevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MPIcon name="X" size="sm" color="muted" />
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: SPACING['2xl'],
          paddingTop: insets.top + SPACING['4xl'] + 48,
          paddingBottom: insets.bottom + SPACING['4xl'],
          gap: SPACING.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', gap: SPACING.md }}>
          <MPIcon name="Crown" size="xl" color="gold" />
          <MPText variant="h2" color="primary" style={{ textAlign: 'center' }}>
            Sleep Better. See Clearer.{'\n'}Stress Less.
          </MPText>
          <MPText variant="body-sm" color="secondary" style={{ textAlign: 'center' }}>
            Join 10,000+ people transforming their daily wellness
          </MPText>
        </View>

        {/* ── Feature List ──────────────────────────────────── */}
        <MPCard>
          <MPPaywallFeatureList features={FEATURES} />
        </MPCard>

        {/* ── Social Proof ──────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MPIcon key={i} name="Star" size="xs" color="gold" />
            ))}
          </View>
          <MPText variant="body-sm" color="secondary">
            4.8 from 2,400 reviews
          </MPText>
        </View>

        {/* ── Avatars ───────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row' }}>
            {AVATARS.map((color, i) => (
              <View
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: color,
                  borderWidth: 2,
                  borderColor: COLORS.bg,
                  marginLeft: i === 0 ? 0 : -8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MPText variant="caption-xs" color="primary">
                  {['A', 'M', 'J', 'S'][i]}
                </MPText>
              </View>
            ))}
          </View>
        </View>

        {/* ── Pricing Toggle ────────────────────────────────── */}
        <View style={{ flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.sm, padding: 4 }}>
          {(['yearly', 'monthly'] as const).map((plan) => (
            <TouchableOpacity
              key={plan}
              onPress={() => setSelectedPlan(plan)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: RADIUS.sm - 2,
                alignItems: 'center',
                backgroundColor: selectedPlan === plan ? COLORS.purple : 'transparent',
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === plan }}
            >
              <MPText variant="body-sm" color={selectedPlan === plan ? 'primary' : 'muted'}>
                {plan === 'yearly' ? 'Yearly' : 'Monthly'}
              </MPText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Savings Badge (animated pulse) ────────────────── */}
        {selectedPlan === 'yearly' && (
          <Animated.View style={[{ alignItems: 'center' }, saveBadgeStyle]}>
            <View
              style={{
                backgroundColor: COLORS.green,
                borderRadius: RADIUS.full,
                paddingHorizontal: 14,
                paddingVertical: 5,
              }}
            >                  <MPText variant="caption-xs" color="primary">
                SAVE 40%
              </MPText>
            </View>
          </Animated.View>
        )}

        {/* ── Price Display ─────────────────────────────────── */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <MPText variant="h1" color="primary">
            {selectedPlan === 'yearly' ? '$79.98/yr' : '$9.99/mo'}
          </MPText>
          {selectedPlan === 'yearly' && (
            <MPText variant="body-sm" color="secondary">
              that's just ~$6.67/month
            </MPText>
          )}
        </View>

        {/* ── Trial Text ────────────────────────────────────── */}
        <MPText variant="body-sm" color="green" style={{ textAlign: 'center' }}>
          7-day free trial • Cancel anytime
        </MPText>

        {/* ── Trust Badges ──────────────────────────────────── */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg }}>
          {TRUST_BADGES.map((badge) => (
            <View key={badge.label} style={{ alignItems: 'center', gap: 4 }}>
              <MPIcon name={badge.iconName} size="xs" color="muted" />
              <MPText variant="caption-xs" color="muted">
                {badge.label}
              </MPText>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Fixed CTA ───────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: SPACING['2xl'],
          paddingBottom: insets.bottom + SPACING.lg,
          paddingTop: SPACING.md,
          backgroundColor: COLORS.bg,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderSubtle,
        }}
      >
        <View style={{ overflow: 'hidden', borderRadius: RADIUS.sm }}>
          <MPButton
            variant="primary"
            size="lg"
            fullWidth
            title="Start Free Trial"
            onPress={handleSubscribe}
          />
        </View>
        <TouchableOpacity
          onPress={() => {}}
          style={{ alignItems: 'center', paddingVertical: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
        >
          <MPText variant="body-sm" color="muted">
            Restore Purchases
          </MPText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
