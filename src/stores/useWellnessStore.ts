// ──────────────────────────────────────────────────────────────────────────────
// useWellnessStore — Wellness scores, daily challenge, badges
// ──────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';

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

interface WellnessState {
  wellnessScore: number;
  eyeScore: number;
  sleepScore: number;
  relaxScore: number;
  mindScore: number;
  dailyChallenge: DailyChallenge | null;
  challengeCompleted: boolean;
  badges: Badge[];

  // Actions
  calculateWellnessScore: () => void;
  setScores: (scores: { eye?: number; sleep?: number; relax?: number; mind?: number }) => void;
  completeChallenge: () => void;
  setDailyChallenge: (challenge: DailyChallenge) => void;
  awardBadge: (badge: Omit<Badge, 'unlockedAt'>) => void;
}

export const useWellnessStore = create<WellnessState>((set, get) => ({
  wellnessScore: 0,
  eyeScore: 0,
  sleepScore: 0,
  relaxScore: 0,
  mindScore: 0,
  dailyChallenge: null,
  challengeCompleted: false,
  badges: [],

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
}));
