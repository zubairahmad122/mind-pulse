const PREMIUM_FEATURES = [
  'full_audio_library',
  'ai_sleep_suggestions',
  'all_eye_exercises',
  'stress_journal_ai',
  'advanced_tracking',
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export function isPremiumFeature(feature: PremiumFeature, isPremium: boolean): boolean {
  if (!PREMIUM_FEATURES.includes(feature)) return false;
  return !isPremium;
}
