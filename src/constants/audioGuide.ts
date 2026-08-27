/**
 * Pre-recorded MP3 voice-guide registry (replaces the old TTS system).
 *
 * Files live at assets/audio/guide/<lang>/<area>/<id>.mp3 — all clips are
 * real recordings (en + hi). Scripts: assets/audio/guide/SCRIPTS.md.
 * Urdu app language plays the `hi` recordings.
 */

export type GuideLang = 'en' | 'hi';

export type AudioClipId =
  | 'breathing/settle-in'
  | 'breathing/breathe-in'
  | 'breathing/hold'
  | 'breathing/breathe-out'
  | 'breathing/hold-empty'
  | 'breathing/complete'
  | 'calm-flow/intro'
  | 'calm-flow/complete'
  | 'bedtime/intro'
  | 'bedtime/complete'
  | 'bodyscan/intro'
  | 'bodyscan/complete'
  | 'bodyscan/head'
  | 'bodyscan/neck'
  | 'bodyscan/chest'
  | 'bodyscan/arms'
  | 'bodyscan/stomach'
  | 'bodyscan/legs'
  | 'grounding/intro'
  | 'grounding/complete'
  | 'grounding/see'
  | 'grounding/touch'
  | 'grounding/hear'
  | 'grounding/smell'
  | 'grounding/taste'
  | 'tension/release'
  | 'tension/complete'
  | 'tension/fists'
  | 'tension/shoulders'
  | 'tension/jaw'
  | 'tension/stomach'
  | 'tension/legs'
  | 'tension/toes'
  | 'eyes/reset-intro'
  | 'eyes/reset-circle'
  | 'eyes/reset-square'
  | 'eyes/reset-triangle'
  | 'eyes/reset-ninedot'
  | 'eyes/reset-quick'
  | 'eyes/reset-nearfar'
  | 'eyes/reset-shift'
  | 'eyes/reset-complete';

/** Map the app language to one of the recorded guide languages. */
export function resolveGuideLang(langCode: string): GuideLang {
  // The 'hi' folder holds the Hindi/Urdu recordings — use them for both.
  if (langCode === 'ur' || langCode === 'hi') return 'hi';
  return 'en';
}

