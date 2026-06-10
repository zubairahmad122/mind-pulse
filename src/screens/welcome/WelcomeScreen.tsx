import AnimatedBackground from '@/components/AnimatedBackground';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/constants';

export default function WelcomeScreen() {
  const router = useRouter();

  // Entrance stagger (React Native Animated)
  const moonAnim    = useRef(new Animated.Value(0)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  // Continuous moon float (Reanimated)
  const moonFloat = useSharedValue(0);
  // Moon glow pulse
  const moonGlow = useSharedValue(0.3);

  useEffect(() => {
    // Entrance
    Animated.sequence([
      Animated.timing(moonAnim,    { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(titleAnim,   { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(actionsAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

moonFloat.value = withRepeat(
  withSequence(
    withTiming(-8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
    withTiming(8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
  ),
  -1,
  true
);

 moonGlow.value = withRepeat(
  withSequence(
    withTiming(0.35, { duration: 3000 }),
    withTiming(0.15, { duration: 3000 }),
  ),
  -1,
  true
);

    return () => {
      cancelAnimation(moonFloat);
      cancelAnimation(moonGlow);
    };
  }, []);

  const moonEnterStyle = {
    opacity: moonAnim,
    transform: [{ translateY: moonAnim.interpolate({ inputRange: [0, 1], outputRange: [-35, 0] }) }],
  };
  const titleEnterStyle = {
    opacity: titleAnim,
    transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  };
  const actionsEnterStyle = {
    opacity: actionsAnim,
    transform: [{ translateY: actionsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  const moonFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moonFloat.value }],
  }));
  const moonGlowStyle = useAnimatedStyle(() => ({
    opacity: moonGlow.value,
  }));

  return (
    <View className="flex-1">
      <AnimatedBackground />  

      <View className="flex-1 px-6 pt-14 pb-12">
        <View className="flex-1 items-center justify-center gap-6">
         <Animated.View style={moonEnterStyle}>
  <Reanimated.View style={moonFloatStyle}>
    
    {/* 🌙 Soft Glow (FIXED) */}
    <Reanimated.View style={[styles.glowHalo, moonGlowStyle]} />

    {/* 🌙 Moon (NO heavy card look) */}
    <View style={styles.moonWrapper}>
      <Image
        style={{ width: 90, height: 90 }}
        resizeMode="contain"
        source={require('@/assets/images/icons/moon.png')}
      />
    </View>

  </Reanimated.View>
</Animated.View>

          {/* Title */}
          <Animated.View className="items-center gap-2" style={titleEnterStyle}>
            <Text style={styles.appName}>AuraSync</Text>
            <Text style={styles.tagline}>Synchronize sleep, screen, and stress.</Text>
          </Animated.View>
        </View>

        {/* Actions */}
        <Animated.View className="gap-3" style={actionsEnterStyle}>
          <Button label="Get Started" onPress={() => router.push(ROUTES.authOnboarding)} />
          <Button
            label="Sign In"
            onPress={() => router.push(ROUTES.authSignIn)}
            variant="outline"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moonWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',

    // subtle glow instead of card
    shadowColor: '#a5b4fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },

  glowHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#818cf8',
    opacity: 0.2,

    top: -25,
    left: -25,
  },

  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
    textAlign: 'center',
  },

  tagline: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});