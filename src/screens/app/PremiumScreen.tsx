import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSubscription } from '@/context/SubscriptionContext';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/purchaseService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

// ── Design Tokens ──────────────────────────────────────────────────────────────

const T = {
  bg: '#0F0F1A',
  purple: '#8B5CF6',
  gold: '#F59E0B',
  goldGlow: 'rgba(245,158,11,0.3)',
  success: '#10B981',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
} as const;

// ── Bottom CTA height estimate (for ScrollView padding) ────────────────────────
// CTA button (60) + gap (12) + restore (40) + trust (50) + padding (12+4) = ~178
const BOTTOM_CTA_HEIGHT = 180;

// ── Premium features list ──────────────────────────────────────────────────────

const FEATURES = [
  'Unlimited Eye Training Games',
  'Advanced Sleep Analysis & Smart Alarm',
  'All Relaxation Sessions',
  'Personalized AI Wellness Insights',
  'Priority Support & Future Updates',
];

// ── Avatar colors ──────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#8B5CF6', '#60A5FA', '#34D399', '#F59E0B'];
const AVATAR_INITIALS = ['A', 'M', 'J', 'S'];

// ── Crown Icon (gold with glow) ───────────────────────────────────────────────

function CrownIcon({ size = 56, frame }: { size?: number; frame: number }) {
  const glowOpacity = 0.4 + Math.sin(frame * 0.03) * 0.15;
  return (
    <View style={{ width: size + 24, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow behind crown */}
      <View style={{
        position: 'absolute',
        width: size * 2,
        height: size * 2,
        borderRadius: size,
        backgroundColor: T.goldGlow,
        opacity: glowOpacity,
      }} />
      {/* Crown circle */}
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(245,158,11,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(245,158,11,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: size * 0.5 }}>👑</Text>
      </View>
    </View>
  );
}

// ── Feature Row ────────────────────────────────────────────────────────────────

function FeatureRow({ text, index }: { text: string; index: number }) {
  const delay = index * 100;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 500,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <Animated.View style={[styles.featureRow, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.featureCheck}>
        <Check size={14} color="#fff" strokeWidth={3} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
}

// ── Save Badge (pulsing) ───────────────────────────────────────────────────────

function SaveBadge({ frame }: { frame: number }) {
  const pulse = 1 + Math.sin(frame * 0.05) * 0.04;
  return (
    <View style={[styles.saveBadge, { transform: [{ scale: pulse }] }]}>
      <Text style={styles.saveBadgeText}>SAVE 40%</Text>
    </View>
  );
}

// ── Shimmer CTA Button ─────────────────────────────────────────────────────────

function ShimmerCTA({
  label,
  sublabel,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const shimmerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(shimmerX, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmerX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.ctaButton, disabled && { opacity: 0.6 }]}
    >
      <View style={styles.ctaGradient}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.ctaLabel}>{label}</Text>
            {sublabel ? <Text style={styles.ctaSublabel}>{sublabel}</Text> : null}
          </>
        )}
      </View>
      {/* Shimmer sweep */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute',
        top: -4,
        bottom: -4,
        width: 50,
        transform: [
          { translateX: shimmerX.interpolate({ inputRange: [0, 1], outputRange: [-80, 360] }) },
          { rotate: '20deg' },
        ],
      }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Trust Badge Row ────────────────────────────────────────────────────────────

function TrustBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.trustBadge}>
      <Text style={styles.trustIcon}>{icon}</Text>
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, refreshSubscription } = useSubscription();
  const frame = useRef(0);
  const animRef = useRef<number | null>(null);
  const [tick, setTick] = useState(0);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedType, setSelectedType] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  // Frame ticker for animations
  useEffect(() => {
    const tick = () => {
      frame.current += 1;
      if (frame.current % 2 === 0) setTick(t => t + 1);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pkgs = await getOfferings();
      if (cancelled) return;
      setPackages(pkgs);
      setLoadingOfferings(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const monthlyPkg = packages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
  const annualPkg = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
  const fallbackPkg = packages.length > 0 && !monthlyPkg && !annualPkg ? packages[0] : null;

  const activePkg = selectedType === 'yearly'
    ? (annualPkg ?? fallbackPkg)
    : (monthlyPkg ?? fallbackPkg);

  const handlePurchase = useCallback(async () => {
    if (!activePkg || purchasing || restoring) return;
    setError(null);
    setPurchasing(true);
    const result = await purchasePackage(activePkg);
    setPurchasing(false);
    if (result.success) {
      await refreshSubscription();
      setJustUnlocked(true);
      return;
    }
    if (result.error) setError(result.error);
  }, [activePkg, purchasing, restoring, refreshSubscription]);

  const handleRestore = useCallback(async () => {
    if (purchasing || restoring) return;
    setError(null);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      await refreshSubscription();
      setJustUnlocked(true);
      return;
    }
    if (result.error) setError(result.error);
  }, [purchasing, restoring, refreshSubscription]);

  const showPlans = !isPremium && !justUnlocked && !loadingOfferings && !!activePkg;
  const showAlreadyPro = isPremium || justUnlocked;

  return (
    <View style={styles.root}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <AmbientBackground subtle />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Close button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={20} color={T.textSecondary} />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BOTTOM_CTA_HEIGHT + Math.max(insets.bottom, 16) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero Section ────────────────────────────────────── */}
          <View style={styles.hero}>
            <CrownIcon frame={tick} />
            <Text style={styles.heroTitle}>{'Sleep Better.\nSee Clearer. Stress Less.'}</Text>
            <Text style={styles.heroSub}>Join 10,000+ people transforming their daily wellness</Text>
          </View>

          {/* ── Feature List ────────────────────────────────────── */}
          <GlassCard style={styles.featureCard}>
            <View style={styles.featureCardHeader}>
              <Text style={styles.featureCardTitle}>WHAT YOU GET WITH PRO</Text>
            </View>
            <View style={styles.featureDivider} />
            {FEATURES.map((feature, i) => (
              <FeatureRow key={feature} text={feature} index={i} />
            ))}
          </GlassCard>

          {/* ── Social Proof ────────────────────────────────────── */}
          <View style={styles.socialProof}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Text key={i} style={styles.star}>{'★'}</Text>
              ))}
              <Text style={styles.ratingText}>4.8 from 2,400 reviews</Text>
            </View>
            <View style={styles.avatarsRow}>
              {AVATAR_COLORS.map((color, i) => (
                <View
                  key={i}
                  style={[
                    styles.avatar,
                    { marginLeft: i > 0 ? -10 : 0, backgroundColor: color },
                  ]}
                >
                  <Text style={styles.avatarInitial}>{AVATAR_INITIALS[i]}</Text>
                </View>
              ))}
              <Text style={styles.avatarLabel}>Pro members</Text>
            </View>
          </View>

          {/* ── Pricing Section ─────────────────────────────────── */}
          {showPlans && (
            <View style={styles.pricingSection}>
              {/* Plan toggle */}
              <View style={styles.planToggle}>
                <TouchableOpacity
                  style={[styles.planBtn, selectedType === 'monthly' && styles.planBtnActive]}
                  onPress={() => setSelectedType('monthly')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.planBtnText, selectedType === 'monthly' && styles.planBtnTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.planBtn, selectedType === 'yearly' && styles.planBtnActive]}
                  onPress={() => setSelectedType('yearly')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.planBtnText, selectedType === 'yearly' && styles.planBtnTextActive]}>
                    Yearly
                  </Text>
                  <SaveBadge frame={tick} />
                </TouchableOpacity>
              </View>

              {/* Price display */}
              {activePkg && (
                <View style={styles.priceDisplay}>
                  <Text style={styles.price}>{activePkg.product.priceString}</Text>
                  <Text style={styles.pricePeriod}>
                    {selectedType === 'yearly' ? '/year' : '/month'}
                  </Text>
                  {selectedType === 'yearly' && activePkg.product.price != null && (
                    <Text style={styles.priceEquivalent}>
                      {`That's just ~$${Math.round((activePkg.product.price / 12) * 100) / 100}/month`}
                    </Text>
                  )}
                </View>
              )}

              {/* Trial text */}
              <View style={styles.trialRow}>
                <Text style={styles.trialText}>7-day free trial · Cancel anytime</Text>
              </View>
            </View>
          )}

          {showAlreadyPro && (
            <GlassCard style={styles.statusCard}>
              <Text style={styles.statusTitle}>{"You're a Pro member ✨"}</Text>
              <Text style={styles.statusSub}>Thanks for supporting MindPulse.</Text>
            </GlassCard>
          )}

          {!isPremium && !justUnlocked && loadingOfferings && (
            <ActivityIndicator color={T.purple} size="large" style={{ marginVertical: 40 }} />
          )}

          {!isPremium && !justUnlocked && !loadingOfferings && packages.length === 0 && !error && (
            <GlassCard style={styles.statusCard}>
              <Text style={styles.statusTitle}>Plans unavailable</Text>
              <Text style={styles.statusSub}>Please check your connection and try again later.</Text>
            </GlassCard>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        {/* ── Bottom CTA Area (fixed) ─────────────────────────── */}
        {!showAlreadyPro && !loadingOfferings && packages.length > 0 && (
          <View style={[styles.bottomCTA, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* CTA Buttons */}
            <ShimmerCTA
              label="Start Free Trial"
              sublabel={activePkg ? `${activePkg.product.priceString}${selectedType === 'yearly' ? '/year' : '/month'} after trial` : undefined}
              onPress={handlePurchase}
              loading={purchasing}
              disabled={!activePkg || purchasing}
            />
            <TouchableOpacity
              onPress={handleRestore}
              disabled={purchasing || restoring}
              activeOpacity={0.7}
              style={styles.restoreBtn}
            >
              <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore Purchases'}</Text>
            </TouchableOpacity>

            {/* Trust badges */}
            <View style={styles.trustRow}>
              <TrustBadge icon="🔒" label="Secure Payment" />
              <TrustBadge icon="🛡️" label="30-Day Money Back" />
              <TrustBadge icon="✓" label="Cancel Anytime" />
            </View>
          </View>
        )}

        {showAlreadyPro && (
          <View style={[styles.bottomCTA, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.85}
              style={styles.doneButton}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  closeBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
    gap: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: T.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  heroSub: {
    fontSize: 14,
    color: T.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  // ── Feature Card ──
  featureCard: {
    marginBottom: 28,
  },
  featureCardHeader: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  featureCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: T.textMuted,
  },
  featureDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  featureCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.purple,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
    flex: 1,
    lineHeight: 22,
  },

  // ── Social Proof ──
  socialProof: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 16,
    color: T.gold,
  },
  ratingText: {
    fontSize: 13,
    color: T.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  avatarLabel: {
    fontSize: 12,
    color: T.textSecondary,
    marginLeft: 10,
    fontWeight: '500',
  },

  // ── Pricing ──
  pricingSection: {
    marginBottom: 24,
  },
  planToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  planBtnActive: {
    backgroundColor: T.purple,
  },
  planBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textSecondary,
  },
  planBtnTextActive: {
    color: T.textPrimary,
  },
  saveBadge: {
    backgroundColor: T.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  priceDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 38,
    fontWeight: '800',
    color: T.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 14,
    color: T.textSecondary,
    marginTop: 4,
  },
  priceEquivalent: {
    fontSize: 13,
    color: T.textMuted,
    marginTop: 6,
  },
  trialRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.success,
  },

  // ── CTA ──
  bottomCTA: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: T.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  ctaButton: {
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.purple,
    borderRadius: 18,
    gap: 8,
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: T.textPrimary,
    letterSpacing: 0.3,
  },
  ctaSublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textMuted,
  },

  // ── Trust Badges ──
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 14,
    paddingBottom: 4,
  },
  trustBadge: {
    alignItems: 'center',
    gap: 4,
  },
  trustIcon: {
    fontSize: 16,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: T.textMuted,
  },

  // ── Status ──
  statusCard: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
  },
  statusSub: {
    fontSize: 14,
    color: T.textSecondary,
  },
  doneButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: T.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '800',
    color: T.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
});
