/**
 * Single source of truth for Free vs Pro feature gating.
 * `PaywallGate` reads from this map — never duplicate this logic elsewhere.
 */

export type FeatureId =
  | 'eye_focus_sprint'
  | 'eye_dichoptic'
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
  // Advanced eye games
  eye_focus_sprint: 'pro',
  eye_dichoptic: 'pro',

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
  eye_focus_sprint: 'Focus Sprint',
  eye_dichoptic: 'Dichoptic Training',
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
