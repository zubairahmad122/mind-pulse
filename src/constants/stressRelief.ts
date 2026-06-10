import { ROUTES } from './routes';

export type StressActivity = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  durationMin: number;
  route: string;
  color: string;
};

export const STRESS_ACTIVITIES: StressActivity[] = [
  {
    id: 'body',
    title: 'Body Scan',
    subtitle: 'Travel through your body and release what you\'ve been holding',
    emoji: '🧘',
    durationMin: 8,
    route: ROUTES.appBodyScan,
    color: '#4FC3F7',
  },
  {
    id: 'grounding',
    title: '5-4-3-2-1 Grounding',
    subtitle: 'Your senses are your anchor when thoughts run away',
    emoji: '🌍',
    durationMin: 4,
    route: ROUTES.appGrounding,
    color: '#4CAF50',
  },
  {
    id: 'tension',
    title: 'Muscle Release',
    subtitle: 'Squeeze everything tight. Then let it all collapse.',
    emoji: '💪',
    durationMin: 5,
    route: ROUTES.appTensionRelease,
    color: '#FF9800',
  },
  {
    id: 'journal',
    title: 'Stress Journal',
    subtitle: 'Name it to tame it — 3 minutes to clear the noise',
    emoji: '📓',
    durationMin: 10,
    route: ROUTES.appJournal,
    color: '#9C27B0',
  },
];

export const STRESS_TIPS = [
  'Name 3 things you can see right now — it pulls your mind into the present.',
  'Hum a low note for 10 seconds — it activates your vagus nerve.',
  'Splash cool water on your wrists to signal safety to your body.',
  'Tense your shoulders for 5 seconds, then let go completely.',
];

export function stressSuggestion(level: number): string {
  if (level >= 5) return 'You\'re carrying a lot right now. 5-4-3-2-1 Grounding, then Box Breathing — one breath at a time.';
  if (level >= 4) return 'Box Breathing for 5 minutes can help your nervous system come down gently.';
  if (level >= 3) return 'A Calm Wave session may be exactly what you need to reset right now.';
  return 'A short Body Scan can keep tension from building up quietly.';
}

// Supportive stress state labels — no clinical language
export function stressStateLabel(level: number): string {
  if (level >= 5) return 'Overwhelmed';
  if (level >= 4) return 'Carrying a lot';
  if (level >= 3) return 'A little tense';
  if (level >= 2) return 'Settled';
  return 'Peaceful';
}
