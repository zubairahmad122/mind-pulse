import { AlertCircle, Cloud, Leaf, Moon, ZapOff, type LucideIcon } from 'lucide-react-native';

export type EmotionalState = 'at-ease' | 'tense' | 'overwhelmed' | 'drained' | 'sleepy';

export interface EmotionOption {
  state: EmotionalState;
  emoji: string;
  label: string;
  description: string;
  color: string;
}

export const EMOTIONAL_STATES: EmotionOption[] = [
  {
    state: 'at-ease',
    emoji: '😌',
    label: 'At Ease',
    description: 'Calm and settled',
    color: '#4CAF50',
  },
  {
    state: 'tense',
    emoji: '😐',
    label: 'A Little Tense',
    description: 'Some things on your mind',
    color: '#FFC107',
  },
  {
    state: 'overwhelmed',
    emoji: '😤',
    label: 'Overwhelmed',
    description: 'Need to step back',
    color: '#FF6B6B',
  },
  {
    state: 'drained',
    emoji: '😔',
    label: 'Drained',
    description: 'Running low on energy',
    color: '#FF9800',
  },
  {
    state: 'sleepy',
    emoji: '😴',
    label: 'Sleepy',
    description: 'Ready to rest',
    color: '#A48BFF',
  },
];

export function getEmotionOption(state: EmotionalState): EmotionOption {
  return EMOTIONAL_STATES.find(e => e.state === state) || EMOTIONAL_STATES[0];
}

/** One line icon per mood — shared by the Relax tab picker and the session completion screen. */
export const EMOTION_ICONS: Record<EmotionalState, LucideIcon> = {
  'at-ease': Leaf,
  'tense': AlertCircle,
  'overwhelmed': Cloud,
  'drained': ZapOff,
  'sleepy': Moon,
};
