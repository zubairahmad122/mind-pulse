import type { SleepSession } from '../utils/sleepUtils';
import { calculateStreak } from '../utils/sleepUtils';
import { COLORS } from './colors';

export interface AchievementExtras {
  eyeStreak: number;
  recoveryToday: number;
  totalJournalEntries: number;
}

export type AchievementDefinition = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (sessions: SleepSession[], extras?: AchievementExtras) => boolean;
  color: string;
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_sleep',
    icon: '🌟',
    title: 'First Step',
    desc: 'Complete your first sleep session',
    check: s => s.length >= 1,
    color: COLORS.gold,
  },
  {
    id: 'streak_3',
    icon: '🔥',
    title: '3-Night Streak',
    desc: 'Sleep 3 nights in a row',
    check: s => calculateStreak(s) >= 3,
    color: '#ff8c42',
  },
  {
    id: 'streak_7',
    icon: '💫',
    title: 'Week Warrior',
    desc: 'Sleep 7 nights in a row',
    check: s => calculateStreak(s) >= 7,
    color: COLORS.purpleLight,
  },
  {
    id: 'streak_30',
    icon: '👑',
    title: 'Sleep Champion',
    desc: 'Maintain a 30-night streak',
    check: s => calculateStreak(s) >= 30,
    color: COLORS.gold,
  },
  {
    id: 'ten_sessions',
    icon: '😴',
    title: 'Deep Sleeper',
    desc: 'Log 10 sleep sessions',
    check: s => s.length >= 10,
    color: '#60a5fa',
  },
  {
    id: 'perfect_night',
    icon: '⭐',
    title: 'Perfect Night',
    desc: 'Rate a sleep session 5 stars',
    check: s => s.some(x => x.quality === 5),
    color: COLORS.gold,
  },
  {
    id: 'well_rested',
    icon: '🏆',
    title: 'Well Rested',
    desc: 'Get 8+ hours of sleep in one session',
    check: s => s.some(x => x.durationMinutes >= 480),
    color: COLORS.success,
  },
  {
    id: 'consistent',
    icon: '📅',
    title: 'Consistent',
    desc: 'Log 30 total sleep sessions',
    check: s => s.length >= 30,
    color: '#a78bfa',
  },
  {
    id: 'eye_warrior',
    icon: '👁️',
    title: 'Eye Warrior',
    desc: 'Complete eye exercises 7 days in a row',
    check: (_s, e) => (e?.eyeStreak ?? 0) >= 7,
    color: '#6ee7b7',
  },
  {
    id: 'screen_detox',
    icon: '🌿',
    title: 'Screen Detox',
    desc: 'Complete 3 recovery sessions in one day',
    check: (_s, e) => (e?.recoveryToday ?? 0) >= 3,
    color: '#34d399',
  },
  {
    id: 'calm_mind',
    icon: '🧘',
    title: 'Calm Mind',
    desc: 'Write 5 journal entries',
    check: (_s, e) => (e?.totalJournalEntries ?? 0) >= 5,
    color: '#60a5fa',
  },
  {
    id: 'rush_mode',
    icon: '⚡',
    title: 'Rush Mode',
    desc: 'Build a streak of 3+ hits in Focus Sprint',
    check: (_s, e) => (e?.eyeStreak ?? 0) >= 1,
    color: '#f97316',
  },
];
