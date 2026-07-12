import type { FeatureId } from './entitlements';

export type EyeActivityKind = 'exercise' | 'game';

export type EyeActivity = {
  id: string;
  title: string;
  subtitle: string;
  durationSeconds: number;
  description: string;
  kind: EyeActivityKind;
  emoji: string;
  isPremium: boolean;
  /** Entitlement gating this activity. Omit for free, ungated activities. */
  featureId?: FeatureId;
};

export const EYE_GAMES: EyeActivity[] = [
  {
    id: 'saccade-sniper',
    title: 'Target Tap',
    subtitle: 'Tap the moving targets · 60 sec',
    durationSeconds: 60,
    description: 'Tap glowing targets as fast as possible. Trains rapid eye movement degraded by screen overuse.',
    kind: 'game',
    emoji: '🎯',
    isPremium: false,
  },
  {
    id: 'focus-sprint',
    title: 'Focus Switch',
    subtitle: 'Switch near and far focus · 90 sec',
    durationSeconds: 90,
    description: 'Lock focus on near or far targets before the CPU. Trains the focusing muscles that get tired from screens.',
    kind: 'game',
    emoji: '🔭',
    isPremium: false,
    featureId: 'eye_focus_sprint',
  },
  {
    id: 'dichoptic-reaction',
    title: 'Both Eyes Together',
    subtitle: 'See in 3D · 60 sec',
    durationSeconds: 60,
    description: 'Tap targets that match the active color — each eye sees only one color through red/cyan 3D glasses. Trains both eyes to work together.',
    kind: 'game',
    emoji: '🥽',
    isPremium: false,
    featureId: 'eye_dichoptic',
  },
];

export const COMET_TRACE_ACTIVITY: EyeActivity = {
  id: 'comet-trace',
  title: 'Follow the Dot',
  subtitle: 'Follow a moving target · 60 sec',
  durationSeconds: 60,
  description: 'Hold your finger on the moving comet and let your eyes follow smoothly. Trains the eye muscles that get strained from staring at screens.',
  kind: 'exercise',
  emoji: '☄️',
  isPremium: false,
};

export const ALL_EYE_ACTIVITIES = [...EYE_GAMES, COMET_TRACE_ACTIVITY];

export type RecoverySession = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  isPremium: boolean;
};

export const RECOVERY_SESSIONS: RecoverySession[] = [
  {
    id: 'cvs-protocol',
    title: 'Eye Reset',
    subtitle: 'Guided eye relaxation',
    route: '/cvs-protocol',
    isPremium: false,
  },
  {
    id: 'comet-trace',
    title: 'Follow the Dot',
    subtitle: 'Follow a moving target · 20 sec',
    route: '/eye-game/comet-trace',
    isPremium: false,
  },
];

export function getEyeActivity(id: string): EyeActivity | undefined {
  return ALL_EYE_ACTIVITIES.find(a => a.id === id);
}

export function getRecoverySession(id: string): RecoverySession | undefined {
  return RECOVERY_SESSIONS.find(s => s.id === id);
}
