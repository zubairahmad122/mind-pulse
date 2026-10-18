import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, HeartPulse, Moon, Sparkles, TrendingUp } from 'lucide-react-native';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { FONTS, GLASS_CARD, PILLAR_COLORS, RADIUS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { GradientCTA } from './GradientCTA';

type Props = {
  visible: boolean;
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  variant?: 'default' | 'welcome';
  onUpgrade: () => void;
  onDismiss: () => void;
};

/**
 * Dismissible "soft" paywall prompt — never blocks app usage.
 * Used for the post-onboarding nudge and the 3-day streak nudge.
 */
export function SoftPaywallModal({
  visible,
  emoji,
  title,
  subtitle,
  ctaLabel = 'Unlock Pro',
  variant = 'default',
  onUpgrade,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const isWelcome = variant === 'welcome';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Clipping shape lives on a static (non-transformed) View — Android
            can't reliably clip rounded corners on a layer that's actively
            being transform-animated, which showed up as a glitch along one
            edge of the card while the spring entrance was still settling. */}
        <View style={[styles.sheetClip, isWelcome && styles.welcomeSheetClip]}>
          <Animated.View
            entering={FadeInUp.springify().damping(20).stiffness(150)}
            exiting={FadeOutDown.duration(200)}
            style={[
              styles.sheet,
              isWelcome && styles.welcomeSheet,
              { paddingBottom: Math.max(insets.bottom + 12, isWelcome ? 24 : spacing.xxl) },
            ]}
          >
            {isWelcome && (
              <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <RadialGradient id="welcomeGlow" cx="50%" cy="12%" rx="70%" ry="72%">
                    <Stop offset="0" stopColor="#4DE1C1" stopOpacity="0.16" />
                    <Stop offset="0.48" stopColor="#486BFF" stopOpacity="0.07" />
                    <Stop offset="0.78" stopColor="#8A5CFF" stopOpacity="0.05" />
                    <Stop offset="1" stopColor="#0F0B2A" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#welcomeGlow)" />
              </Svg>
            )}
            <View style={styles.handleBar} />

            {isWelcome ? (
              <>
                <Svg
                  pointerEvents="none"
                  width={140}
                  height={140}
                  style={styles.proMarkGlow}
                >
                  <Defs>
                    <RadialGradient id="proMarkGlow" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor="#4DE1C1" stopOpacity="0.3" />
                      <Stop offset="55%" stopColor="#6C63FF" stopOpacity="0.12" />
                      <Stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Rect width={140} height={140} fill="url(#proMarkGlow)" />
                </Svg>
                <LinearGradient
                  colors={['#4DE1C1', '#6C63FF', '#7B5CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.proMarkBorder}
                >
                  <View style={styles.proMarkInner}>
                    <HeartPulse size={25} color="#8EF0DA" strokeWidth={2.15} />
                    <Sparkles size={12} color="#A99BFF" strokeWidth={2.2} style={styles.proSparkle} />
                  </View>
                </LinearGradient>

                <Text style={[styles.title, styles.welcomeTitle]}>{title}</Text>
                <Text numberOfLines={3} style={[styles.subtitle, styles.welcomeSubtitle]}>
                  {subtitle}
                </Text>

                <View style={styles.benefits}>
                  <BenefitRow
                    accent={PILLAR_COLORS.mind}
                    icon={<HeartPulse size={16} color={PILLAR_COLORS.mind} strokeWidth={2} />}
                    label="Unlimited Focus sessions"
                  />
                  <BenefitRow
                    accent={PILLAR_COLORS.sleep}
                    icon={<Moon size={16} color={PILLAR_COLORS.sleep} strokeWidth={2} />}
                    label="Full Sleep & Relax library"
                  />
                  <BenefitRow
                    accent={PILLAR_COLORS.challenge}
                    icon={<TrendingUp size={16} color={PILLAR_COLORS.challenge} strokeWidth={2} />}
                    label="Advanced weekly insights"
                  />
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={ctaLabel}
                  onPress={onUpgrade}
                  activeOpacity={0.86}
                  style={styles.welcomeCtaShadow}
                >
                  <LinearGradient
                    colors={['#3B2ED0', '#5B45E8', '#7B5CFF']}
                    start={{ x: 0, y: 0.25 }}
                    end={{ x: 1, y: 0.75 }}
                    style={styles.welcomeCta}
                  >
                    <View style={styles.ctaTopHighlight} />
                    <Text style={styles.welcomeCtaText}>{ctaLabel}</Text>
                    <ArrowRight size={19} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={onDismiss}
                  activeOpacity={0.7}
                  style={styles.freeAction}
                >
                  <Text style={styles.freeActionText}>Continue with Free</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emoji}>{emoji}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <GradientCTA label={ctaLabel} onPress={onUpgrade} style={styles.upgradeBtn} />
                <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
                  <Text style={styles.dismissText}>Maybe later</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function BenefitRow({ icon, label, accent }: { icon: React.ReactNode; label: string; accent: string }) {
  return (
    <View style={[styles.benefitRow, { borderColor: accent + '24' }]}>
      <View style={[styles.benefitIcon, { backgroundColor: accent + '1c' }]}>{icon}</View>
      <Text style={styles.benefitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,4,15,0.94)',
    justifyContent: 'flex-end',
  },
  // Clipping shape + shadow — kept on a static View, never the animated one
  // (see the render-time comment above), so Android's corner clip stays
  // stable through the whole entrance/exit transform.
  // Uniform borderWidth (not per-edge borderTop/Left/RightWidth) — mixing
  // different per-edge widths with a corner borderRadius renders a visible
  // seam at the rounded corner on Android instead of a smooth arc. The
  // bottom edge sits below the visible sheet (behind the safe-area padding)
  // so a matching bottom border is imperceptible in practice.
  sheetClip: {
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: GLASS_CARD.border,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
  },
  welcomeSheetClip: {
    backgroundColor: '#0F0B2A',
    borderColor: 'rgba(92,126,255,0.28)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#3B2ED0',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 24,
  },
  welcomeSheet: {
    paddingHorizontal: 24,
    paddingTop: 9,
  },
  sheet: {
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
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: FONTS.heading,
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  upgradeBtn: {
    width: '100%',
    marginBottom: spacing.md,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
  proMarkGlow: {
    position: 'absolute',
    top: 1,
  },
  proMarkBorder: {
    width: 58,
    height: 58,
    borderRadius: 20,
    padding: 1.5,
    marginTop: 2,
    marginBottom: 14,
  },
  proMarkInner: {
    flex: 1,
    borderRadius: 18.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,39,0.94)',
  },
  proSparkle: {
    position: 'absolute',
    top: 8,
    right: 7,
  },
  welcomeTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.45,
    marginBottom: 7,
  },
  welcomeSubtitle: {
    color: '#AAB8D4',
    fontFamily: FONTS.body,
    fontSize: 14.5,
    fontWeight: '400',
    lineHeight: 21,
    maxWidth: 360,
    paddingHorizontal: 5,
    marginBottom: 17,
  },
  benefits: {
    width: '100%',
    gap: 8,
    marginBottom: 19,
  },
  benefitRow: {
    minHeight: 42,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(18,31,65,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(82,154,255,0.11)',
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,199,245,0.09)',
    marginRight: 11,
  },
  benefitLabel: {
    color: '#DCE7FA',
    fontFamily: FONTS.bodySemi,
    fontSize: 13.5,
    lineHeight: 18,
  },
  welcomeCtaShadow: {
    width: '100%',
    borderRadius: 19,
    marginBottom: 9,
    shadowColor: '#7B5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 17,
    elevation: 9,
  },
  welcomeCta: {
    minHeight: 58,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  ctaTopHighlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  welcomeCtaText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    letterSpacing: 0.05,
  },
  freeAction: {
    minHeight: 42,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeActionText: {
    color: '#AAB8D4',
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
});
