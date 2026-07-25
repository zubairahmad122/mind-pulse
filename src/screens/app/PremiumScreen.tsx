import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Brain, Crown, Eye, Headphones, Moon, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { BUTTON, FONTS, PILLAR_COLORS, PRO_GOLD, RADIUS, STATUS_COLORS, TYPOGRAPHY } from '@/constants/designSystem';
import { useSubscription } from '@/context/SubscriptionContext';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/purchaseService';

// ── Design Tokens ──────────────────────────────────────────────────────────────
// Radius/gradient now read from the frozen design system (RADIUS.card,
// BUTTON.primaryGradient) instead of one-off values, so this screen matches
// Home/Relax/Eye/Challenges/Profile. Background/safe-area come from the same
// ScreenShell + AnimatedBackground every other screen uses.

const GOLD = PRO_GOLD;
// Slightly darker than the previous round so the primary gradient CTA stays
// the single brightest element on the card.
const CARD_GRADIENT = ['#160F26', '#0B0817'] as const;

const FEATURES: { icon: typeof Eye; color: string; lead: string; desc: string }[] = [
  { icon: Headphones, color: PILLAR_COLORS.relax, lead: 'Unlimited Sessions', desc: 'Every guided relax and sleep session, unlocked.' },
  { icon: Brain, color: PILLAR_COLORS.mind, lead: 'Advanced Insights', desc: 'Personalized AI analysis of your wellness patterns.' },
  { icon: Moon, color: PILLAR_COLORS.sleep, lead: 'Adaptive Alarm', desc: 'Use your selected wake window and gentle alarm sounds.' },
  { icon: Eye, color: PILLAR_COLORS.eye, lead: 'Eye Comfort', desc: 'Guided breaks, recovery sessions, and visual activities.' },
];

// ── Feature Row ────────────────────────────────────────────────────────────────

function FeatureRow({
  icon: Icon,
  color,
  lead,
  desc,
  last,
  index,
}: {
  icon: typeof Eye;
  color: string;
  lead: string;
  desc: string;
  last: boolean;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeIn.delay(150 + index * 80).duration(300)}
      style={[styles.featureRow, !last && styles.featureRowDivider]}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: color + '18', borderColor: color + '28' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureLead}>{lead}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

// ── Plan Button — tapping it purchases that plan directly, no separate CTA ────

