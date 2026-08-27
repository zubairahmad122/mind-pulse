import type { LucideIcon } from 'lucide-react-native';
import {
  Award,
  Brain,
  CalendarCheck,
  Crown,
  Eye,
  Flame,
  Leaf,
  Moon,
  MoonStar,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import type { SleepSession } from '../utils/sleepUtils';
import { calculateStreak } from '../utils/sleepUtils';
import { COLORS } from './colors';

export interface AchievementExtras {
  eyeStreak: number;
  recoveryToday: number;
  totalJournalEntries: number;
  /** All 4 pillars (eye, sleep, mind, relax) completed in one day, ever. */
  everPerfectDay?: boolean;
  /** A session completed between local midnight and 4am, ever. */
  everNightOwlSession?: boolean;
  /** Rebuilt a 3+ day streak after a reset, ever. */
  everComeback?: boolean;
  /** Currently true if any Mon–Sun week in the activity log has all 7 days. */
  hasPerfectWeek?: boolean;
  /** Reached a 3+ hit streak (Rush Mode) in Focus Switch, ever. */
  everRushMode?: boolean;
}

export type AchievementDefinition = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  check: (sessions: SleepSession[], extras?: AchievementExtras) => boolean;
  color: string;
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_sleep',
    icon: Sparkles,
    title: 'First Step',
    desc: 'Complete your first sleep session',
    check: s => s.length >= 1,
    color: COLORS.gold,
  },
  {
    id: 'streak_3',
    icon: Flame,
    title: '3-Night Streak',
    desc: 'Sleep 3 nights in a row',
    check: s => calculateStreak(s) >= 3,
    color: '#ff8c42',
  },
  {
    id: 'streak_7',
    icon: Shield,
    title: 'Week Warrior',
    desc: 'Sleep 7 nights in a row',
    check: s => calculateStreak(s) >= 7,
    color: COLORS.purpleLight,
  },
  {
    id: 'streak_30',
    icon: Crown,
    title: 'Sleep Champion',
    desc: 'Maintain a 30-night streak',
    check: s => calculateStreak(s) >= 30,
    color: COLORS.gold,
  },
  {
    id: 'ten_sessions',
    icon: Moon,
    title: 'Deep Sleeper',
    desc: 'Log 10 sleep sessions',
    check: s => s.length >= 10,
    color: '#60a5fa',
  },
  {
    id: 'perfect_night',
    icon: Star,
    title: 'Perfect Night',
    desc: 'Rate a sleep session 5 stars',
    check: s => s.some(x => x.quality === 5),
    color: COLORS.gold,
  },
  {
    id: 'well_rested',
    icon: Award,
    title: 'Well Rested',
    desc: 'Get 8+ hours of sleep in one session',
    check: s => s.some(x => x.durationMinutes >= 480),
    color: COLORS.success,
  },
  {
    id: 'consistent',
    icon: Target,
    title: 'Consistent',
    desc: 'Log 30 total sleep sessions',
    check: s => s.length >= 30,
    color: '#a78bfa',
  },
  {
    id: 'eye_warrior',
    icon: Eye,
    title: 'Eye Warrior',
    desc: 'Complete eye exercises 7 days in a row',
    check: (_s, e) => (e?.eyeStreak ?? 0) >= 7,
    color: '#6ee7b7',
  },
  {
    id: 'screen_detox',
    icon: Leaf,
    title: 'Screen Detox',
    desc: 'Complete 3 recovery sessions in one day',
    check: (_s, e) => (e?.recoveryToday ?? 0) >= 3,
    color: '#34d399',
  },
  {
    id: 'calm_mind',
    icon: Brain,
    title: 'Calm Mind',
    desc: 'Write 5 journal entries',
    check: (_s, e) => (e?.totalJournalEntries ?? 0) >= 5,
    color: '#60a5fa',
  },
  {
    id: 'rush_mode',
    icon: Zap,
    title: 'Rush Mode',
    desc: 'Build a streak of 3+ hits in Focus Switch',
    check: (_s, e) => !!e?.everRushMode,
    color: '#f97316',
  },
  {
    id: 'perfect_day',
    icon: Trophy,
    title: 'Perfect Day',
    desc: 'Complete all 4 pillars — eye, sleep, mind & relax — in one day',
    check: (_s, e) => !!e?.everPerfectDay,
    color: COLORS.gold,
  },
  {
    id: 'night_owl',
    icon: MoonStar,
    title: 'Night Owl',
    desc: 'Complete a session between midnight and 4am',
    check: (_s, e) => !!e?.everNightOwlSession,
    color: '#818cf8',
  },
  {
    id: 'comeback',
    icon: RotateCcw,
    title: 'Comeback',
    desc: 'Rebuild a 3+ day streak after a reset',
    check: (_s, e) => !!e?.everComeback,
    color: '#fb923c',
  },
  {
    id: 'perfect_week',
    icon: CalendarCheck,
    title: 'Perfect Week',
    desc: 'Stay active all 7 days in one week',
    check: (_s, e) => !!e?.hasPerfectWeek,
    color: '#34d399',
  },
];
