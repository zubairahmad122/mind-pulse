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

/** "540 → 9 min", "320 → 5:20 min" — one formatter for every duration label. */
export function formatSessionDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`;
}

export type SessionCategory = 'breathe' | 'release' | 'ground' | 'sleep';

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
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
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
    color: '#4FC3F7',
    breathingPattern: 'calm',
    defaultSound: 'forest',
    emotionTriggers: ['at-ease'],
    timeOfDay: 'afternoon',
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
    color: '#4FC3F7',
    breathingPattern: 'box',
    defaultSound: 'ocean',
    emotionTriggers: ['tense', 'overwhelmed'],
    timeOfDay: 'anytime',
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
    color: '#FF9800',
    breathingPattern: 'wave',
    defaultSound: 'forest',
    featureId: 'relax_reset_wave',
    emotionTriggers: ['drained'],
    timeOfDay: 'afternoon',
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
    color: '#a78bfa',
    breathingPattern: 'drop',
    defaultSound: 'rain',
    featureId: 'relax_sleep_drop',
    emotionTriggers: ['sleepy'],
    timeOfDay: 'evening',
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
    color: '#4FC3F7',
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
    color: '#FF9800',
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
    color: '#4CAF50',
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
