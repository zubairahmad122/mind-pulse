import { PILLAR_COLORS } from '@/constants/designSystem';
import type { FeatureId } from './entitlements';
import { ROUTES } from './routes';

/**
 * Single source of truth for every eye-activity's metadata: title, subtitle,
 * duration, accent colour, emoji, and route. Every screen that advertises an
 * eye activity (library cards, the home dashboard, recommendations) must read
 * from here — never hardcode a duplicate title/duration/colour, or the copy
 * will drift out of sync the way "Eye Reset: 3 min 30 sec" vs "5 min" once did.
 */
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
  /** Pillar accent — the Eyes pillar is cyan (`PILLAR_COLORS.eye`) everywhere. */
  accent: string;
  route: string;
};

/**
 * Focus Switch's Challenge Mode (CPU race) default. Before the toggle
 * existed, every round raced the CPU unconditionally — this stays `true`
 * so the toggle's default reproduces that original behavior. Exported from
 * this dependency-light file (not FocusSprint.tsx, which pulls in
 * Reanimated) so it can be unit-tested without rendering the component.
 */
export const FOCUS_SWITCH_DEFAULT_RACE_CPU = true;

export const FOCUS_SWITCH_DURATION_SECONDS = 60;

export const EYE_GAMES: EyeActivity[] = [
  {
    // Id stays `focus-sprint` so existing links and personal bests migrate.
    id: 'focus-sprint',
    title: 'Focus Switch',
    subtitle: 'Switch focus between near and far targets',
    durationSeconds: FOCUS_SWITCH_DURATION_SECONDS,
    description: 'Practice shifting attention between near and far targets. Stop if you notice pain, blur, or double vision.',
    kind: 'game',
    emoji: '🔭',
    isPremium: false,
    accent: PILLAR_COLORS.eye,
    route: ROUTES.appEyeGame('focus-sprint'),
  },
];

export const ALL_EYE_ACTIVITIES = EYE_GAMES;

/**
 * The seven CVS-protocol exercise lengths, in order. Eye Reset's card
 * duration is always the sum of these — kept here so CVSProtocolScreen's
 * step list and every card that shows Eye Reset's duration can never drift
 * apart again.
 */
export const EYE_RESET_STEPS_SECONDS = [25, 25, 25, 30, 30, 40, 35] as const;

/** 25+25+25+30+30+40+35 = 210 → "3 min 30 sec". */
export const EYE_RESET_DURATION_SECONDS = EYE_RESET_STEPS_SECONDS.reduce(
  (sum, s) => sum + s,
  0,
);

export const EYE_BREAK_DURATION_SECONDS = 20;

export type RecoverySession = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  isPremium: boolean;
  durationSeconds: number;
  emoji: string;
  accent: string;
};

export const RECOVERY_SESSIONS: RecoverySession[] = [
  {
    id: 'cvs-protocol',
    title: 'Eye Reset',
    subtitle: 'Guided eye relaxation',
    route: ROUTES.appCvsProtocol,
    isPremium: false,
    durationSeconds: EYE_RESET_DURATION_SECONDS,
    emoji: '🧘',
    accent: PILLAR_COLORS.eye,
  },
];

/**
 * The 20-20-20 break isn't a game or a recovery session — it's its own
 * bespoke screen — but it still needs one canonical metadata entry so the
 * exercise library and the home dashboard can't disagree about its copy.
 */
export const EYE_BREAK_ACTIVITY: EyeActivity = {
  id: 'eye-break',
  title: '20-20-20 Eye Break',
  subtitle: 'Look away every 20 minutes',
  durationSeconds: EYE_BREAK_DURATION_SECONDS,
  description: 'Look at something 20 feet away for 20 seconds to give your eyes a break from the screen.',
  kind: 'exercise',
  emoji: '👀',
  isPremium: false,
  accent: PILLAR_COLORS.eye,
  route: ROUTES.appEyeBreak,
};

export function getEyeActivity(id: string): EyeActivity | undefined {
  if (id === EYE_BREAK_ACTIVITY.id) return EYE_BREAK_ACTIVITY;
  return ALL_EYE_ACTIVITIES.find(a => a.id === id);
}

export function getRecoverySession(id: string): RecoverySession | undefined {
  return RECOVERY_SESSIONS.find(s => s.id === id);
}

/** 210 → "3 min 30 sec"; 60 → "1 min"; 20 → "20 sec". */
export function formatActivityDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}
