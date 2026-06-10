import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  // Defensive: bail out if the slides array is empty/undefined during fast-refresh.
  if (!slide) return null;

  // Icon orb breathing
  const breathScale = useSharedValue(1);

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
    return () => cancelAnimation(breathScale);
  }, [index]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const goNext = () => {
    if (isLast) router.replace(ROUTES.authAgeInput);
    else setIndex(i => i + 1);
  };

  return (
    <View className="flex-1 px-6 pt-[56px] pb-12">
      <AnimatedBackground /> 

      <TouchableOpacity
        className="self-end"
        onPress={() => router.replace(ROUTES.authAgeInput)}
        activeOpacity={0.7}
      >
        <Text className="text-app-muted text-[14px] font-semibold">Skip</Text>
      </TouchableOpacity>

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
        {/* Pill dot indicators */}
        <View className="flex-row gap-2 items-center">
          {ONBOARDING_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index
                  ? { width: 28, backgroundColor: COLORS.purple }
                  : { width: 6, backgroundColor: COLORS.border },
              ]}
            />
          ))}
        </View>
        <Button label={isLast ? 'Get Started' : 'Continue'} onPress={goNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: 184, height: 184, borderRadius: 92,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  orbInner: {
    width: 152, height: 152, borderRadius: 76,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: { height: 6, borderRadius: 3 },
});
