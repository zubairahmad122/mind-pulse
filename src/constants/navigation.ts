import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type MainAppTabConfig = {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
};

export const MAIN_APP_TABS: MainAppTabConfig[] = [
  { name: 'home', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'sleep', title: 'Sleep', icon: 'moon-outline', iconFocused: 'moon' },
  { name: 'relax', title: 'Relax', icon: 'leaf-outline', iconFocused: 'leaf' },
  { name: 'eye-relax', title: 'Eye', icon: 'eye-outline', iconFocused: 'eye' },
];
