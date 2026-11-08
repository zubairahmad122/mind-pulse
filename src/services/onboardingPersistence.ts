import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackOnboardingDone } from '@/services/analytics';

const KEY = '@mindpulse/onboarding-complete';

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function markOnboardingComplete(): Promise<void> {
  // Reachable from several buttons, and again after navigating back.
  if (await hasCompletedOnboarding()) return;
  await AsyncStorage.setItem(KEY, '1');
  trackOnboardingDone();
}
