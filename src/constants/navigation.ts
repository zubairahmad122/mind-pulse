import type { LucideIcon } from 'lucide-react-native';
import { Eye, Menu, Timer } from 'lucide-react-native';

/** @deprecated Use LucideIcon from 'lucide-react-native' instead. Kept for backward compat. */
export type IoniconName = LucideIcon;

export type MainAppTabConfig = {
  name: string;
  title: string;
  icon: LucideIcon;
  iconFocused: LucideIcon;
};

export const MAIN_APP_TABS: MainAppTabConfig[] = [
  { name: 'eye-relax', title: 'Eyes', icon: Eye, iconFocused: Eye },
  { name: 'focus', title: 'Focus', icon: Timer, iconFocused: Timer },
  { name: 'more', title: 'More', icon: Menu, iconFocused: Menu },
];

/** Tab routes opened from More or by push, never shown in the bar. */
export const HIDDEN_APP_TABS = [
  'home',
  'sleep',
  'relax',
  'challenges',
  'profile',
  'report',
  'recovery',
  'streaks',
];
