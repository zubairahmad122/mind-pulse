// ──────────────────────────────────────────────────────────────────────────────
// useProgressStore — Feature usage tracking with AsyncStorage persistence
// ──────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Weekly session counts — resets every Monday. */
interface WeeklySessions {
  eye: number;
  eyeGames: number;
  relax: number;
  mind: number;
  sleep: number;
}

/** Feature identifiers used for last-feature tracking. */
export type FeatureId = 'eye-exercise' | 'eye-game' | 'relax' | 'mind' | 'sleep';

/** Daily session completion map — tracks which features were completed today. */
interface DailySessions {
  eye: boolean;
  eyeGames: boolean;
  relax: boolean;
  mind: boolean;
  sleep: boolean;
}

interface ProgressState {
  eyeExercisesCompleted: number;
  eyeGamesPlayed: number;
  relaxSessionsCompleted: number;
  mindSessionsCompleted: number;
  sleepSessionsTracked: number;
  totalScreenTime: number; // minutes today
  lastEyeBreak: string | null;

  /** The last feature the user interacted with (for Continue Journey). */
  lastFeatureId: FeatureId | null;
  /** Weekly session counts for progress dots. */
  weeklySessions: WeeklySessions;
  /** ISO date string of the last Monday the weekly counter was reset. */
  weeklyResetDate: string | null;
  /** ISO date string (YYYY-MM-DD) for the current daily tracking window. */
  todayDate: string;
  /** Which features were completed today. */
  todaySessions: DailySessions;

  // Actions
  logEyeExercise: () => void;
  logEyeGame: () => void;
  logRelaxSession: () => void;
  logMindSession: () => void;
  logSleepSession: () => void;
  updateScreenTime: (minutes: number) => void;
  recordEyeBreak: () => void;
  setLastFeature: (id: FeatureId) => void;
  getWeeklySessions: () => WeeklySessions;
  hasCompletedAnySession: () => boolean;
}

/** Return the ISO date string of the most recent Monday (start of week). */
function getMondayISO(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

const EMPTY_WEEKLY: WeeklySessions = { eye: 0, eyeGames: 0, relax: 0, mind: 0, sleep: 0 };
const EMPTY_DAILY: DailySessions = { eye: false, eyeGames: false, relax: false, mind: false, sleep: false };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Standalone helper — checks if we've crossed into a new week and resets counters. */
function ensureWeeklyReset(state: ProgressState): Partial<ProgressState> {
  const monday = getMondayISO();
  if (state.weeklyResetDate === monday) return {};
  return { weeklySessions: { ...EMPTY_WEEKLY }, weeklyResetDate: monday };
}

/** Checks if we've crossed into a new day and resets daily completions. */
function ensureDailyReset(state: ProgressState): Partial<ProgressState> {
  const today = todayISO();
  if (state.todayDate === today) return {};
  return { todaySessions: { ...EMPTY_DAILY }, todayDate: today };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      eyeExercisesCompleted: 0,
      eyeGamesPlayed: 0,
      relaxSessionsCompleted: 0,
      mindSessionsCompleted: 0,
      sleepSessionsTracked: 0,
      totalScreenTime: 0,
      lastEyeBreak: null,
      lastFeatureId: null,
      weeklySessions: { ...EMPTY_WEEKLY },
      weeklyResetDate: null,
      todayDate: todayISO(),
      todaySessions: { ...EMPTY_DAILY },

      logEyeExercise: () =>
        set((s) => {
          const reset = ensureDailyReset(s);
          const base = Object.keys(reset).length > 0 ? EMPTY_DAILY : s.todaySessions;
          return {
            ...ensureWeeklyReset(s),
            ...reset,
            eyeExercisesCompleted: s.eyeExercisesCompleted + 1,
            lastFeatureId: 'eye-exercise' as const,
            weeklySessions: { ...s.weeklySessions, eye: s.weeklySessions.eye + 1 },
            todaySessions: { ...base, eye: true },
          };
        }),

      logEyeGame: () =>
        set((s) => {
          const reset = ensureDailyReset(s);
          const base = Object.keys(reset).length > 0 ? EMPTY_DAILY : s.todaySessions;
          return {
            ...ensureWeeklyReset(s),
            ...reset,
            eyeGamesPlayed: s.eyeGamesPlayed + 1,
            lastFeatureId: 'eye-game' as const,
            weeklySessions: { ...s.weeklySessions, eyeGames: s.weeklySessions.eyeGames + 1 },
            todaySessions: { ...base, eyeGames: true },
          };
        }),

      logRelaxSession: () =>
        set((s) => {
          const reset = ensureDailyReset(s);
          const base = Object.keys(reset).length > 0 ? EMPTY_DAILY : s.todaySessions;
          return {
            ...ensureWeeklyReset(s),
            ...reset,
            relaxSessionsCompleted: s.relaxSessionsCompleted + 1,
            lastFeatureId: 'relax' as const,
            weeklySessions: { ...s.weeklySessions, relax: s.weeklySessions.relax + 1 },
            todaySessions: { ...base, relax: true },
          };
        }),

      logMindSession: () =>
        set((s) => {
          const reset = ensureDailyReset(s);
          const base = Object.keys(reset).length > 0 ? EMPTY_DAILY : s.todaySessions;
          return {
            ...ensureWeeklyReset(s),
            ...reset,
            mindSessionsCompleted: s.mindSessionsCompleted + 1,
            lastFeatureId: 'mind' as const,
            weeklySessions: { ...s.weeklySessions, mind: s.weeklySessions.mind + 1 },
            todaySessions: { ...base, mind: true },
          };
        }),

      logSleepSession: () =>
        set((s) => {
          const reset = ensureDailyReset(s);
          const base = Object.keys(reset).length > 0 ? EMPTY_DAILY : s.todaySessions;
          return {
            ...ensureWeeklyReset(s),
            ...reset,
            sleepSessionsTracked: s.sleepSessionsTracked + 1,
            lastFeatureId: 'sleep' as const,
            weeklySessions: { ...s.weeklySessions, sleep: s.weeklySessions.sleep + 1 },
            todaySessions: { ...base, sleep: true },
          };
        }),

      updateScreenTime: (minutes) =>
        set({ totalScreenTime: minutes }),

      recordEyeBreak: () =>
        set({ lastEyeBreak: new Date().toISOString() }),

      setLastFeature: (id) => set({ lastFeatureId: id }),

      getWeeklySessions: () => {
        const s = get();
        const reset = ensureWeeklyReset(s);
        if (Object.keys(reset).length > 0) {
          set(reset);
        }
        return get().weeklySessions;
      },

      hasCompletedAnySession: () => {
        const s = get();
        return (
          s.eyeExercisesCompleted > 0 ||
          s.eyeGamesPlayed > 0 ||
          s.relaxSessionsCompleted > 0 ||
          s.mindSessionsCompleted > 0 ||
          s.sleepSessionsTracked > 0
        );
      },
    }),
    {
      name: 'mindpulse-progress',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
