import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { rs } from '@/utils/responsive';
import { ROUTES, ONBOARDING_SLIDES, FONTS, GLASS_CARD, getPillarTheme } from '@/constants';
import type { OnboardingSlide } from '@/constants/onboarding';
import { MindHero, SleepHero, EyeHero } from '@/components/onboarding';
import { NightSky } from '@/components/onboarding/SleepHero';
import { useAuth } from '@/context/AuthContext';
import { markOnboardingComplete } from '@/services/onboardingPersistence';

function SlideVisual({ slide }: { slide: OnboardingSlide }) {
  if (slide.icon === 'mind') return <MindHero />;
  if (slide.icon === 'sleep') return <SleepHero />;
  if (slide.icon === 'eyes') return <EyeHero />;
  return null;
}

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();
  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const totalSlides = ONBOARDING_SLIDES.length;

  const progressAnim = useRef(ONBOARDING_SLIDES.map(() => new Animated.Value(0))).current;
  const primaryPressScale = useRef(new Animated.Value(1)).current;
  const secondaryPressScale = useRef(new Animated.Value(1)).current;
  const shineX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ONBOARDING_SLIDES.forEach((_, i) => {
      if (i < index) {
        progressAnim[i].setValue(1);
      } else if (i > index) {
        progressAnim[i].setValue(0);
      } else {
        progressAnim[i].setValue(0);
        Animated.timing(progressAnim[i], {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    });
  }, [index, progressAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(shineX, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shineX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shineX]);

  const pressIn = (v: Animated.Value) => Animated.spring(v, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = (v: Animated.Value) => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

  if (!slide) return null;

  const goNext = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      // Post-onboarding: continue as guest → land in Eye Exercise for immediate value
      try {
        await continueAsGuest();
        void markOnboardingComplete();
        router.replace(ROUTES.appEyeRelax as never);
      } catch (error) {
        Alert.alert('Could Not Continue', error instanceof Error ? error.message : 'Please try again.');
      }
    } else {
      setIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (index > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIndex((i) => i - 1);
    } else {
      router.back();
    }
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
      Alert.alert('Could Not Continue', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const pillar = getPillarTheme(slide.icon);

  const primaryLabel: Record<string, string> = {
    eyes: 'Protect My Eyes',
    sleep: 'Explore Sleep Insights',
    mind: 'Get Started Free',
  };
  const secondaryLabel: Record<string, string> = {
    eyes: 'Already have an account?',
    sleep: 'Already have an account?',
    mind: 'Already have an account?',
  };
  const secondaryAction: Record<string, () => void> = {
    eyes: goLogin,
    sleep: goLogin,
    mind: goLogin,
  };

  const activeAccent = pillar.accent;
  const isActive = (tag: string) =>
    (slide.icon === 'mind' && tag === 'MIND') ||
    (slide.icon === 'sleep' && tag === 'SLEEP') ||
    (slide.icon === 'eyes' && tag === 'EYES');

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      {/* Transparent status bar — blends into dark night-sky backgrounds */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full background gradient — per-slide colors */}
      <LinearGradient
        colors={pillar.bgGradient}
        locations={[0, 0.48, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Sleep NightSky — rendered at screen level so it covers hero AND bottom card */}
      {slide.icon === 'sleep' && <NightSky />}

      {/* No top spacer — hero extends to the very top behind translucent status bar */}

      {/* Back button — not on first slide */}
      {index > 0 && (
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            position: 'absolute',
            top: insets.top + rs(14),
            left: rs(20),
            zIndex: 10,
            width: rs(40),
            height: rs(40),
            borderRadius: rs(20),
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={rs(16)} height={rs(16)} viewBox="0 0 24 24">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      )}

      {/* Skip button — only on non-mind slides */}
      {slide.icon !== 'mind' && (
        <TouchableOpacity
          onPress={goSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            position: 'absolute',
            top: insets.top + rs(14),
            right: rs(20),
            zIndex: 10,
            paddingHorizontal: rs(18),
            paddingVertical: rs(10),
            borderRadius: rs(22),
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: rs(13), fontWeight: '600' }}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Hero visualization */}
      <SlideVisual slide={slide} />

      {/* Bottom card — glassmorphism, outer wrapper carries the glow so it isn't clipped */}
      <View style={{
        shadowColor: activeAccent,
        ...GLASS_CARD.outerGlow,
        shadowRadius: rs(GLASS_CARD.outerGlow.shadowRadius),
      }}>
        <View style={{
          borderTopLeftRadius: rs(GLASS_CARD.borderRadius),
          borderTopRightRadius: rs(GLASS_CARD.borderRadius),
          overflow: 'hidden',
          borderTopWidth: GLASS_CARD.borderTopWidth,
          borderColor: GLASS_CARD.borderColor,
          paddingTop: rs(12),
          paddingHorizontal: rs(20),
          paddingBottom: rs(26),
        }}>
          {/* Frosted glass background */}
          <BlurView
            intensity={GLASS_CARD.blurIntensity}
            tint="dark"
            style={{
              ...StyleSheet.absoluteFill,
              borderTopLeftRadius: rs(GLASS_CARD.borderRadius),
              borderTopRightRadius: rs(GLASS_CARD.borderRadius),
            }}
          />
          {/* Subtle tint gradient on top of blur */}
          <LinearGradient
            colors={pillar.cardTint}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderTopLeftRadius: rs(GLASS_CARD.borderRadius),
              borderTopRightRadius: rs(GLASS_CARD.borderRadius),
            }}
          />
          {/* Top highlight line — light catching the glass edge */}
          <LinearGradient
            colors={GLASS_CARD.highlightColors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, left: rs(24), right: rs(24), height: 1.5 }}
          />
          {/* Soft inner shadow — top inner glow + bottom inner darkening */}
          <LinearGradient
            colors={GLASS_CARD.innerTopColors}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rs(GLASS_CARD.innerTopHeight) }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={GLASS_CARD.innerBottomColors}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: rs(GLASS_CARD.innerBottomHeight) }}
            pointerEvents="none"
          />
          {/* Card content */}
        {/* Handle */}
        <View style={{
          width: rs(38), height: rs(4), borderRadius: rs(99),
          backgroundColor: 'rgba(255,255,255,0.16)',
          alignSelf: 'center', marginBottom: rs(12),
        }} />

        {/* Tags row + counter */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: rs(14),
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: rs(7), alignSelf: 'flex-start',
            paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(999),
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
          }}>
            {(['EYES', 'SLEEP', 'MIND', 'AI'] as const).map((tag, i, arr) => (
              <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', gap: rs(7) }}>
                <Text style={{
                  fontSize: rs(8.5), fontWeight: '600', letterSpacing: 1.3,
                  color: isActive(tag) ? activeAccent : 'rgba(245,247,251,0.4)',
                }}>
                  {tag}
                </Text>
                {i < arr.length - 1 && (
                  <Text style={{ opacity: 0.4, color: 'rgba(245,247,251,0.4)', fontSize: rs(8.5) }}>·</Text>
                )}
              </View>
            ))}
          </View>

          <Text style={{
            fontFamily: FONTS.headingSemi,
            fontSize: rs(11), letterSpacing: 1,
            color: 'rgba(245,247,251,0.38)',
          }}>
            {String(index + 1).padStart(2, '0')}
            <Text style={{ opacity: 0.5 }}> / {String(totalSlides).padStart(2, '0')}</Text>
          </Text>
        </View>

        {/* Section label */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: rs(9), marginBottom: rs(8) }}>
          <View style={{
            width: rs(20), height: rs(2), borderRadius: rs(2),
            backgroundColor: activeAccent,
            shadowColor: activeAccent, shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7, shadowRadius: rs(8), elevation: 3,
          }} />
          <Text style={{ fontSize: rs(11), fontWeight: '600', letterSpacing: 2.5, color: activeAccent }}>
            {slide.category}
          </Text>
        </View>

        {/* Title */}
        <Text style={{
          fontFamily: FONTS.heading,
          fontSize: rs(29), lineHeight: rs(32), letterSpacing: -0.7,
          color: '#f6f8fc', textAlign: 'center',
        }}>
          {slide.title}
        </Text>

        {/* Description */}
        <Text style={{
          fontSize: rs(13), lineHeight: rs(20), marginTop: rs(10),
          color: 'rgba(245,247,251,0.58)', maxWidth: rs(252),
          textAlign: 'center', alignSelf: 'center',
        }}>
          {slide.desc}
        </Text>

        {/* Buttons */}
        <View style={{ gap: rs(8), marginTop: rs(16) }}>
          <Animated.View style={{ transform: [{ scale: primaryPressScale }] }}>
            <TouchableOpacity
              onPress={goNext}
              onPressIn={() => pressIn(primaryPressScale)}
              onPressOut={() => pressOut(primaryPressScale)}
              activeOpacity={0.92}
              style={{
                height: rs(54), borderRadius: rs(16), overflow: 'hidden',
                shadowColor: pillar.buttonShadow,
                shadowOffset: { width: 0, height: rs(12) },
                shadowRadius: rs(30), shadowOpacity: 0.7, elevation: 10,
              }}
            >
              <LinearGradient
                colors={pillar.buttonGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8) }}
              >
                <Text style={{
                  fontFamily: FONTS.bodyBold, fontSize: rs(15),
                  color: pillar.buttonTextColor, letterSpacing: 0.2,
                }}>
                  {primaryLabel[slide.icon]}
                </Text>
                <Svg width={rs(17)} height={rs(17)} viewBox="0 0 24 24">
                  <Path
                    d="M5 12h14M13 6l6 6-6 6"
                    fill="none" stroke={pillar.buttonTextColor}
                    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                  />
                </Svg>
              </LinearGradient>
              {/* Shine sweep */}
              <Animated.View pointerEvents="none" style={{
                position: 'absolute', top: -rs(20), bottom: -rs(20), width: rs(46),
                transform: [
                  { translateX: shineX.interpolate({ inputRange: [0, 1], outputRange: [-rs(70), rs(340)] }) },
                  { rotate: '20deg' },
                ],
              }}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: secondaryPressScale }] }}>
            <TouchableOpacity
              onPress={secondaryAction[slide.icon]}
              onPressIn={() => pressIn(secondaryPressScale)}
              onPressOut={() => pressOut(secondaryPressScale)}
              activeOpacity={0.7}
              style={{
                height: rs(50), borderRadius: rs(15),
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.045)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ fontFamily: FONTS.bodySemi, fontSize: rs(14), color: 'rgba(245,247,251,0.8)' }}>
                {secondaryLabel[slide.icon]}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

          {/* Animated segmented progress bar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(14),
          }}>
            {ONBOARDING_SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setIndex(i)}
                activeOpacity={0.7}
                style={{ flex: 1 }}
              >
                <View style={{
                  height: i === index ? rs(5) : rs(4),
                  borderRadius: rs(99),
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  overflow: 'hidden',
                  ...(i === index ? {
                    shadowColor: activeAccent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: rs(6),
                    elevation: 4,
                  } : null),
                }}>
                  <Animated.View style={{
                    height: '100%',
                    borderRadius: rs(99),
                    backgroundColor: i <= index ? activeAccent : 'transparent',
                    width: progressAnim[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
