/**
 * Single source of truth for Free vs Pro feature gating.
 * `PaywallGate` reads from this map — never duplicate this logic elsewhere.
 */

export type FeatureId =
  | 'relax_body_scan'
  | 'relax_tension_release'
  | 'relax_reset_wave'
  | 'relax_sleep_drop'
  | 'voice_guidance_tts'
  | 'audio_mindful_reset'
  | 'audio_gentle_hope'
  | 'report_extended_trends'
  | 'journal_archive'
  | 'report_weekly_summary';

export type EntitlementTier = 'free' | 'pro';

/** RevenueCat entitlement identifier that unlocks every "pro" feature below. */
export const PRO_ENTITLEMENT_ID = 'pro';

export const ENTITLEMENTS: Record<FeatureId, EntitlementTier> = {
  // Deep relax sessions
  relax_body_scan: 'pro',
  relax_tension_release: 'pro',
  relax_sleep_drop: 'pro',
  relax_reset_wave: 'free',

  // TTS voice guidance
  voice_guidance_tts: 'pro',

  // Premium audio tracks
  audio_mindful_reset: 'pro',
  audio_gentle_hope: 'free',

  // Extended analytics
  report_extended_trends: 'pro',
  report_weekly_summary: 'free',

  // Journal archive beyond 7 days
  journal_archive: 'pro',
};

/** Display names used by lock UIs (e.g. PaywallGate). */
export const FEATURE_NAMES: Record<FeatureId, string> = {
  relax_body_scan: 'Body Scan',
  relax_tension_release: 'Tension Release',
  relax_sleep_drop: 'Sleep Drop',
  relax_reset_wave: 'Reset Wave',
  voice_guidance_tts: 'Voice Guidance',
  audio_mindful_reset: 'Mindful Reset',
  audio_gentle_hope: 'Gentle Hope',
  report_extended_trends: 'Extended Trends',
  report_weekly_summary: 'Weekly Summary',
  journal_archive: 'Journal Archive',
};

/** One-line, feature-specific pitch shown on the locked-feature card — replaces the generic "This is a Pro feature." */
export const FEATURE_DESCRIPTIONS: Record<FeatureId, string> = {
  relax_body_scan: 'A guided body scan to release tension zone by zone. Available with MindPulse Pro.',
  relax_tension_release: 'A guided session to release physical tension and reset your nervous system. Available with MindPulse Pro.',
  relax_sleep_drop: 'A calming wind-down session to help you drop into sleep. Available with MindPulse Pro.',
  relax_reset_wave: 'A short reset session to clear your mind. Available with MindPulse Pro.',
  voice_guidance_tts: 'Spoken voice guidance through every session. Available with MindPulse Pro.',
  audio_mindful_reset: 'A guided audio track to reset your focus and calm your mind. Available with MindPulse Pro.',
  audio_gentle_hope: 'A gentle, calming audio track. Available with MindPulse Pro.',
  report_extended_trends: 'See your 7-day score trends and full breakdown of every score. Available with MindPulse Pro.',
  report_weekly_summary: 'A weekly AI-written reflection on your progress. Available with MindPulse Pro.',
  journal_archive: 'Access your full journal history beyond the last 7 days. Available with MindPulse Pro.',
};
