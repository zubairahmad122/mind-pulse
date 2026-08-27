export type BreathingPattern = 'calm' | 'box' | 'wave' | 'drop';

export interface BreathingPhase {
  name: 'inhale' | 'hold-in' | 'exhale' | 'hold-out';
  duration: number; // seconds
  label: string;
  color: string;
}

export interface BreathingPatternDef {
  id: BreathingPattern;
  title: string;
  description: string;
  cycles: number;
  phases: BreathingPhase[];
  color: string;
  glowColor: string;
  emoji: string;
}

/**
 * SINGLE SOURCE OF TRUTH for breathing-session timing.
 *
 * A session's length IS `cycles × cycle length` — there is no separately
 * stored duration anywhere. relaxSessions.ts derives its durationSeconds
 * from these helpers and the player runs the timer on that exact value,
 * so the card, the timer, and the real end always agree and every session
 * ends exactly on the last cycle's final exhale/hold.
 */
export function patternCycleSeconds(def: BreathingPatternDef): number {
  return def.phases.reduce((sum, p) => sum + p.duration, 0);
}

export function patternDurationSeconds(def: BreathingPatternDef): number {
  return def.cycles * patternCycleSeconds(def);
}

export const BREATHING_PATTERNS: Record<BreathingPattern, BreathingPatternDef> = {
  calm: {
    id: 'calm',
    title: 'Calm Flow',
    description: 'Gentle five-second waves. Breathe with the circle.',
    cycles: 54, // 54 × 10s = 540s = exactly 9:00
    // Coherent breathing: even 5-in / 5-out, no holds — the softest
    // guided rhythm. The orb expands and contracts with these phases
    // just like Box Breathing / Reset Wave.
    phases: [
      { name: 'inhale', duration: 5, label: 'Breathe In', color: '#4FC3F7' },
      { name: 'exhale', duration: 5, label: 'Breathe Out', color: '#4FC3F7' },
    ],
    color: '#4FC3F7',
    glowColor: 'rgba(79,195,247,0.25)',
    emoji: '🫁',
  },

  box: {
    id: 'box',
    title: 'Box Breathing',
    description: 'Instant calm. Structure you can follow.',
    cycles: 20, // 20 × 16s = 320s = 5:20
    phases: [
      { name: 'inhale', duration: 4, label: 'Inhale', color: '#4FC3F7' },
      { name: 'hold-in', duration: 4, label: 'Hold', color: '#B39DDB' },
      { name: 'exhale', duration: 4, label: 'Exhale', color: '#4FC3F7' },
      { name: 'hold-out', duration: 4, label: 'Hold', color: '#4DB6AC' },
    ],
    color: '#4FC3F7',
    glowColor: 'rgba(79,195,247,0.28)',
    emoji: '📦',
  },

  wave: {
    id: 'wave',
    title: 'Reset Wave',
    description: 'Wake up your senses and restore energy.',
    cycles: 27, // 27 × 14s = 378s = 6:18
    phases: [
      { name: 'inhale', duration: 4, label: 'Inhale', color: '#FF9800' },
      { name: 'hold-in', duration: 2, label: 'Hold', color: '#FFC107' },
      { name: 'exhale', duration: 6, label: 'Exhale', color: '#FF6B6B' },
      { name: 'hold-out', duration: 2, label: 'Hold', color: '#FF9800' },
    ],
    color: '#FF9800',
    glowColor: 'rgba(255,152,0,0.28)',
    emoji: '🌊',
  },

  drop: {
    id: 'drop',
    title: 'Sleep Drop',
    description: 'Slow everything down. Drift into rest.',
    cycles: 30, // 30 × 21s = 630s = 10:30 (50 was a 17.5-min lie)
    phases: [
      { name: 'inhale', duration: 4, label: 'Inhale', color: '#a78bfa' },
      { name: 'hold-in', duration: 4, label: 'Hold', color: '#8b6fd6' },
      { name: 'exhale', duration: 8, label: 'Exhale', color: '#7c5cbf' },
      { name: 'hold-out', duration: 5, label: 'Hold', color: '#6d4aa8' },
    ],
    color: '#a78bfa',
    glowColor: 'rgba(167,139,250,0.25)',
    emoji: '😴',
  },
};

export function getBreathingPattern(id: BreathingPattern): BreathingPatternDef {
  return BREATHING_PATTERNS[id];
}
