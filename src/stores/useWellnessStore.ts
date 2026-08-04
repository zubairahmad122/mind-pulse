// ──────────────────────────────────────────────────────────────────────────────
// useWellnessStore — Wellness scores, daily challenge, badges, unified streak
// ──────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysBetween, getMondayISO, todayISO } from '@/utils/dateUtils';

interface Badge {
  id: string;
  name: string;
  unlockedAt: string;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
}

/** Fired once per streak-affecting update so the UI can show a one-time toast.
 * 'perfectDay' is set separately by recordPerfectDayIfApplicable — not a
 * streak-crediting event, but reuses the same one-shot toast plumbing. */
export type StreakEvent = 'incremented' | 'frozen' | 'reset' | 'perfectDay' | null;

/** Max activity dates kept — ~1 year, enough for a future monthly calendar/insights view. */
const ACTIVITY_LOG_LIMIT = 370;

/** Feature key matching useProgressStore's `todaySessions` map. */
export type ChallengeFeature = 'eye' | 'sleep' | 'mind';

/** The daily challenge is assigned once per day (from that day's weakest
 * pillar) and pinned here, so the Challenges/Home cards can't silently
 * switch target mid-day as scores shift after the user completes a session. */
export interface AssignedDailyChallenge {
  /** Local YYYY-MM-DD the assignment was made for. */
  date: string;
  feature: ChallengeFeature;
}

interface WellnessState {
  wellnessScore: number;
  eyeScore: number;
  sleepScore: number;
  relaxScore: number;
  mindScore: number;
  dailyChallenge: DailyChallenge | null;
  challengeCompleted: boolean;
  badges: Badge[];

  /** App-wide streak — a day counts if any pillar (eye/relax/mind/sleep) was completed. */
  streak: number;
  longestStreak: number;
  /** YYYY-MM-DD of the last day the streak was credited. */
  lastActiveDate: string | null;
  /** Whether this week's automatic grace day is still available. */
  streakFreezeAvailable: boolean;
  /** Monday (YYYY-MM-DD) the freeze allowance was last refreshed for. */
  freezeWeekStart: string | null;
  /** Recent YYYY-MM-DD dates with any completed activity, most-recent last. */
  activityLog: string[];
  /** Set by checkAndUpdateStreak, cleared by acknowledgeStreakEvent once the UI has shown it. */
  lastStreakEvent: StreakEvent;
  /** Today's pinned daily-challenge target, or null before the first assignment. */
  assignedChallenge: AssignedDailyChallenge | null;

  /** Lifetime "surprise badge" flags — once true, always true. Fed by
   * useSurpriseBadgeSync (Perfect Day / Night Owl) and checkAndUpdateStreak
   * (Comeback), never recomputed live, since the triggering daily state
   * (todaySessions, time-of-completion) doesn't persist past its own day. */
  everPerfectDay: boolean;
  everNightOwlSession: boolean;
  everComeback: boolean;
  /** Reached a 3+ hit streak (Rush Mode) in Focus Switch, ever. */
  everRushMode: boolean;
  /** Local YYYY-MM-DD the Perfect Day toast last fired — guards it to once/day. */
  lastPerfectDayDate: string | null;
  /** True after a streak reset, until a fresh streak reaches 3 (or resets again). */
  watchingComeback: boolean;
  /** Achievement ids already reported via trackAchievementUnlocked — never re-fires. */
  seenAchievementIds: string[];

  // Actions
  calculateWellnessScore: () => void;
  setScores: (scores: { eye?: number; sleep?: number; relax?: number; mind?: number }) => void;
  completeChallenge: () => void;
  setDailyChallenge: (challenge: DailyChallenge) => void;
  awardBadge: (badge: Omit<Badge, 'unlockedAt'>) => void;
  /** Call whenever today's completion state may have changed (app foreground, session complete). */
  checkAndUpdateStreak: (completedToday: boolean) => void;
  acknowledgeStreakEvent: () => void;
  /** Assigns today's daily-challenge feature once; a no-op if today's already assigned. */
  assignDailyChallengeIfNeeded: (feature: ChallengeFeature) => void;
  /** Marks today as a Perfect Day (all 4 pillars done) and fires the one-shot
   * toast — a no-op if already recorded today. Call site owns the "all 4
   * pillars done" check (useSurpriseBadgeSync). */
  recordPerfectDayIfApplicable: () => void;
  /** Marks the lifetime Night Owl badge — a no-op once already recorded. */
  recordNightOwlIfApplicable: () => void;
  /** Marks the lifetime Rush Mode badge — a no-op once already recorded. */
  recordRushModeIfApplicable: () => void;
  /** Diffs `ids` against previously-seen achievements, records the new ones,
   * and returns just the newly-unlocked ids for the caller to report. */
  markAchievementsUnlocked: (ids: string[]) => string[];
}

