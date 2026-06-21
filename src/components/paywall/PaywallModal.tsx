import { Check, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { COLORS, colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { radius } from '@/constants/radius';
import { typography } from '@/constants/typography';
import type { FeatureId } from '@/constants/entitlements';
import { useSubscription } from '@/context/SubscriptionContext';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/purchaseService';

type PaywallCopy = {
  title: string;
  subtitle: string;
  benefits: string[];
};

const DEFAULT_COPY: PaywallCopy = {
  title: 'Unlock MindPulse Pro',
  subtitle: 'Get full access to every tool for better sleep, eyes, and mind.',
  benefits: ['Unlock every premium feature', 'New content added regularly', 'Cancel anytime'],
};

const PAYWALL_COPY: Partial<Record<FeatureId, PaywallCopy>> = {
  relax_sleep_drop: {
    title: 'Improve your sleep quality',
    subtitle: 'Sleep Drop helps you wind down and fall asleep faster.',
    benefits: ['Guided wind-down sessions', 'Deep sleep soundscapes', 'Track your sleep streak'],
  },
  relax_body_scan: {
    title: 'Unlock deeper calm sessions',
    subtitle: 'Body Scan guides you through a full-body relaxation practice.',
    benefits: ['Full library of calm sessions', 'New sessions added monthly', 'No ads, ever'],
  },
  relax_tension_release: {
    title: 'Release tension, find calm',
    subtitle: 'Tension Release helps you let go of stress, fast.',
    benefits: ['Targeted tension-release audio', 'Use anytime, anywhere', 'Pairs with your daily routine'],
  },
  eye_focus_sprint: {
    title: 'Reduce eye strain faster',
    subtitle: 'Focus Sprint trains your eyes with quick daily reps.',
    benefits: ['Full set of eye training games', 'Track focus improvements over time', 'Built for screen-heavy days'],
  },
  eye_dichoptic: {
    title: 'Reduce eye strain faster',
    subtitle: 'Dichoptic training builds visual stamina with color-based reps.',
    benefits: ['Advanced 3D reaction training', 'Personalized color modes', 'Full eye-care toolkit'],
  },
  audio_mindful_reset: {
    title: 'Unlock deeper calm sessions',
    subtitle: 'Mindful Reset is part of the full premium audio library.',
    benefits: ['Full premium audio library', 'Offline-ready sessions', 'Sleep timer on every track'],
  },
  report_extended_trends: {
    title: 'See your full progress story',
    subtitle: 'Extended trends reveal patterns across weeks, not just days.',
    benefits: ['7-day score trends', 'Full score breakdowns', 'Spot patterns before they become habits'],
  },
  journal_archive: {
    title: 'Never lose a reflection',
    subtitle: 'Your full journal archive, always within reach.',
    benefits: ['Unlimited journal history', 'Search past reflections', 'AI insights on your entries'],
  },
  voice_guidance_tts: {
    title: 'Get guided, every step',
    subtitle: 'Voice guidance walks you through every session.',
    benefits: ['Spoken guidance for every session', 'Multiple voice styles', 'Hands-free, eyes-closed sessions'],
  },
};

type Props = {
  visible: boolean;
  onClose: () => void;
  featureId?: string;
};

export function PaywallModal({ visible, onClose, featureId }: Props) {
  const { isPremium, refreshSubscription } = useSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = (featureId && PAYWALL_COPY[featureId as FeatureId]) || DEFAULT_COPY;

  // Fetch offerings once each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
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

  const monthlyPkg = packages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
  const annualPkg = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
  const fallbackPkg = packages.length > 0 && !monthlyPkg && !annualPkg ? packages[0] : null;

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={styles.sheet}
        >
          <View style={styles.handleBar} />

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.benefits}>
            {copy.benefits.map(benefit => (
              <View key={benefit} style={styles.benefitRow}>
                <Check size={16} color={colors.accent.purple} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent.purple} style={styles.loader} />
          ) : packages.length === 0 ? (
            <Text style={styles.errorText}>Plans unavailable right now. Please try again later.</Text>
          ) : (
            <View style={styles.plans}>
              {annualPkg && (
                <TouchableOpacity
                  style={[styles.planBtn, styles.planBtnHighlight]}
                  onPress={() => handlePurchase(annualPkg)}
                  disabled={purchasingId !== null || restoring}
                  activeOpacity={0.85}
                >
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>BEST VALUE</Text>
                  </View>
                  {purchasingId === annualPkg.identifier ? (
                    <ActivityIndicator color={colors.text.primary} />
                  ) : (
                    <>
                      <Text style={styles.planLabel}>Subscribe Yearly</Text>
                      <Text style={styles.planPrice}>{annualPkg.product.priceString} / year</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {monthlyPkg && (
                <TouchableOpacity
                  style={styles.planBtn}
                  onPress={() => handlePurchase(monthlyPkg)}
                  disabled={purchasingId !== null || restoring}
                  activeOpacity={0.85}
                >
                  {purchasingId === monthlyPkg.identifier ? (
                    <ActivityIndicator color={colors.text.primary} />
                  ) : (
                    <>
                      <Text style={styles.planLabel}>Subscribe Monthly</Text>
                      <Text style={styles.planPrice}>{monthlyPkg.product.priceString} / month</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {fallbackPkg && (
                <TouchableOpacity
                  style={[styles.planBtn, styles.planBtnHighlight]}
                  onPress={() => handlePurchase(fallbackPkg)}
                  disabled={purchasingId !== null || restoring}
                  activeOpacity={0.85}
                >
                  {purchasingId === fallbackPkg.identifier ? (
                    <ActivityIndicator color={colors.text.primary} />
                  ) : (
                    <>
                      <Text style={styles.planLabel}>Subscribe</Text>
                      <Text style={styles.planPrice}>{fallbackPkg.product.priceString}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity onPress={handleRestore} disabled={purchasingId !== null || restoring} activeOpacity={0.7}>
            <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore Purchases'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.md,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  benefits: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    ...typography.bodyLarge,
    color: colors.text.primary,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  plans: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  planBtn: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  planBtnHighlight: {
    backgroundColor: colors.accent.purple,
    borderColor: colors.accent.purple,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: colors.accent.purple,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.accent.purple,
  },
  planLabel: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '700',
  },
  planPrice: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorText: {
    ...typography.body,
    color: colors.status.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  restoreText: {
    ...typography.label,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
