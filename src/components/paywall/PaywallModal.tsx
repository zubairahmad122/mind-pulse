import { Check, Crown, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, colors } from '@/constants/colors';
import {
  FONTS,
  GLASS_CARD,
  PRO_GOLD,
  RADIUS,
  STATUS_COLORS,
} from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { radius } from '@/constants/radius';
import { typography } from '@/constants/typography';
import type { FeatureId } from '@/constants/entitlements';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/services/purchaseService';
import { GradientCTA } from '@/components/ui/GradientCTA';

type PaywallCopy = {
  title: string;
  subtitle: string;
  benefits: string[];
};

const DEFAULT_COPY: PaywallCopy = {
  title: 'Unlock MindPulse Pro',
  subtitle: 'Get full access to every tool for better sleep, eyes, and mind.',
  benefits: [
    'Unlock every premium feature',
    'New content added regularly',
    'Cancel anytime',
  ],
};

const PAYWALL_COPY: Partial<Record<FeatureId, PaywallCopy>> = {
  relax_sleep_drop: {
    title: 'Improve your sleep quality',
    subtitle: 'Sleep Drop helps you wind down and fall asleep faster.',
    benefits: [
      'Guided wind-down sessions',
      'Deep sleep soundscapes',
      'Track your sleep streak',
    ],
  },
  relax_body_scan: {
    title: 'Unlock deeper calm sessions',
    subtitle: 'Body Scan guides you through a full-body relaxation practice.',
    benefits: [
      'Full library of calm sessions',
      'New sessions added monthly',
      'No ads, ever',
    ],
  },
  relax_tension_release: {
    title: 'Release tension, find calm',
    subtitle: 'Tension Release helps you let go of stress, fast.',
    benefits: [
      'Targeted tension-release audio',
      'Use anytime, anywhere',
      'Pairs with your daily routine',
    ],
  },
  audio_mindful_reset: {
    title: 'Unlock deeper calm sessions',
    subtitle: 'Mindful Reset is part of the full premium audio library.',
    benefits: [
      'Full premium audio library',
      'Offline-ready sessions',
      'Sleep timer on every track',
    ],
  },
  report_extended_trends: {
    title: 'See your full progress story',
    subtitle: 'Extended trends reveal patterns across weeks, not just days.',
    benefits: [
      '7-day score trends',
      'Full score breakdowns',
      'Spot patterns before they become habits',
    ],
  },
  journal_archive: {
    title: 'Never lose a reflection',
    subtitle: 'Your full journal archive, always within reach.',
    benefits: [
      'Unlimited journal history',
      'Search past reflections',
      'AI insights on your entries',
    ],
  },
  voice_guidance_tts: {
    title: 'Get guided, every step',
    subtitle: 'Voice guidance walks you through every session.',
    benefits: [
      'Spoken guidance for every session',
      'Multiple voice styles',
      'Hands-free, eyes-closed sessions',
    ],
  },
};

type Props = {
  visible: boolean;
  onClose: () => void;
  featureId?: string;
};