export const useWellnessStore = create<WellnessState>()(
  persist(
    (set, get) => ({
      wellnessScore: 0,
      eyeScore: 0,
      sleepScore: 0,
      relaxScore: 0,
      mindScore: 0,
      dailyChallenge: null,
      challengeCompleted: false,
      badges: [],

      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      streakFreezeAvailable: true,
      freezeWeekStart: null,
      activityLog: [],
      lastStreakEvent: null,
      assignedChallenge: null,
      everPerfectDay: false,
      everNightOwlSession: false,
      everComeback: false,
      everRushMode: false,
      lastPerfectDayDate: null,
      watchingComeback: false,
      seenAchievementIds: [],

      calculateWellnessScore: () => {
        const { eyeScore, sleepScore, relaxScore, mindScore } = get();
        const score = Math.round(
          eyeScore * 0.3 + sleepScore * 0.3 + relaxScore * 0.2 + mindScore * 0.2,
        );
        set({ wellnessScore: Math.min(100, Math.max(0, score)) });
      },

      setScores: (scores) =>
        set((state) => ({
          eyeScore: scores.eye ?? state.eyeScore,
          sleepScore: scores.sleep ?? state.sleepScore,
          relaxScore: scores.relax ?? state.relaxScore,
          mindScore: scores.mind ?? state.mindScore,
        })),

      completeChallenge: () =>
        set({ challengeCompleted: true }),

      setDailyChallenge: (challenge) =>
        set({ dailyChallenge: challenge, challengeCompleted: false }),

      awardBadge: (badge) =>
        set((state) => ({
          badges: [
            ...state.badges,
            { ...badge, unlockedAt: new Date().toISOString() },
          ],
        })),

      checkAndUpdateStreak: (completedToday) => {
        const today = todayISO();
        const week = getMondayISO();
        const {
          lastActiveDate,
          streak,
          longestStreak,
          streakFreezeAvailable,
          freezeWeekStart,
          activityLog,
          watchingComeback,
          everComeback,
        } = get();

        // Refresh the weekly freeze allowance if we've rolled into a new week.
        const freezeAvailable = freezeWeekStart === week ? streakFreezeAvailable : true;

        if (lastActiveDate === today) {
          // Already credited today — just keep the freeze bookkeeping current.
          set({ streakFreezeAvailable: freezeAvailable, freezeWeekStart: week });
          return;
        }

        if (!completedToday) {
          // Nothing done yet today — don't touch the streak, only the weekly bookkeeping.
          set({ streakFreezeAvailable: freezeAvailable, freezeWeekStart: week });
          return;
        }

        const gap = lastActiveDate ? daysBetween(lastActiveDate, today) : null;

        let newStreak: number;
        let event: StreakEvent;
        let freezeAfter = freezeAvailable;

        if (gap === null || gap === 1) {
          // First-ever activity, or an unbroken consecutive day.
          newStreak = streak + 1;
          event = 'incremented';
        } else if (gap === 2 && freezeAvailable) {
          // Exactly one day missed — spend this week's automatic grace day.
          newStreak = streak + 1;
          freezeAfter = false;
          event = 'frozen';
        } else {
          // Streak broken — restart at 1.
          newStreak = 1;
          event = streak > 0 ? 'reset' : 'incremented';
        }

        // Comeback badge: arm on a reset, fire once a fresh streak reaches 3.
        const nowWatchingComeback = event === 'reset' ? true : watchingComeback;
        const comebackNow = nowWatchingComeback && event === 'incremented' && newStreak >= 3;

        set({
          streak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
          lastActiveDate: today,
          streakFreezeAvailable: freezeAfter,
          freezeWeekStart: week,
          activityLog: [...activityLog, today].slice(-ACTIVITY_LOG_LIMIT),
          lastStreakEvent: event,
          watchingComeback: comebackNow ? false : nowWatchingComeback,
          everComeback: everComeback || comebackNow,
        });
      },

      acknowledgeStreakEvent: () => set({ lastStreakEvent: null }),

      assignDailyChallengeIfNeeded: (feature) => {
        const today = todayISO();
        if (get().assignedChallenge?.date === today) return;
        set({ assignedChallenge: { date: today, feature } });
      },

      recordPerfectDayIfApplicable: () => {
        const today = todayISO();
        if (get().lastPerfectDayDate === today) return;
        set({ everPerfectDay: true, lastPerfectDayDate: today, lastStreakEvent: 'perfectDay' });
      },

      recordNightOwlIfApplicable: () => {
        if (get().everNightOwlSession) return;
        set({ everNightOwlSession: true });
      },

      recordRushModeIfApplicable: () => {
        if (get().everRushMode) return;
        set({ everRushMode: true });
      },

      markAchievementsUnlocked: (ids) => {
        const { seenAchievementIds } = get();
        const newlyUnlocked = ids.filter((id) => !seenAchievementIds.includes(id));
        if (newlyUnlocked.length > 0) {
          set({ seenAchievementIds: [...seenAchievementIds, ...newlyUnlocked] });
        }
        return newlyUnlocked;
      },
    }),
    {
      name: 'mindpulse-wellness',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        badges: state.badges,
        streak: state.streak,
        longestStreak: state.longestStreak,
        lastActiveDate: state.lastActiveDate,
        streakFreezeAvailable: state.streakFreezeAvailable,
        freezeWeekStart: state.freezeWeekStart,
        activityLog: state.activityLog,
        assignedChallenge: state.assignedChallenge,
        everPerfectDay: state.everPerfectDay,
        everNightOwlSession: state.everNightOwlSession,
        everComeback: state.everComeback,
        everRushMode: state.everRushMode,
        lastPerfectDayDate: state.lastPerfectDayDate,
        watchingComeback: state.watchingComeback,
        seenAchievementIds: state.seenAchievementIds,
      }),
    },
  ),
);
