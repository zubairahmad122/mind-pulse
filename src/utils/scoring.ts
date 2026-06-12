import { SleepSession } from './sleepUtils';

// ──────────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────────

/** One line of a "Why this score?" breakdown. Always sums to the total score. */
export interface ScoreBreakdownItem {
  key: string;
  label: string;
  detail: string;
  /** Points this category contributed (already weighted). */
  points: number;
  /** Max points this category can contribute. */
  maxPoints: number;
  /** true = this category helped the score (✓), false = room to improve (✗) */
  positive: boolean;
}

export interface ScoreTheme {
  label: string;
  emoji: string;
  color: string;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdownItem[];
  theme: ScoreTheme;
}

export type FocusArea = 'Eyes' | 'Sleep' | 'Mind';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function item(
  key: string,
  label: string,
  detail: string,
  sub: number,
  weight: number,
): ScoreBreakdownItem {
  return {
    key,
    label,
    detail,
    points: (sub / 100) * weight,
    maxPoints: weight,
    positive: sub >= 50,
  };
}

/**
 * Rounds each item's points to a whole number via the largest-remainder method
 * and rounds the total the same way, so the displayed rows always sum exactly
 * to the displayed total score.
 */
function finalize(breakdown: ScoreBreakdownItem[]): { score: number; breakdown: ScoreBreakdownItem[] } {
  const rawPoints = breakdown.map(b => b.points);
  const score = Math.round(rawPoints.reduce((sum, p) => sum + p, 0));

  const floors = rawPoints.map(Math.floor);
  let remainder = score - floors.reduce((sum, f) => sum + f, 0);

  const order = rawPoints
    .map((p, i) => ({ i, frac: p - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  const rounded = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    rounded[i] += 1;
    remainder--;
  }

  return {
    score,
    breakdown: breakdown.map((b, i) => ({ ...b, points: rounded[i] })),
  };
}

/** Length of the current run of consecutive days (ending today or yesterday) present in dateKeys. */
function consecutiveDayStreak(dateKeys: string[]): number {
  const days = new Set(dateKeys);
  if (days.size === 0) return 0;

  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);

  for (let i = 0; i < 90; i++) {
    const key = cursor.toLocaleDateString('sv');
    if (days.has(key)) {
      streak++;
    } else if (i === 0) {
      // today not logged yet — streak can still continue from yesterday
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Difference between two times-of-day in minutes, accounting for midnight wraparound. */
function circularMinuteDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 720 ? 1440 - diff : diff;
}

// ──────────────────────────────────────────────
// Label systems (no harmful language — higher score is always better)
// ──────────────────────────────────────────────

export function eyeScoreTheme(score: number): ScoreTheme {
  if (score < 25) return { label: 'Eyes Need Recovery', emoji: '🌧️', color: '#f97316' };
  if (score < 50) return { label: 'Screen Time Adding Up', emoji: '☁️', color: '#f59e0b' };
  if (score < 75) return { label: 'Balanced Eye Day', emoji: '🙂', color: '#8BC34A' };
  return { label: 'Eyes Feeling Fresh', emoji: '🌿', color: '#6ee7b7' };
}

export function sleepScoreTheme(score: number): ScoreTheme {
  if (score < 25) return { label: 'Sleep Needs Support', emoji: '🌙', color: '#f97316' };
  if (score < 50) return { label: 'Restless Night', emoji: '🌥️', color: '#f59e0b' };
  if (score < 75) return { label: 'Decent Rest', emoji: '🌤️', color: '#8BC34A' };
  return { label: 'Well-Rested', emoji: '✨', color: '#a78bfa' };
}

export function mindScoreTheme(score: number): ScoreTheme {
  if (score < 25) return { label: 'Mind Needs Recharge', emoji: '🌱', color: '#f97316' };
  if (score < 50) return { label: 'Carrying Some Tension', emoji: '🌊', color: '#f59e0b' };
  if (score < 75) return { label: 'Steady & Balanced', emoji: '🙂', color: '#8BC34A' };
  return { label: 'Centered & Calm', emoji: '🧘', color: '#4FC3F7' };
}

export function pulseScoreTheme(score: number): ScoreTheme {
  if (score < 25) return { label: 'Getting Started', emoji: '🌱', color: '#f97316' };
  if (score < 50) return { label: 'Building Momentum', emoji: '🌊', color: '#f59e0b' };
  if (score < 75) return { label: 'On Track', emoji: '🙂', color: '#8BC34A' };
  return { label: 'Thriving', emoji: '✨', color: '#6ee7b7' };
}

// ──────────────────────────────────────────────
// Eye Score (Phase 1 — no device screen-time permission required)
//
// Categories (weights sum to 100):
//   Eye Breaks Taken    35%  — breaks logged today vs. daily target
//   Eye Recovery        35%  — Eye Reset / CVS protocol sessions completed today
//   Eye Training        15%  — eye training game played today
//   Break Reminders     15%  — break-enforcer habit toggle
// ──────────────────────────────────────────────

export interface EyeScoreInput {
  breaksTaken: number;
  targetBreaks?: number;
  recoverySessionsToday: number;
  gamePlayedToday: boolean;
  breakEnforcerEnabled: boolean;
}

export function calculateEyeScore({
  breaksTaken,
  targetBreaks = 3,
  recoverySessionsToday,
  gamePlayedToday,
  breakEnforcerEnabled,
}: EyeScoreInput): ScoreResult {
  const breaksSub = clamp(Math.round((breaksTaken / targetBreaks) * 100), 0, 100);
  const recoverySub = clamp(40 + recoverySessionsToday * 30, 0, 100);
  const trainingSub = gamePlayedToday ? 100 : 40;
  const enforcerSub = breakEnforcerEnabled ? 100 : 40;

  const breakdown = [
    item(
      'breaks',
      'Eye Breaks',
      `${breaksTaken} of ${targetBreaks} eye breaks taken today`,
      breaksSub,
      35,
    ),
    item(
      'recovery',
      'Eye Recovery',
      recoverySessionsToday > 0
        ? `${recoverySessionsToday} recovery session${recoverySessionsToday > 1 ? 's' : ''} completed today`
        : 'No eye recovery session completed yet today',
      recoverySub,
      35,
    ),
    item(
      'training',
      'Eye Training',
      gamePlayedToday ? 'Played an eye training game today' : 'No eye training game played today',
      trainingSub,
      15,
    ),
    item(
      'reminders',
      'Break Reminders',
      breakEnforcerEnabled
        ? 'Break reminders are turned on'
        : 'Break reminders are turned off — turn them on for steady protection',
      enforcerSub,
      15,
    ),
  ];

  const { score, breakdown: finalBreakdown } = finalize(breakdown);
  return { score, breakdown: finalBreakdown, theme: eyeScoreTheme(score) };
}

// ──────────────────────────────────────────────
// Sleep Score (Phase 1)
//
// Categories (weights sum to 100):
//   Sleep Duration        35%  — last night's duration vs. target
//   Bedtime Consistency   25%  — last bedtime vs. target bedtime
//   Sleep Quality         25%  — self-rated quality (1-5)
//   Sleep Routine         15%  — logged a session today
// ──────────────────────────────────────────────

export interface SleepScoreInput {
  sessions: SleepSession[];
  targetDurationHours: number;
  targetBedtime: string; // "HH:MM" 24h
}

export function calculateSleepScore({
  sessions,
  targetDurationHours,
  targetBedtime,
}: SleepScoreInput): ScoreResult {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0] ?? null;
  const todayKey = new Date().toLocaleDateString('sv');

  let durationSub: number;
  let bedtimeSub: number;
  let qualitySub: number;
  let routineSub: number;

  let durationDetail: string;
  let bedtimeDetail: string;
  let qualityDetail: string;
  let routineDetail: string;

  if (!last) {
    durationSub = 55;
    bedtimeSub = 55;
    qualitySub = 55;
    routineSub = 40;
    durationDetail = 'No sleep sessions logged yet';
    bedtimeDetail = 'No bedtime logged yet';
    qualityDetail = 'No sleep quality rating yet';
    routineDetail = 'Track tonight\'s sleep to start building your score';
  } else {
    const durationHours = last.durationMinutes / 60;
    const durationDiff = Math.abs(durationHours - targetDurationHours);
    durationSub = clamp(100 - durationDiff * 25, 20, 100);
    durationDetail = `${durationHours.toFixed(1)}h logged last night (target ${targetDurationHours}h)`;

    const [targetH, targetM] = targetBedtime.split(':').map(Number);
    const targetMinutes = targetH * 60 + targetM;
    const bedDate = new Date(last.startTime);
    const actualMinutes = bedDate.getHours() * 60 + bedDate.getMinutes();
    const bedtimeDiff = circularMinuteDiff(actualMinutes, targetMinutes);
    bedtimeSub = clamp(100 - bedtimeDiff * 1.5, 0, 100);
    bedtimeDetail = bedtimeDiff <= 10
      ? 'Bedtime was close to your target time'
      : `Bedtime was about ${bedtimeDiff} min off your target time`;

    const quality = last.quality && last.quality > 0 ? last.quality : null;
    qualitySub = quality ? quality * 20 : 55;
    qualityDetail = quality ? `You rated last night's sleep ${quality}/5` : 'No sleep quality rating yet';

    const loggedToday = last.date === todayKey;
    routineSub = loggedToday ? 100 : 40;
    routineDetail = loggedToday ? 'You logged a sleep session today' : 'No sleep session logged yet today';
  }

  const breakdown = [
    item('duration', 'Sleep Duration', durationDetail, durationSub, 35),
    item('bedtime', 'Bedtime Consistency', bedtimeDetail, bedtimeSub, 25),
    item('quality', 'Sleep Quality', qualityDetail, qualitySub, 25),
    item('routine', 'Sleep Routine', routineDetail, routineSub, 15),
  ];

  const { score, breakdown: finalBreakdown } = finalize(breakdown);
  return { score, breakdown: finalBreakdown, theme: sleepScoreTheme(score) };
}

// ──────────────────────────────────────────────
// Mind Score (Phase 1)
//
// Categories (weights sum to 100):
//   Recovery Sessions   40%  — relax / breathing / grounding sessions completed today
//   Journal             30%  — entries today + streak
//   Stress Check-in     30%  — latest self-reported stress level (1-5)
// ──────────────────────────────────────────────

export interface MindScoreInput {
  recoverySessionsToday: number;
  journalEntriesToday: number;
  journalStreakDays: number;
  /** 1 (low) – 5 (high), or null if no check-in today */
  stressLevel: number | null;
}

export function calculateMindScore({
  recoverySessionsToday,
  journalEntriesToday,
  journalStreakDays,
  stressLevel,
}: MindScoreInput): ScoreResult {
  const recoverySub = clamp(20 + recoverySessionsToday * 25, 0, 100);
  const journalSub = clamp(30 + journalEntriesToday * 35 + Math.min(journalStreakDays, 8) * 5, 0, 100);
  const stressSub = stressLevel != null ? (6 - stressLevel) * 20 : 60;

  const breakdown = [
    item(
      'recovery',
      'Recovery Sessions',
      recoverySessionsToday > 0
        ? `${recoverySessionsToday} recovery session${recoverySessionsToday > 1 ? 's' : ''} completed today`
        : 'No relax, breathing, or grounding session yet today',
      recoverySub,
      40,
    ),
    item(
      'journal',
      'Journal',
      journalEntriesToday > 0
        ? `${journalEntriesToday} journal entr${journalEntriesToday > 1 ? 'ies' : 'y'} today${journalStreakDays >= 2 ? ` (${journalStreakDays}-day streak)` : ''}`
        : 'No journal entry yet today',
      journalSub,
      30,
    ),
    item(
      'stress',
      'Stress Check-in',
      stressLevel != null
        ? `Self-reported stress level: ${stressLevel}/5 today`
        : 'No stress check-in yet today',
      stressSub,
      30,
    ),
  ];

  const { score, breakdown: finalBreakdown } = finalize(breakdown);
  return { score, breakdown: finalBreakdown, theme: mindScoreTheme(score) };
}

export { consecutiveDayStreak };

// ──────────────────────────────────────────────
// Composite MindPulse Score
// ──────────────────────────────────────────────

export interface MindPulseInputs {
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
}

export function calculateMindPulseScore({ eyeScore, sleepScore, mindScore }: MindPulseInputs): number {
  return Math.round(eyeScore * 0.35 + sleepScore * 0.35 + mindScore * 0.30);
}

/** The area with the lowest score — i.e. where recovery effort matters most right now. */
export function getFocusArea(eyeScore: number, sleepScore: number, mindScore: number): FocusArea {
  const scores: Record<FocusArea, number> = { Eyes: eyeScore, Sleep: sleepScore, Mind: mindScore };
  return (Object.keys(scores) as FocusArea[]).reduce((a, b) => (scores[a] <= scores[b] ? a : b));
}

function timeOfDay(hour: number): string {
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'late night';
}

export function getInsightMessage(focusArea: FocusArea, score: number, hour: number): string {
  const tod = timeOfDay(hour);
  if (focusArea === 'Eyes') {
    if (score < 25) return `Your eyes could use some recovery — try the Eye Reset Protocol this ${tod}.`;
    if (score < 50) return 'Eye strain is building up. A couple of short breaks would help.';
    return 'Your eyes are doing well — a Comet Trace session keeps the streak going.';
  }
  if (focusArea === 'Sleep') {
    if (score < 25) return 'Your sleep routine needs some support — try logging tonight\'s session.';
    if (score < 50) return `Sleep quality has room to improve. A Sleep Story could help you wind down this ${tod}.`;
    return 'Your sleep routine is solid — keep the consistent bedtime going.';
  }
  if (score < 25) return 'Your mind could use a recharge — try 5 minutes of Box Breathing.';
  if (score < 50) return 'Some tension is building. A short journal entry could help process it.';
  return 'You\'re staying centered — keep up the recovery habits.';
}

/**
 * Picks the lowest-scoring category across all three scores and surfaces the
 * single breakdown item that's holding it back the most — so the home screen
 * insight is always traceable to a real, displayed number.
 */
export function getHomeInsight(results: { eye: ScoreResult; sleep: ScoreResult; mind: ScoreResult }): string {
  const areas: { area: FocusArea; result: ScoreResult }[] = [
    { area: 'Eyes', result: results.eye },
    { area: 'Sleep', result: results.sleep },
    { area: 'Mind', result: results.mind },
  ];
  const lowest = areas.reduce((a, b) => (a.result.score <= b.result.score ? a : b));
  const weakest = [...lowest.result.breakdown].sort(
    (a, b) => a.points / a.maxPoints - b.points / b.maxPoints,
  )[0];
  if (weakest && weakest.points / weakest.maxPoints < 0.5) return weakest.detail;
  return getInsightMessage(lowest.area, lowest.result.score, new Date().getHours());
}
