import { Frown, Meh, Minus, Smile, Sparkles, type LucideIcon } from 'lucide-react-native';

export interface SleepQualityOption {
  value: number;
  icon: LucideIcon;
  label: string;
  color: string;
}

export const SLEEP_QUALITY_OPTIONS: SleepQualityOption[] = [
  { value: 1, icon: Frown, label: 'Terrible', color: '#F44336' },
  { value: 2, icon: Meh, label: 'Poor', color: '#FF9800' },
  { value: 3, icon: Minus, label: 'Okay', color: '#9e9e9e' },
  { value: 4, icon: Smile, label: 'Good', color: '#4FC3F7' },
  { value: 5, icon: Sparkles, label: 'Amazing', color: '#a78bfa' },
];

export function qualityEmojiForRating(quality: number): LucideIcon {
  const row = SLEEP_QUALITY_OPTIONS.find(o => o.value === quality);
  return row?.icon ?? Minus;
}