export function PaywallModal({ visible, onClose, featureId }: Props) {
  const insets = useSafeAreaInsets();
  const { isPremium, refreshSubscription } = useSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy =
    (featureId && PAYWALL_COPY[featureId as FeatureId]) || DEFAULT_COPY;

  // Fetch offerings once each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      const pkgs = await getOfferings();
      if (cancelled) return;
      setPackages(pkgs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Already subscribed (e.g. listener fired after purchase) → close automatically.
  useEffect(() => {
    if (visible && isPremium) {
      onClose();
    }
  }, [visible, isPremium, onClose]);

  if (!visible) return null;

  const monthlyPkg =
    packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
  const annualPkg =
    packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
  const fallbackPkg =
    packages.length > 0 && !monthlyPkg && !annualPkg ? packages[0] : null;

  const handlePurchase = async (pkg: PurchasesPackage | null) => {
    if (!pkg || purchasingId || restoring) return;
    setError(null);
    setPurchasingId(pkg.identifier);
    const result = await purchasePackage(pkg);
    setPurchasingId(null);

    if (result.success) {
      await refreshSubscription();
      onClose();
      return;
    }
    // Cancellation resolves with no `error` — close silently, no message.
    if (result.error) {
      setError(result.error);
    }
  };

  const handleRestore = async () => {
    if (purchasingId || restoring) return;
    setError(null);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      await refreshSubscription();
      onClose();
      return;
    }
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <BlurView
            intensity={42}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(19,16,40,0.96)', 'rgba(9,9,15,0.99)']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.22)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topHighlight}
            pointerEvents="none"
          />
          <View style={styles.handleBar} />

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.premiumIcon}>
              <Crown size={23} color={PRO_GOLD} strokeWidth={1.8} />
            </View>
            <Text style={styles.eyebrow}>MINDPULSE PRO</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>

            <View style={styles.benefits}>
              {copy.benefits.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <View style={styles.checkBox}>
                    <Check
                      size={13}
                      color={colors.accent.purple}
                      strokeWidth={2.4}
                    />
                  </View>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator
                color={colors.accent.purple}
                style={styles.loader}
              />
            ) : packages.length === 0 ? (
              <Text style={styles.errorText}>
                Plans unavailable right now. Please try again later.
              </Text>
            ) : (
              <View style={styles.plans}>
                {annualPkg && (
                  <View style={styles.planWrap}>
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                    <GradientCTA
                      label="Subscribe Yearly"
                      sublabel={`${annualPkg.product.priceString} / year`}
                      onPress={() => handlePurchase(annualPkg)}
                      disabled={purchasingId !== null || restoring}
                      loading={purchasingId === annualPkg.identifier}
                      height={60}
                    />
                  </View>
                )}

                {monthlyPkg && (
                  <GradientCTA
                    variant="secondary"
                    label="Subscribe Monthly"
                    sublabel={`${monthlyPkg.product.priceString} / month`}
                    onPress={() => handlePurchase(monthlyPkg)}
                    disabled={purchasingId !== null || restoring}
                    loading={purchasingId === monthlyPkg.identifier}
                    height={58}
                  />
                )}

                {fallbackPkg && (
                  <GradientCTA
                    label="Subscribe"
                    sublabel={fallbackPkg.product.priceString}
                    onPress={() => handlePurchase(fallbackPkg)}
                    disabled={purchasingId !== null || restoring}
                    loading={purchasingId === fallbackPkg.identifier}
                    height={60}
                  />
                )}
              </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              onPress={handleRestore}
              disabled={purchasingId !== null || restoring}
              activeOpacity={0.7}
              style={styles.restoreButton}
            >
              <Text style={styles.restoreText}>
                {restoring ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,4,10,0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
    borderTopWidth: 1,
    borderColor: GLASS_CARD.border,
    paddingTop: spacing.sm,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 42,
    right: 42,
    height: 1,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 18,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PRO_GOLD + '35',
    backgroundColor: PRO_GOLD + '12',
  },
  eyebrow: {
    color: PRO_GOLD,
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 7,
  },
  title: {
    fontFamily: FONTS.heading,
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    marginBottom: 18,
  },
  benefits: {
    width: '100%',
    gap: 0,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: GLASS_CARD.border,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  benefitRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.purple + '16',
  },
  benefitText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  plans: {
    width: '100%',
    gap: spacing.sm,
    marginTop: 4,
    marginBottom: 8,
  },
  planWrap: {
    position: 'relative',
    width: '100%',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -9,
    right: 14,
    zIndex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: '#171329',
    borderWidth: 1,
    borderColor: PRO_GOLD + '80',
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: PRO_GOLD,
  },
  errorText: {
    ...typography.body,
    color: STATUS_COLORS.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  restoreButton: { paddingHorizontal: 18, paddingVertical: 12 },
  restoreText: {
    ...typography.label,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
