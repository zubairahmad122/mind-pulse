import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { EyeHero, MindHero, SleepHero } from '@/components/onboarding';
import {
  FONTS,
  GLASS_CARD,
  ONBOARDING_SLIDES,
  ROUTES,
  getPillarTheme,
} from '@/constants';
import type { OnboardingSlide } from '@/constants/onboarding';
import { useAuth } from '@/context/AuthContext';
import { markOnboardingComplete } from '@/services/onboardingPersistence';
import { rs } from '@/utils/responsive';

function SlideVisual({ slide }: { slide: OnboardingSlide }) {
  if (slide.icon === 'mind') return <MindHero />;
  if (slide.icon === 'sleep') return <SleepHero />;
  return <EyeHero />;
}

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();
  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const pillar = getPillarTheme(slide?.icon);

  if (!slide) return null;

  const goNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isLast) {
      setIndex((current) => current + 1);
      return;
    }

    void markOnboardingComplete();
    router.push(ROUTES.authCreateAccount);
  };

  const goBack = () => {
    if (index === 0) {
      router.back();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIndex((current) => current - 1);
  };

  const goLogin = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void markOnboardingComplete();
    router.push(ROUTES.authSignIn);
  };

  const goSkip = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await continueAsGuest();
      void markOnboardingComplete();
    } catch (error) {
      Alert.alert(
        'Could Not Continue',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const primaryLabel: Record<string, string> = {
    eyes: 'Protect My Eyes',
    sleep: 'Explore Sleep',
    mind: 'Get Started Free',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={pillar.bgGradient}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      {index > 0 && (
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.65}
          hitSlop={14}
          style={[styles.back, { top: insets.top + rs(16) }]}
          accessibilityLabel="Previous slide"
        >
          <Svg width={rs(19)} height={rs(19)} viewBox="0 0 24 24">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              fill="none"
              stroke="rgba(255,255,255,0.72)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      )}

      {!isLast && (
        <TouchableOpacity
          onPress={goSkip}
          activeOpacity={0.65}
          hitSlop={14}
          style={[styles.skip, { top: insets.top + rs(16) }]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <SlideVisual slide={slide} />

      <View
        style={[
          styles.cardShadow,
          {
            shadowColor: pillar.accent,
          },
        ]}
      >
        <View style={styles.card}>
          <BlurView
            intensity={GLASS_CARD.blurIntensity}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={pillar.cardTint}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={GLASS_CARD.highlightColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.highlight}
            pointerEvents="none"
          />
          <LinearGradient
            colors={GLASS_CARD.innerTopColors}
            style={styles.innerTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={GLASS_CARD.innerBottomColors}
            style={styles.innerBottom}
            pointerEvents="none"
          />

          <View style={styles.cardMeta}>
            <Text style={[styles.category, { color: pillar.accent }]}>
              {slide.category}
            </Text>
            <Text style={styles.counter}>
              {String(index + 1).padStart(2, '0')}
              <Text style={styles.counterTotal}>
                {' '}
                / {String(ONBOARDING_SLIDES.length).padStart(2, '0')}
              </Text>
            </Text>
          </View>

          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.desc}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={goNext}
              activeOpacity={0.88}
              style={[
                styles.primaryButton,
                {
                  shadowColor: pillar.buttonShadow,
                },
              ]}
            >
              <LinearGradient
                colors={pillar.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryFill}
              >
                <Text
                  style={[
                    styles.primaryLabel,
                    { color: pillar.buttonTextColor },
                  ]}
                >
                  {primaryLabel[slide.icon]}
                </Text>
                <Svg width={rs(17)} height={rs(17)} viewBox="0 0 24 24">
                  <Path
                    d="M5 12h14M13 6l6 6-6 6"
                    fill="none"
                    stroke={pillar.buttonTextColor}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goLogin}
              activeOpacity={0.72}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryLabel}>
                Already have an account?
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={styles.dots}
            accessibilityLabel={`Slide ${index + 1} of 3`}
          >
            {ONBOARDING_SLIDES.map((item, dotIndex) => (
              <TouchableOpacity
                key={item.icon}
                onPress={() => setIndex(dotIndex)}
                activeOpacity={0.7}
                hitSlop={8}
                style={[
                  styles.dot,
                  dotIndex === index
                    ? { width: rs(22), backgroundColor: pillar.accent }
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#040810' },
  back: {
    position: 'absolute',
    left: rs(22),
    zIndex: 10,
    padding: rs(8),
  },
  skip: {
    position: 'absolute',
    right: rs(24),
    zIndex: 10,
    paddingVertical: rs(8),
    paddingHorizontal: rs(4),
  },
  skipText: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: FONTS.bodySemi,
    fontSize: rs(14),
  },
  cardShadow: {
    ...GLASS_CARD.outerGlow,
    shadowOpacity: 0.18,
    shadowRadius: rs(15),
  },
  card: {
    overflow: 'hidden',
    borderTopLeftRadius: rs(28),
    borderTopRightRadius: rs(28),
    borderTopWidth: 1,
    borderColor: GLASS_CARD.borderColor,
    paddingTop: rs(24),
    paddingHorizontal: rs(22),
    paddingBottom: rs(22),
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: rs(32),
    right: rs(32),
    height: 1,
  },
  innerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(GLASS_CARD.innerTopHeight),
  },
  innerBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: rs(GLASS_CARD.innerBottomHeight),
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(12),
  },
  category: {
    fontFamily: FONTS.bodySemi,
    fontSize: rs(10),
    letterSpacing: 2,
  },
  counter: {
    color: 'rgba(245,247,251,0.42)',
    fontFamily: FONTS.headingSemi,
    fontSize: rs(11),
    letterSpacing: 1,
  },
  counterTotal: { opacity: 0.5 },
  title: {
    color: '#F6F8FC',
    fontFamily: FONTS.heading,
    fontSize: rs(29),
    lineHeight: rs(34),
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  description: {
    alignSelf: 'center',
    maxWidth: rs(292),
    marginTop: rs(10),
    color: 'rgba(245,247,251,0.64)',
    fontFamily: FONTS.body,
    fontSize: rs(14),
    lineHeight: rs(21),
    textAlign: 'center',
  },
  actions: { gap: rs(9), marginTop: rs(20) },
  primaryButton: {
    height: rs(60),
    overflow: 'hidden',
    borderRadius: rs(18),
    shadowOffset: { width: 0, height: rs(9) },
    shadowRadius: rs(24),
    shadowOpacity: 0.55,
    elevation: 8,
  },
  primaryFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  primaryLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: rs(16),
  },
  secondaryButton: {
    height: rs(52),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  secondaryLabel: {
    color: 'rgba(245,247,251,0.76)',
    fontFamily: FONTS.bodySemi,
    fontSize: rs(14),
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(7),
    marginTop: rs(18),
  },
  dot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(99),
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