/** clipId → per-language bundled audio module. */
export const AUDIO_GUIDE: Record<AudioClipId, Record<GuideLang, number>> = {
  'breathing/settle-in': {
    en: require('@/assets/audio/guide/en/breathing/settle-in.mp3'),
    hi: require('@/assets/audio/guide/hi/breathing/settle-in.mp3'),
  },
  'calm-flow/intro': {
    en: require('@/assets/audio/guide/en/calm-flow/intro.mp3'),
    hi: require('@/assets/audio/guide/hi/calm-flow/intro.mp3'),
  },
  'calm-flow/complete': {
    en: require('@/assets/audio/guide/en/calm-flow/complete.mp3'),
    hi: require('@/assets/audio/guide/hi/calm-flow/complete.mp3'),
  },
  'bedtime/intro': {
    en: require('@/assets/audio/guide/en/bedtime/intro.mp3'),
    hi: require('@/assets/audio/guide/hi/bedtime/intro.mp3'),
  },
  'bedtime/complete': {
    en: require('@/assets/audio/guide/en/bedtime/complete.mp3'),
    hi: require('@/assets/audio/guide/hi/bedtime/complete.mp3'),
  },
  'breathing/breathe-in': {
    en: require('@/assets/audio/guide/en/breathing/breathe-in.mp3'),
    hi: require('@/assets/audio/guide/hi/breathing/breathe-in.mp3'),
  },
  'breathing/hold': {
    en: require('@/assets/audio/guide/en/breathing/hold.mp3'),
    hi: require('@/assets/audio/guide/hi/breathing/hold.mp3'),
  },
  'breathing/breathe-out': {
    en: require('@/assets/audio/guide/en/breathing/breathe-out.mp3'),
    hi: require('@/assets/audio/guide/hi/breathing/breathe-out.mp3'),
  },
  'breathing/hold-empty': {
    en: require('@/assets/audio/guide/en/breathing/hold-empty.mp3'),
    hi: require('@/assets/audio/guide/hi/breathing/hold-empty.mp3'),
  },
  'breathing/complete': {
    en: require('@/assets/audio/guide/en/breathing/complete.mp3'),
    hi: require('@/assets/audio/guide/hi/breathing/complete.mp3'),
  },
  'bodyscan/intro': {
    en: require('@/assets/audio/guide/en/bodyscan/intro.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/intro.mp3'),
  },
  'bodyscan/complete': {
    en: require('@/assets/audio/guide/en/bodyscan/complete.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/complete.mp3'),
  },
  'bodyscan/head': {
    en: require('@/assets/audio/guide/en/bodyscan/head.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/head.mp3'),
  },
  'bodyscan/neck': {
    en: require('@/assets/audio/guide/en/bodyscan/neck.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/neck.mp3'),
  },
  'bodyscan/chest': {
    en: require('@/assets/audio/guide/en/bodyscan/chest.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/chest.mp3'),
  },
  'bodyscan/arms': {
    en: require('@/assets/audio/guide/en/bodyscan/arms.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/arms.mp3'),
  },
  'bodyscan/stomach': {
    en: require('@/assets/audio/guide/en/bodyscan/stomach.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/stomach.mp3'),
  },
  'bodyscan/legs': {
    en: require('@/assets/audio/guide/en/bodyscan/legs.mp3'),
    hi: require('@/assets/audio/guide/hi/bodyscan/legs.mp3'),
  },
  'grounding/intro': {
    en: require('@/assets/audio/guide/en/grounding/intro.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/intro.mp3'),
  },
  'grounding/complete': {
    en: require('@/assets/audio/guide/en/grounding/complete.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/complete.mp3'),
  },
  'grounding/see': {
    en: require('@/assets/audio/guide/en/grounding/see.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/see.mp3'),
  },
  'grounding/touch': {
    en: require('@/assets/audio/guide/en/grounding/touch.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/touch.mp3'),
  },
  'grounding/hear': {
    en: require('@/assets/audio/guide/en/grounding/hear.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/hear.mp3'),
  },
  'grounding/smell': {
    en: require('@/assets/audio/guide/en/grounding/smell.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/smell.mp3'),
  },
  'grounding/taste': {
    en: require('@/assets/audio/guide/en/grounding/taste.mp3'),
    hi: require('@/assets/audio/guide/hi/grounding/taste.mp3'),
  },
  'tension/release': {
    en: require('@/assets/audio/guide/en/tension/release.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/release.mp3'),
  },
  'tension/complete': {
    en: require('@/assets/audio/guide/en/tension/complete.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/complete.mp3'),
  },
  'tension/fists': {
    en: require('@/assets/audio/guide/en/tension/fists.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/fists.mp3'),
  },
  'tension/shoulders': {
    en: require('@/assets/audio/guide/en/tension/shoulders.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/shoulders.mp3'),
  },
  'tension/jaw': {
    en: require('@/assets/audio/guide/en/tension/jaw.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/jaw.mp3'),
  },
  'tension/stomach': {
    en: require('@/assets/audio/guide/en/tension/stomach.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/stomach.mp3'),
  },
  'tension/legs': {
    en: require('@/assets/audio/guide/en/tension/legs.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/legs.mp3'),
  },
  'tension/toes': {
    en: require('@/assets/audio/guide/en/tension/toes.mp3'),
    hi: require('@/assets/audio/guide/hi/tension/toes.mp3'),
  },
  'eyes/reset-intro': {
    en: require('@/assets/audio/guide/en/eyes/reset-intro.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-intro.mp3'),
  },
  'eyes/reset-circle': {
    en: require('@/assets/audio/guide/en/eyes/reset-circle.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-circle.mp3'),
  },
  'eyes/reset-square': {
    en: require('@/assets/audio/guide/en/eyes/reset-square.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-square.mp3'),
  },
  'eyes/reset-triangle': {
    en: require('@/assets/audio/guide/en/eyes/reset-triangle.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-triangle.mp3'),
  },
  'eyes/reset-ninedot': {
    en: require('@/assets/audio/guide/en/eyes/reset-ninedot.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-ninedot.mp3'),
  },
  'eyes/reset-quick': {
    en: require('@/assets/audio/guide/en/eyes/reset-quick.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-quick.mp3'),
  },
  'eyes/reset-nearfar': {
    en: require('@/assets/audio/guide/en/eyes/reset-nearfar.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-nearfar.mp3'),
  },
  'eyes/reset-shift': {
    en: require('@/assets/audio/guide/en/eyes/reset-shift.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-shift.mp3'),
  },
  'eyes/reset-complete': {
    en: require('@/assets/audio/guide/en/eyes/reset-complete.mp3'),
    hi: require('@/assets/audio/guide/hi/eyes/reset-complete.mp3'),
  },
};
