import { Wind, Box, Waves, Moon, Heart, Zap, Globe, type LucideIcon } from 'lucide-react-native';
import type { FeatureId } from './entitlements';
import type { BreathingMusicId } from './breathingMusic';
import { BREATHING_PATTERNS, patternDurationSeconds, type BreathingPattern } from './breathingPatterns';
import type { EmotionalState } from './emotionalStates';

// Breathing sessions take their EXACT length from the pattern (cycles ×
// cycle seconds) so the card, the player timer, and the last cycle always
// agree. Narration sessions keep hand-set estimates.
const PATTERN_SECONDS = {
  calm: patternDurationSeconds(BREATHING_PATTERNS.calm),
  box: patternDurationSeconds(BREATHING_PATTERNS.box),
  wave: patternDurationSeconds(BREATHING_PATTERNS.wave),
  drop: patternDurationSeconds(BREATHING_PATTERNS.drop),
} as const;

/**
 * "540 → 9 min", "320 → 5m 20s" — one formatter for every duration label.
 * Deliberately not "5:20 min" — that reads as a clock time, not a duration.
 */
export function formatSessionDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

export type SessionCategory = 'breathe' | 'release' | 'ground' | 'sleep';

/**
 * One accent color per category — every session in a category shares it, so
 * the category itself has a recognizable identity instead of colors varying
 * session-by-session within the same category. Used everywhere a category
 * shows up on the Relax screen: hero, cards, icons, progress bar, buttons.
 *
 * NOTE: `sleep` (Wind Down) no longer matches PILLAR_COLORS.sleep (#a78bfa) —
 * an earlier round deliberately aligned them so Relax's Wind Down matched the
 * Sleep tab's own accent. This palette is a newer, explicit instruction to
 * use one fixed 4-color set inside Relax; flagging the tradeoff since it
 * re-introduces that cross-screen mismatch.
 */
export const CATEGORY_COLOR: Record<SessionCategory, string> = {
  breathe: '#36D3FF',
  release: '#5CE4B4',
  ground: '#F3B74D',
  sleep: '#8D6BFF',
};

/** A brighter tint of each category color, for text that sits on a filled
 * pill of the base color (e.g. the Start button) — plain base-color text on
 * a base-color-tinted background reads flat/low-contrast. */
export const CATEGORY_COLOR_LIGHT: Record<SessionCategory, string> = {
  breathe: '#6FD8FF',
  release: '#8FF0D0',
  ground: '#FFD98F',
  sleep: '#B9A6FF',
};

export interface RelaxSession {
  id: string;
  title: string;
  category: SessionCategory;
  durationSeconds: number;
  description: string;
  emoji: string;
  icon?: LucideIcon;
  color: string;

  /** Entitlement gating this session. Omit for free, ungated sessions. */
  featureId?: FeatureId;

  // For breathing sessions
  breathingPattern?: BreathingPattern;
  defaultSound?: BreathingMusicId;

