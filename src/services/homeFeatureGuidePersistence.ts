import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * First-run "how this app works" guide shown once on Home — three slides,
 * one real benefit each (Focus, Screen Break, Progress), matching the
 * app's own Featured/Quick Actions so a brand-new user sees what to tap
 * before anything else competes for their attention (paywalls, streak
 * nudges). Global, not per-account: a guest who later signs in shouldn't
 * see the orientation a second time.
 */
const KEY = '@mindpulse/home-feature-guide-shown';

export async function hasSeenHomeFeatureGuide(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function markHomeFeatureGuideSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
