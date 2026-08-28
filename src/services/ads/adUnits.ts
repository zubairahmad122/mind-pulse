import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Platform-aware ad unit ID resolution. Real IDs come from env vars (same
 * pattern as RevenueCat/Gemini keys in AuthContext.tsx); any ad unit that
 * hasn't been created yet in the AdMob console falls back to the SDK's own
 * `TestIds` so the app still shows (test) ads instead of failing to load.
 */

function pick(envAndroid: string | undefined, envIos: string | undefined, testId: string): string {
  const fromEnv = Platform.select({ android: envAndroid, ios: envIos, default: undefined });
  return fromEnv ?? testId;
}

export const BANNER_AD_UNIT_ID = pick(
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
  process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  TestIds.BANNER,
);

export const INTERSTITIAL_AD_UNIT_ID = pick(
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
  process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
  TestIds.INTERSTITIAL,
);

export const REWARDED_AD_UNIT_ID = pick(
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID,
  process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
  TestIds.REWARDED,
);