function PlanButton({
  variant,
  line1,
  line2,
  loading,
  disabled,
  onPress,
}: {
  variant: 'primary' | 'secondary';
  line1: string;
  line2: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? '#03212C' : '#FFFFFF'} size="small" />
  ) : (
    <View style={styles.planTextWrap}>
      <Text style={variant === 'primary' ? styles.planLine1Primary : styles.planLine1Secondary}>{line1}</Text>
      <Text style={variant === 'primary' ? styles.planLine2Primary : styles.planLine2Secondary}>{line2}</Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={styles.planBtnShell}>
        <LinearGradient colors={BUTTON.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.planBtn, disabled && { opacity: 0.6 }]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.planBtn, styles.planBtnOutline, disabled && { opacity: 0.6 }]}
    >
      {content}
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, refreshSubscription } = useSubscription();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  // Show 2 features up front; "View all features" opens a modal with the
  // full list instead of expanding inline — keeps the card itself compact.
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const visibleFeatures = FEATURES.slice(0, 2);
  const hiddenFeatureCount = FEATURES.length - visibleFeatures.length;

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
  // Only used if the offering has neither a recognized monthly nor annual
  // package — still lets a single configured plan work instead of showing nothing.
  const fallbackPkg = packages.length > 0 && !monthlyPkg && !annualPkg ? packages[0] : null;

  // Real monthly-equivalent for the annual plan, and a real savings % against
  // the actual monthly price — never a hardcoded "Save 40%".
  const annualMonthlyEquivalent = annualPkg?.product.price != null
    ? Math.round((annualPkg.product.price / 12) * 100) / 100
    : null;
  const savingsPct = annualMonthlyEquivalent != null && monthlyPkg?.product.price
    ? Math.round((1 - annualMonthlyEquivalent / monthlyPkg.product.price) * 100)
    : null;

  const handlePurchase = useCallback(async (pkg: PurchasesPackage) => {
    if (purchasingId || restoring) return;
    setError(null);
    setPurchasingId(pkg.identifier);
    const result = await purchasePackage(pkg);
    setPurchasingId(null);
    if (result.success) {
      await refreshSubscription();
      setJustUnlocked(true);
      return;
    }
    if (result.error) setError(result.error);
  }, [purchasingId, restoring, refreshSubscription]);

  const handleRestore = useCallback(async () => {
    if (purchasingId || restoring) return;
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
  }, [purchasingId, restoring, refreshSubscription]);

  const showAlreadyPro = isPremium || justUnlocked;
  const anyBusy = purchasingId !== null || restoring;

  // Card entrance: scale 0.95 -> 1 + fade, 220ms (FadeIn below handles opacity).
  const cardScale = useSharedValue(0.95);
  useEffect(() => {
    cardScale.value = withTiming(1, { duration: 220 });
  }, [cardScale]);
  const cardScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  return (
    <ScreenShell
      scroll={false}
      edges={['top', 'bottom']}
      safeBottom
      pillar="challenge"
      contentStyle={styles.shellContent}
      ambient={<AmbientBackground subtle />}
    >
      <Animated.View
        entering={FadeIn.duration(220)}
        style={[styles.cardWrap, cardScaleStyle]}
      >
        <GlassCard noPadding tint={CARD_GRADIENT} style={styles.card}>
        <View style={styles.cardInner}>
          {showAlreadyPro ? (
            <View style={styles.alreadyProWrap}>
              <View style={styles.crownWrap}>
                <Crown size={22} color={GOLD} fill={GOLD + '33'} />
              </View>
              <Text style={styles.badgeLabel}>MINDPULSE PRO</Text>
              <Text style={styles.title}>{"You're a Pro member ✨"}</Text>
              <Text style={styles.finePrint}>Thanks for supporting MindPulse.</Text>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} style={styles.planBtnShell}>
                <LinearGradient colors={BUTTON.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planBtn}>
                  <Text style={styles.planLine1Primary}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            // Everything scrolls together — crown through fine print — instead
            // of splitting into a "scrolling top / fixed bottom" that needed
            // the ScrollView to get an exact measured height it wasn't
            // reliably getting, which is what was clipping the feature list
            // and crowding the pricing section against it.
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollAreaContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.crownWrap}>
                <Crown size={22} color={GOLD} fill={GOLD + '33'} />
              </View>
              <Text style={styles.badgeLabel}>MINDPULSE PRO</Text>

              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                Unlock MindPulse Pro
              </Text>
              <Text style={styles.subtitle}>
                One membership for better sleep,{'\n'}calmer days, and healthier eyes.
              </Text>

              <View style={styles.featureList}>
                {visibleFeatures.map((f, i) => (
                  <FeatureRow
                    key={f.lead}
                    icon={f.icon}
                    color={f.color}
                    lead={f.lead}
                    desc={f.desc}
                    last={i === visibleFeatures.length - 1 && hiddenFeatureCount === 0}
                    index={i}
                  />
                ))}
                {hiddenFeatureCount > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowFeaturesModal(true)}
                    activeOpacity={0.7}
                    style={styles.readMoreBtn}
                  >
                    <Text style={styles.readMoreText}>
                      View all features ({FEATURES.length}) →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingOfferings ? (
                <ActivityIndicator color={PILLAR_COLORS.mind} size="small" style={{ marginVertical: 24 }} />
              ) : !annualPkg && !monthlyPkg && !fallbackPkg ? (
                <Text style={styles.finePrint}>Plans unavailable — check your connection and try again.</Text>
              ) : (
                <Animated.View entering={FadeInUp.delay(400).duration(300)} style={styles.pricingSection}>
                  <View style={styles.pricingDivider} />
                  <View style={styles.plansWrap}>
                    {annualPkg && (
                      <>
                        <View style={styles.popularPill}>
                          <Text style={styles.popularPillText}>MOST POPULAR</Text>
                        </View>
                        <PlanButton
                          variant="primary"
                          line1="Continue with Yearly"
                          line2={savingsPct != null ? `$${annualMonthlyEquivalent}/month · Save ${savingsPct}%` : `$${annualMonthlyEquivalent}/month`}
                          loading={purchasingId === annualPkg.identifier}
                          disabled={anyBusy}
                          onPress={() => void handlePurchase(annualPkg)}
                        />
                      </>
                    )}
                    {monthlyPkg && (
                      <PlanButton
                        variant={annualPkg ? 'secondary' : 'primary'}
                        line1="Continue with Monthly"
                        line2={`${monthlyPkg.product.priceString}/month`}
                        loading={purchasingId === monthlyPkg.identifier}
                        disabled={anyBusy}
                        onPress={() => void handlePurchase(monthlyPkg)}
                      />
                    )}
                    {fallbackPkg && (
                      <PlanButton
                        variant="primary"
                        line1="Continue"
                        line2={fallbackPkg.product.priceString}
                        loading={purchasingId === fallbackPkg.identifier}
                        disabled={anyBusy}
                        onPress={() => void handlePurchase(fallbackPkg)}
                      />
                    )}
                  </View>
                  <View style={styles.pricingDivider} />
                </Animated.View>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={() => void handleRestore()}
                disabled={anyBusy}
                activeOpacity={0.7}
                style={styles.restoreBtn}
              >
                <Text style={styles.restoreText}>
                  {restoring ? 'Restoring…' : 'Restore Purchases  →'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.finePrint}>
                Cancel anytime. Subscription renews automatically.{'\n'}Terms • Privacy
              </Text>
            </ScrollView>
          )}

          {/* Close button rendered LAST — not before the ScrollView — so it
              stacks on top for touch handling. It sat underneath the
              ScrollView before, which was silently swallowing the tap. */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={18} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        </View>
        </GlassCard>
      </Animated.View>

      {/* All Pro features — modal instead of inline expansion */}
      <Modal
        visible={showFeaturesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeaturesModal(false)}
      >
        <View style={styles.featuresModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowFeaturesModal(false)}
          />
          <View style={[styles.featuresModalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.featuresModalHandle} />
            <Text style={styles.featuresModalTitle}>Everything in Pro</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.featuresModalScroll}>
              {FEATURES.map((f, i) => (
                <FeatureRow
                  key={f.lead}
                  icon={f.icon}
                  color={f.color}
                  lead={f.lead}
                  desc={f.desc}
                  last={i === FEATURES.length - 1}
                  index={i}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowFeaturesModal(false)}
              activeOpacity={0.85}
              style={styles.featuresModalCloseBtn}
            >
              <Text style={styles.featuresModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shellContent: {
    paddingHorizontal: 0,
    alignItems: 'center',
    paddingTop: 12,
    // Overrides ScreenShell's default scroll-bottom clearance (meant for
    // scrollable page content, ~40-50px here) — this is a single full-height
    // modal card, not a list, so that space was just shrinking the card.
    paddingBottom: 12,
  },
  cardWrap: {
    width: '92%',
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: RADIUS.card,
  },
  cardInner: {
    flex: 1,
    padding: 22,
  },
  // The short "already Pro" state doesn't need to scroll — just center it
  // in the same fixed-height card so it doesn't look like a stretched, empty box.
  alreadyProWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollAreaContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 28,
    right: 28,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GOLD + '1A',
    borderWidth: 2,
    borderColor: GOLD + '45',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  badgeLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    color: GOLD,
    marginTop: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: TYPOGRAPHY.subtitle.color,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 16,
  },

  // ── Features ──
  featureList: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  featureRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  readMoreBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: PILLAR_COLORS.mind,
  },

  // ── Full features modal — same bottom-sheet tokens as the app's other
  // sheets (Ringtone picker, alarm-window picker): bg, radius, handle bar.
  featuresModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  featuresModalSheet: {
    backgroundColor: '#11162a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  featuresModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  featuresModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuresModalScroll: {
    maxHeight: 380,
  },
  featuresModalCloseBtn: {
    marginTop: 12,
    height: BUTTON.height,
    borderRadius: BUTTON.radius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureLead: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },

  // ── Plans ──
  pricingSection: {
    width: '100%',
  },
  pricingDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  plansWrap: {
    width: '100%',
    gap: 12,
    paddingVertical: 16,
  },
  popularPill: {
    alignSelf: 'center',
    backgroundColor: PILLAR_COLORS.eye + '22',
    borderWidth: 1,
    borderColor: PILLAR_COLORS.eye + '55',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: -4,
  },
  popularPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: PILLAR_COLORS.eye,
  },
  planBtnShell: {
    width: '100%',
    borderRadius: BUTTON.radius,
    overflow: 'hidden',
  },
  planBtn: {
    height: 60,
    borderRadius: BUTTON.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBtnOutline: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  planTextWrap: {
    alignItems: 'center',
  },
  planLine1Primary: {
    fontSize: 18,
    fontWeight: '600',
    color: '#03212C',
  },
  planLine2Primary: {
    fontSize: 13,
    fontWeight: '500',
    color: '#03212C',
    opacity: 0.75,
    marginTop: 1,
  },
  planLine1Secondary: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planLine2Secondary: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },

  // ── Restore + fine print ──
  restoreBtn: {
    paddingVertical: 8,
    marginTop: 20,
    marginBottom: 24,
  },
  restoreText: {
    fontSize: 15,
    fontWeight: '500',
    color: PILLAR_COLORS.mind,
  },
  finePrint: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: STATUS_COLORS.error,
    textAlign: 'center',
    marginBottom: 8,
  },
});