  // Recommendation logic
  emotionTriggers: EmotionalState[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
  useCase: string;

  // Content metadata
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export const RELAX_SESSIONS: RelaxSession[] = [
  // BREATHE CATEGORY
  {
    id: 'calm-flow',
    title: 'Calm Flow',
    category: 'breathe',
    durationSeconds: PATTERN_SECONDS.calm,
    description: 'Gentle five-second waves. Breathe with the circle.',
    emoji: '🫁',
    icon: Wind,
    color: CATEGORY_COLOR.breathe,
    breathingPattern: 'calm',
    defaultSound: 'forest',
    emotionTriggers: ['at-ease'],
    timeOfDay: 'evening',
    useCase: 'Break time, exploration, curiosity',
    difficulty: 'beginner',
    tags: ['relaxation', 'openness', 'clarity'],
  },

  {
    id: 'box-breathing',
    title: 'Box Breathing',
    category: 'breathe',
    durationSeconds: PATTERN_SECONDS.box,
    description: 'Calm your nervous system. Structure you can follow.',
    emoji: '📦',
    icon: Box,
    color: CATEGORY_COLOR.breathe,
    breathingPattern: 'box',
    defaultSound: 'ocean',
    emotionTriggers: ['tense', 'overwhelmed'],
    timeOfDay: 'afternoon',
    useCase: 'Anxiety, overwhelm, before stressful events',
    difficulty: 'beginner',
    tags: ['anxiety', 'calm', 'structure'],
  },

  {
    id: 'reset-wave',
    title: 'Reset Wave',
    category: 'breathe',
    durationSeconds: PATTERN_SECONDS.wave,
    description: 'Wake up your senses. Restore your energy.',
    emoji: '🌊',
    icon: Waves,
    color: CATEGORY_COLOR.breathe,
    breathingPattern: 'wave',
    defaultSound: 'forest',
    featureId: 'relax_reset_wave',
    emotionTriggers: ['drained'],
    timeOfDay: 'morning',
    useCase: 'Afternoon slump, energy dip, low motivation',
    difficulty: 'beginner',
    tags: ['energy', 'wake', 'focus'],
  },

  {
    id: 'sleep-drop',
    title: 'Bedtime Relaxation',
    category: 'sleep',
    durationSeconds: PATTERN_SECONDS.drop,
    description: 'Slow everything down. Drift into rest.',
    emoji: '😴',
    icon: Moon,
    color: CATEGORY_COLOR.sleep,
    breathingPattern: 'drop',
    defaultSound: 'rain',
    featureId: 'relax_sleep_drop',
    emotionTriggers: ['sleepy'],
    timeOfDay: 'night',
    useCase: 'Bedtime, sleep preparation, insomnia',
    difficulty: 'beginner',
    tags: ['sleep', 'rest', 'drift'],
  },

  // RELEASE CATEGORY
  {
    id: 'body-scan',
    title: 'Body Scan',
    category: 'release',
    durationSeconds: 510,
    description: 'Travel through your body and release what you have been holding.',
    emoji: '🫀',
    icon: Heart,
    color: CATEGORY_COLOR.release,
    defaultSound: 'ocean',
    featureId: 'relax_body_scan',
    emotionTriggers: ['tense', 'overwhelmed', 'drained'],
    timeOfDay: 'anytime',
    useCase: 'Tension release, grounding, presence',
    difficulty: 'beginner',
    tags: ['body-awareness', 'tension', 'release'],
  },

  {
    id: 'muscle-release',
    title: 'Muscle Release',
    category: 'release',
    // Estimate between the languages: EN zones run ~4 min, HI ~6 min
    // (per-zone waits differ — see tension-release PHASE_SECONDS).
    durationSeconds: 300,
    description: 'Squeeze everything tight. Then let it all collapse.',
    emoji: '💪',
    icon: Zap,
    color: CATEGORY_COLOR.release,
    defaultSound: 'fire',
    featureId: 'relax_tension_release',
    emotionTriggers: ['tense', 'overwhelmed'],
    timeOfDay: 'afternoon',
    useCase: 'Physical tension, stress relief, full body release',
    difficulty: 'beginner',
    tags: ['progressive-relaxation', 'tension', 'strength'],
  },

  // GROUND CATEGORY
  {
    id: '5-4-3-2-1',
    title: '5-4-3-2-1 Grounding',
    category: 'ground',
    durationSeconds: 255,
    description: 'Your senses are your anchor when thoughts run away.',
    emoji: '🌍',
    icon: Globe,
    color: CATEGORY_COLOR.ground,
    emotionTriggers: ['overwhelmed', 'tense'],
    timeOfDay: 'anytime',
    useCase: 'Emergency grounding, anxiety, panic, disconnect',
    difficulty: 'beginner',
    tags: ['grounding', 'sensory', 'presence'],
  },

  // Add more as needed in future
];

export function getSessionById(id: string): RelaxSession | null {
  return RELAX_SESSIONS.find(s => s.id === id) || null;
}

/**
 * Where a session actually plays. Narration sessions (Body Scan, Muscle
 * Release, Grounding) have DEDICATED fully-voice-guided screens — sending them
 * to the generic breathing player would leave the user with an intro and then
 * silence. Everything else uses the breathing player.
 */
export function getSessionRoute(sessionId: string): { pathname: string; params?: { sessionId: string } } {
  switch (sessionId) {
    case 'body-scan':
      return { pathname: '/(app)/stress/body-scan' };
    case 'muscle-release':
      return { pathname: '/(app)/stress/tension-release' };
    case '5-4-3-2-1':
      return { pathname: '/(app)/stress/grounding' };
    default:
      return { pathname: '/(app)/relax/player', params: { sessionId } };
  }
}

export function getSessionsByCategory(category: SessionCategory): RelaxSession[] {
  return RELAX_SESSIONS.filter(s => s.category === category);
}

export function getRecommendedSession(emotion: EmotionalState): RelaxSession | null {
  const filtered = RELAX_SESSIONS.filter(s => s.emotionTriggers.includes(emotion));
  return filtered.length > 0 ? filtered[0] : null;
}

export function getSessionsByEmotion(emotion: EmotionalState): RelaxSession[] {
  return RELAX_SESSIONS.filter(s => s.emotionTriggers.includes(emotion));
}

/**
 * A sensible session to lead with before the user has picked a mood —
 * matches the current time of day against each session's `timeOfDay`,
 * falling back to 'anytime' sessions. Real, derived from actual session
 * metadata (not a placeholder).
 */
export function getDefaultRecommendedSession(date: Date = new Date()): RelaxSession | null {
  const hour = date.getHours();
  const period =
    hour < 6 ? 'night' :
    hour < 12 ? 'morning' :
    hour < 17 ? 'afternoon' :
    hour < 21 ? 'evening' :
    'night';
  const forPeriod = RELAX_SESSIONS.filter(s => s.timeOfDay === period);
  if (forPeriod.length > 0) return forPeriod[0];
  const anytime = RELAX_SESSIONS.filter(s => s.timeOfDay === 'anytime');
  return anytime.length > 0 ? anytime[0] : RELAX_SESSIONS[0] ?? null;
}
