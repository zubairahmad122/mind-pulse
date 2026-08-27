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
  language: 'en' | 'ur';

  // Actions
  completeOnboarding: () => void;
  upgradeToPro: () => void;
  setLanguage: (lang: 'en' | 'ur') => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isPro: false,
      trialEndDate: null,
      language: 'en',

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

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
        language: state.language,
      }),
    },
  ),
);
