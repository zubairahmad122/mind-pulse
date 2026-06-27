// ──────────────────────────────────────────────────────────────────────────────
// useUserStore — User state with AsyncStorage persistence
// ──────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  hasCompletedOnboarding: boolean;
  isPro: boolean;
  trialEndDate: string | null;
  streak: number;
  lastSessionDate: string | null;
  streakFreezeUsed: boolean;
  language: 'en' | 'hi' | 'ur' | 'ps';

  // Actions
  completeOnboarding: () => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  useStreakFreeze: () => void;
  upgradeToPro: () => void;
  setLanguage: (lang: 'en' | 'hi' | 'ur' | 'ps') => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isPro: false,
      trialEndDate: null,
      streak: 0,
      lastSessionDate: null,
      streakFreezeUsed: false,
      language: 'en',

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      incrementStreak: () =>
        set((state) => ({
          streak: state.streak + 1,
          lastSessionDate: new Date().toISOString().split('T')[0],
        })),

      resetStreak: () =>
        set({ streak: 0, lastSessionDate: null, streakFreezeUsed: false }),

      useStreakFreeze: () =>
        set((state) => ({
          streakFreezeUsed: true,
          lastSessionDate: new Date().toISOString().split('T')[0],
        })),

      upgradeToPro: () =>
        set({ isPro: true, trialEndDate: null }),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'mindpulse-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isPro: state.isPro,
        trialEndDate: state.trialEndDate,
        streak: state.streak,
        lastSessionDate: state.lastSessionDate,
        streakFreezeUsed: state.streakFreezeUsed,
        language: state.language,
      }),
    },
  ),
);
