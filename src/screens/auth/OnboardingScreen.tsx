import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AnimatedBackground from '@/components/AnimatedBackground';
import Button from '@/components/ui/Button';
import { COLORS, ONBOARDING_SLIDES, ROUTES } from '@/constants';

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const safeIndex = Math.min(Math.max(index, 0), ONBOARDING_SLIDES.length - 1);
  const slide = ONBOARDING_SLIDES[safeIndex];
  const isLast = safeIndex === ONBOARDING_SLIDES.length - 1;
  const totalSlides = ONBOARDING_SLIDES.length;

  // Defensive: bail out if the slides array is empty/undefined during fast-refresh.
  if (!slide) return null;

  // Icon orb breathing
  const breathScale = useSharedValue(1);
  // Progress bar animation
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    breathScale.value = 1;
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    // Animate progress bar to current step
    progressWidth.value = withTiming(((safeIndex + 1) / totalSlides) * 100, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    return () => cancelAnimation(breathScale);
  }, [index, safeIndex, totalSlides]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const goNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) router.replace(ROUTES.authSignUp);
    else setIndex(i => i + 1);
  };

  return (
    <View className="flex-1 px-6 pt-[56px] pb-12">
      <AnimatedBackground /> 

      <View className="flex-row items-center justify-between mb-8">
        {/* Step indicator with animated progress bar */}
        <View style={styles.progressContainer}>
          <Reanimated.View style={[styles.progressBar, progressAnimStyle]} />
        </View>
        <TouchableOpacity
          onPress={() => router.replace(ROUTES.authSignUp)}
          activeOpacity={0.7}
          className="ml-4"
        >
          <Text className="text-app-muted text-[14px] font-semibold">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Step labels */}
      <View className="flex-row justify-between mb-6 px-1">
        {ONBOARDING_SLIDES.map((s, i) => (
          <View key={i} className="items-center" style={{ width: '30%' }}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: i <= safeIndex ? slide.accent : 'transparent',
                  borderColor: i <= safeIndex ? slide.accent : 'rgba(255,255,255,0.2)',
                },
              ]}
            >
              <Text style={[styles.stepNumber, { color: i <= safeIndex ? '#fff' : 'rgba(255,255,255,0.3)' }]}>
                {i + 1}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                { color: i <= safeIndex ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)' },
              ]}
              numberOfLines={1}
            >
              {i === 0 ? 'Eyes' : i === 1 ? 'Sleep' : 'Mind'}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-1 items-center justify-center gap-8">
        {/* Breathing icon orb */}
        <Reanimated.View style={[styles.orb, { borderColor: slide.accent + '50' }, breathStyle]}>
          <View style={[styles.orbInner, { backgroundColor: slide.accent + '1a' }]}>
            <Text style={{ fontSize: 62 }}>{slide.icon}</Text>
          </View>
        </Reanimated.View>

        <View className="gap-4 items-center px-2">
          <Text className="text-[30px] font-bold text-white text-center leading-tight">
            {slide.title}
          </Text>
          <Text className="text-[15px] text-app-muted text-center leading-[26px]">
            {slide.desc}
          </Text>
        </View>
      </View>

      <View className="gap-8 items-center">
        <Button label={isLast ? 'Get Started' : 'Continue'} onPress={goNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.purple,
  },
  orb: {
    width: 184, height: 184, borderRadius: 92,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  orbInner: {
    width: 152, height: 152, borderRadius: 76,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
