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
    color: '#a78bfa',
  },
];

export function getEmotionOption(state: EmotionalState): EmotionOption {
  return EMOTIONAL_STATES.find(e => e.state === state) || EMOTIONAL_STATES[0];
}
