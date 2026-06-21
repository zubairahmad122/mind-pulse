import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import type { ColorValue } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { rs } from '@/utils/responsive';
import { ROUTES, ONBOARDING_SLIDES } from '@/constants';
import type { OnboardingSlide } from '@/constants/onboarding';
import { MindHero, SleepHero, EyeHero } from '@/components/onboarding';
import { NightSky } from '@/components/onboarding/SleepHero';

function SlideVisual({ slide }: { slide: Onbo ardingSlide }) {
  if (slide.icon === 'mind') return <MindHero />;
  if (slide.icon === 'sleep') return <SleepHero />;
  if (slide.icon === 'eyes') return <EyeHero />;
  return null;
}

// Per-slide background gradients — only sleep gets the moon night-sky
function getBgGradient(icon: string): readonly [ColorValue, ColorValue, ColorValue] {
  switch (icon) {
    case 'mind':
      return ['#0C1225', '#080D1A', '#040810'] as const;
    case 'sleep':
      return ['#1e1438', '#0d0a1a', '#06040e'] as const;
    case 'eyes':
      return ['#0B1920', '#071216', '#03080B'] as const;
    default:
      return ['#0A0E1A', '#0D1128', '#080C1A'] as const;
  }
}

function getCardGradient(icon: string): readonly [ColorValue, ColorValue] {
  switch (icon) {
    case 'mind':
      return ['rgba(16,20,40,0.3)', 'rgba(8,12,24,0.55)'] as const;
    case 'sleep':
      // Semi-transparent so NightSky shows through the glass
      return ['rgba(20,14,44,0.25)', 'rgba(8,4,18,0.55)'] as const;
    case 'eyes':
      return ['rgba(12,22,28,0.3)', 'rgba(6,12,16,0.55)'] as const;
    default:
      return ['rgba(16,20,40,0.3)', 'rgba(8,12,24,0.55)'] as const;
  }
}

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const totalSlides = ONBOARDING_SLIDES.length;

  if (!slide) return null;

  const goNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) router.replace(ROUTES.authSignUp);
    else setIndex((i) => i + 1);
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
    router.push(ROUTES.authSignIn);
  };

  const goSkip = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace(ROUTES.authSignUp);
  };

  const primaryLabel: Record<string, string> = {
    mind: 'Get Started',
    sleep: 'Explore Sleep Insights',
    eyes: 'Start Eye Protection',
  };
  const primaryGradients: Record<string, [string, string]> = {
    mind: ['#3b82f6', '#2563eb'],
    sleep: ['#a78bfa', '#7c3aed'],
    eyes: ['#5eead4', '#06b6d4'],
  };
  const primaryTextColor: Record<string, string> = {
    mind: '#fff',
    sleep: '#fff',
    eyes: '#03212c',
  };
  const primaryShadow: Record<string, string> = {
    mind: 'rgba(37,99,235,0.6)',
    sleep: 'rgba(124,58,237,0.6)',
    eyes: 'rgba(8,145,178,0.6)',
  };
  const secondaryLabel: Record<string, string> = {
    mind: 'Log In',
    sleep: 'Skip for now',
    eyes: 'Log In',
  };
  const secondaryAction: Record<string, () => void> = {
    mind: goLogin,
    sleep: goSkip,
    eyes: goLogin,
  };

  const activeAccent = slide.accent;
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
        colors={getBgGradient(slide.icon)}
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

      {/* Bottom card — glassmorphism */}
      <View style={{
        borderTopLeftRadius: rs(28),
        borderTopRightRadius: rs(28),
        overflow: 'hidden',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingTop: rs(14),
        paddingHorizontal: rs(20),
        paddingBottom: rs(36),
      }}>
        {/* Frosted glass background */}
        <BlurView
          intensity={28}
          tint="dark"
          style={{
            ...StyleSheet.absoluteFill,
            borderTopLeftRadius: rs(28),
            borderTopRightRadius: rs(28),
          }}
        />
        {/* Subtle tint gradient on top of blur */}
        <LinearGradient
          colors={getCardGradient(slide.icon)}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderTopLeftRadius: rs(28),
            borderTopRightRadius: rs(28),
          }}
        />
        {/* Card content */}
        {/* Handle */}
        <View style={{
          width: rs(38), height: rs(4), borderRadius: rs(99),
          backgroundColor: 'rgba(255,255,255,0.16)',
          alignSelf: 'center', marginBottom: rs(16),
        }} />

        {/* Tags row + counter */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: rs(18),
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
            fontFamily: 'SpaceGrotesk_600SemiBold',
            fontSize: rs(11), letterSpacing: 1,
            color: 'rgba(245,247,251,0.38)',
          }}>
            {String(index + 1).padStart(2, '0')}
            <Text style={{ opacity: 0.5 }}> / {String(totalSlides).padStart(2, '0')}</Text>
          </Text>
        </View>

        {/* Section label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(9), marginBottom: rs(10) }}>
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
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: rs(29), lineHeight: rs(32), letterSpacing: -0.7,
          color: '#f6f8fc',
        }}>
          {slide.title}
        </Text>

        {/* Description */}
        <Text style={{
          fontSize: rs(13), lineHeight: rs(20), marginTop: rs(12),
          color: 'rgba(245,247,251,0.58)', maxWidth: rs(252),
        }}>
          {slide.desc}
        </Text>

        {/* Buttons */}
        <View style={{ gap: rs(10), marginTop: rs(20) }}>
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.85}
            style={{
              height: rs(54), borderRadius: rs(16), overflow: 'hidden',
              shadowColor: primaryShadow[slide.icon],
              shadowOffset: { width: 0, height: rs(12) },
              shadowRadius: rs(28), shadowOpacity: 0.6, elevation: 10,
            }}
          >
            <LinearGradient
              colors={primaryGradients[slide.icon]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8) }}
            >
              <Text style={{
                fontFamily: 'Inter_700Bold', fontSize: rs(15),
                color: primaryTextColor[slide.icon], letterSpacing: 0.2,
              }}>
                {primaryLabel[slide.icon]}
              </Text>
              <Svg width={rs(17)} height={rs(17)} viewBox="0 0 24 24">
                <Path
                  d="M5 12h14M13 6l6 6-6 6"
                  fill="none" stroke={primaryTextColor[slide.icon]}
                  strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                />
              </Svg>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={secondaryAction[slide.icon]}
            activeOpacity={0.7}
            style={{
              height: rs(50), borderRadius: rs(15),
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.045)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: rs(14), color: 'rgba(245,247,251,0.8)' }}>
              {secondaryLabel[slide.icon]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pagination dots */}
        <View style={{
          flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: rs(7), marginTop: rs(18),
        }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setIndex(i)}
              activeOpacity={0.7}
              style={{
                width: i === index ? rs(22) : rs(6), height: rs(6), borderRadius: rs(99),
                backgroundColor: i === index ? activeAccent : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
