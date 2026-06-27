// ──────────────────────────────────────────────────────────────────────────────
// OnboardingScreen — 3-slide onboarding flow with pagination and CTA
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MPOnboardingFlow, type OnboardingPage } from '@/components/templates/MPOnboardingFlow';
import { useUserStore } from '@/stores/useUserStore';
import { SCREENS } from '@/navigation/types';

const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    title: 'Your Eyes Blink 66% Less at Screens',
    subtitle: 'Digital eye strain affects millions. Our guided exercises strengthen your eye muscles and reduce fatigue in just 2 minutes a day.',
    image: require('@/assets/expo.icon/Assets/mind-pulse-icon.png'),
  },
  {
    title: '70% Sleep Better With a Routine',
    subtitle: 'Build healthy sleep habits with smart alarms, bedtime reminders, and personalized sleep tracking.',
    image: require('@/assets/expo.icon/Assets/mind-pulse-adaptive-fg.png'),
  },
  {
    title: '2 Minutes of Breathing Reduces Stress 40%',
    subtitle: 'Evidence-based relaxation sessions that calm your nervous system and improve focus — anywhere, anytime.',
    image: require('@/assets/expo.icon/Assets/mind-pulse-icon.png'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);

  const handleComplete = () => {
    completeOnboarding();
    router.replace(SCREENS.MAIN_TABS as never);
  };

  return (
    <View style={{ flex: 1 }}>
      <MPOnboardingFlow
        pages={ONBOARDING_PAGES}
        onSkip={handleComplete}
        onComplete={handleComplete}
      />
    </View>
  );
}
