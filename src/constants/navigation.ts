import type { LucideIcon } from 'lucide-react-native';
import { Home, Moon, Leaf, Eye, User } from 'lucide-react-native';

/** @deprecated Use LucideIcon from 'lucide-react-native' instead. Kept for backward compat. */
export type IoniconName = LucideIcon;

export type MainAppTabConfig = {
  name: string;
  title: string;
  icon: LucideIcon;
  iconFocused: LucideIcon;
};

export const MAIN_APP_TABS: MainAppTabConfig[] = [
  { name: 'home', title: 'Home', icon: Home, iconFocused: Home },
  { name: 'sleep', title: 'Sleep', icon: Moon, iconFocused: Moon },
  { name: 'relax', title: 'Relax', icon: Leaf, iconFocused: Leaf },
  { name: 'eye-relax', title: 'Eye', icon: Eye, iconFocused: Eye },
  { name: 'profile', title: 'Profile', icon: User, iconFocused: User },
];
