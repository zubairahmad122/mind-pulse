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
  durationSeconds: number;
  cycles: number;
  phases: BreathingPhase[];
  color: string;
  glowColor: string;
  emoji: string;
}

export const BREATHING_PATTERNS: Record<BreathingPattern, BreathingPatternDef> = {
  calm: {
    id: 'calm',
    title: 'Calm Flow',
    description: 'No rhythm to follow. Let your breathing find its pace.',
    durationSeconds: 533,
    cycles: -1, // Infinite (user-paced)
    phases: [
      {
        name: 'inhale',
        duration: 0, // User paced
        label: 'Breathe In',
        color: '#7B61FF',
      },
    ],
    color: '#7B61FF',
    glowColor: 'rgba(123,97,255,0.25)',
    emoji: '🫁',
  },

  box: {
    id: 'box',
    title: 'Box Breathing',
    description: 'Instant calm. Structure you can follow.',
    durationSeconds: 320,
    cycles: 20,
    phases: [
      { name: 'inhale', duration: 4, label: 'Inhale', color: '#4FC3F7' },
      { name: 'hold-in', duration: 4, label: 'Hold', color: '#B39DDB' },
      { name: 'exhale', duration: 4, label: 'Exhale', color: '#7B61FF' },
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
    durationSeconds: 375,
    cycles: 27,
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
    durationSeconds: 648,
    cycles: 50,
    phases: [
      { name: 'inhale', duration: 4, label: 'Inhale', color: '#7B61FF' },
      { name: 'hold-in', duration: 4, label: 'Hold', color: '#6A4C93' },
      { name: 'exhale', duration: 8, label: 'Exhale', color: '#5A3A7D' },
      { name: 'hold-out', duration: 5, label: 'Hold', color: '#4A2A6D' },
    ],
    color: '#7B61FF',
    glowColor: 'rgba(123,97,255,0.25)',
    emoji: '😴',
  },
};

export function getBreathingPattern(id: BreathingPattern): BreathingPatternDef {
  return BREATHING_PATTERNS[id];
}
