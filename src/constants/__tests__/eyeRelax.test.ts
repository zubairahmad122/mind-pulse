import { PILLAR_COLORS } from '@/constants/designSystem';
import {
  EYE_BREAK_ACTIVITY,
  EYE_RESET_DURATION_SECONDS,
  EYE_RESET_STEPS_SECONDS,
  formatActivityDuration,
  getEyeActivity,
  getRecoverySession,
} from '../eyeRelax';

describe('eye activity metadata — single source of truth', () => {
  it('Eye Reset runs 3 min 30 sec (the CVS protocol real length, not 5 min)', () => {
    const eyeReset = getRecoverySession('cvs-protocol')!;
    expect(eyeReset.durationSeconds).toBe(EYE_RESET_DURATION_SECONDS);
    expect(EYE_RESET_DURATION_SECONDS).toBe(210);
    expect(formatActivityDuration(EYE_RESET_DURATION_SECONDS)).toBe('3 min 30 sec');
  });

  it('Eye Reset duration is derived from the actual CVS protocol step lengths (no drift)', () => {
    // The displayed duration must equal the real calculated session length —
    // the seven CVS exercises. If a step changes, this fails and forces the
    // metadata (and the protocol screen, which imports the same constant) to
    // stay in sync. Guards against a future 3:30 vs 5:00-style mismatch.
    const realTotal = EYE_RESET_STEPS_SECONDS.reduce((sum, s) => sum + s, 0);
    expect(EYE_RESET_DURATION_SECONDS).toBe(realTotal);
    expect(EYE_RESET_STEPS_SECONDS).toHaveLength(7);
    expect(realTotal).toBe(210);
    expect(formatActivityDuration(realTotal)).toBe('3 min 30 sec');
  });

  it('Focus Switch runs 60 sec and the 20-20-20 break runs 20 sec', () => {
    expect(getEyeActivity('focus-sprint')!.durationSeconds).toBe(60);
    expect(EYE_BREAK_ACTIVITY.durationSeconds).toBe(20);
  });

  it('every eye activity wears the single Eyes-pillar cyan accent', () => {
    const allActivities = [
      getEyeActivity('focus-sprint')!,
      EYE_BREAK_ACTIVITY,
    ];
    const allSessions = [getRecoverySession('cvs-protocol')!];
    for (const item of [...allActivities, ...allSessions]) {
      expect(item.accent).toBe(PILLAR_COLORS.eye);
      // Guard the known mismatches that shipped (green / teal hex).
      expect(item.accent).not.toBe('#6ee7b7');
      expect(item.accent).not.toBe('#22d3ee');
    }
  });

  it('formats durations consistently', () => {
    expect(formatActivityDuration(20)).toBe('20 sec');
    expect(formatActivityDuration(60)).toBe('1 min');
    expect(formatActivityDuration(180)).toBe('3 min');
    expect(formatActivityDuration(210)).toBe('3 min 30 sec');
  });

  it('preserves the existing ids and routes used by navigation/persistence', () => {
    // These exact strings are relied on elsewhere (routing, gameRecords,
    // completion tracking) — changing them is a breaking change, not a
    // metadata-source refactor.
    expect(getEyeActivity('focus-sprint')!.id).toBe('focus-sprint');
    expect(getEyeActivity('focus-sprint')!.route).toBe('/(app)/eye-game/focus-sprint');
    expect(getRecoverySession('cvs-protocol')!.id).toBe('cvs-protocol');
    expect(getRecoverySession('cvs-protocol')!.route).toBe('/(app)/cvs-protocol');
    expect(EYE_BREAK_ACTIVITY.id).toBe('eye-break');
    expect(EYE_BREAK_ACTIVITY.route).toBe('/(app)/eye-break');
  });
});

describe('drift prevention — no duplicate eye-activity metadata source', () => {
  // Untyped requires — this project deliberately excludes @types/node from
  // its ambient types (RN app code shouldn't see Node globals), so these
  // stay `any` rather than pulling in Node's module types project-wide.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs: any = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path: any = require('path');

  // These are exactly the screens that must not hardcode a duplicate
  // title/duration/colour instead of reading from `eyeRelax.ts`.
  const consumerFiles = [
    'src/screens/app/EyeExercisesScreen.tsx',
    'src/screens/app/EyeGamesScreen.tsx',
    'src/screens/app/eye-game/[id].tsx',
    'src/screens/app/CVSProtocolScreen.tsx',
    'src/constants/homeDashboard.ts',
  ];

  it('the old duplicated metadata file no longer exists', () => {
    const stalePath = path.join(process.cwd(), 'src/constants/eyeActivities.ts');
    expect(fs.existsSync(stalePath)).toBe(false);
  });

  it.each(consumerFiles)('%s imports activity metadata from the canonical eyeRelax module', file => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const importsFromCanonicalSource =
      /from ['"]@\/constants\/eyeRelax['"]/.test(source) ||
      /from ['"]@\/constants['"]/.test(source) || // the barrel re-exports eyeRelax
      /from ['"]\.\/eyeRelax['"]/.test(source); // sibling import within src/constants itself
    expect(importsFromCanonicalSource).toBe(true);
    // Must not reintroduce a second, independent metadata file.
    expect(source).not.toMatch(/from ['"]@\/constants\/eyeActivities['"]/);
  });
});
