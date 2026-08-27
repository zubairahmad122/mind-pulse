import type { LucideIcon } from 'lucide-react-native';
import { Radio, StopCircle, Moon, Droplets } from 'lucide-react-native';
import type { BreathingMusicId } from './breathingMusic';
import { BREATHING_PATTERNS, patternDurationSeconds } from './breathingPatterns';

// Card minutes come from the pattern that actually runs (these modes open the
// Relax player), so the card never promises a different length than the timer.
const patternMin = (id: keyof typeof BREATHING_PATTERNS) =>
  Math.round(patternDurationSeconds(BREATHING_PATTERNS[id]) / 60);

export type BreathModeId = 'calm-flow' | 'box-release' | 'sleep-drop' | 'reset-wave';

export interface BreathMode {
  id:          BreathModeId;
  title:       string;
  tagline:     string;       // one-line human description on card
  description: string;       // longer copy on card
  intensity:   1 | 2 | 3;   // 1 = softest
  durationMin: number;
  color:       string;       // primary accent
  bgFrom:      string;       // gradient top
  bgTo:        string;       // gradient bottom
  icon:        LucideIcon;
  ambientId:   BreathingMusicId;
}

export const BREATH_MODES: BreathMode[] = [
  // ─────────────────────────────────────────────
  {
    id:          'calm-flow',
    title:       'Calm Flow',
    tagline:     'For when the noise won\'t stop.',
    description: 'The softest rhythm — five seconds in, five out. Breathe with the circle and slow down.',
    intensity:   1,
    durationMin: patternMin('calm'),
    color:       '#4FC3F7',
    bgFrom:      '#0D0B2E',
    bgTo:        '#1a1535',
    icon:        Radio,
    ambientId:   'forest',
  },

  // ─────────────────────────────────────────────
  {
    id:          'box-release',
    title:       'Box Release',
    tagline:     'A gentle rhythm to hold onto.',
    description: 'The 4-4-4-4 pattern — not as a command, but as a companion. Follow only if you wish.',
    intensity:   2,
    durationMin: patternMin('box'),
    color:       '#B39DDB',
    bgFrom:      '#0D0B2E',
    bgTo:        '#130F35',
    icon:        StopCircle,
    ambientId:   'forest',
  },

  // ─────────────────────────────────────────────
  {
    id:          'sleep-drop',
    title:       'Sleep Drop',
    tagline:     'For the mind that won\'t let go at night.',
    description: 'Almost no voice. Mostly silence and a slow, warm light. Let it carry you down.',
    intensity:   1,
    durationMin: patternMin('drop'),
    color:       '#C4A265',
    bgFrom:      '#050412',
    bgTo:        '#0A0820',
    icon:        Moon,
    ambientId:   'rain',
  },

  // ─────────────────────────────────────────────
  {
    id:          'reset-wave',
    title:       'Reset Wave',
    tagline:     'Watch the ocean breathe. Yours will follow.',
    description: 'No instruction. Just a wave. Your nervous system will synchronize without you trying.',
    intensity:   2,
    durationMin: patternMin('wave'),
    color:       '#4FC3F7',
    bgFrom:      '#050D1A',
    bgTo:        '#0A1628',
    icon:        Droplets,
    ambientId:   'ocean',
  },
];

export function getBreathMode(id: BreathModeId): BreathMode {
  return BREATH_MODES.find(m => m.id === id) ?? BREATH_MODES[0];
}
