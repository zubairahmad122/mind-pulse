export const SLEEP_QUALITY_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😴', label: 'Amazing' },
] as const;

export type SleepQualityOption = (typeof SLEEP_QUALITY_OPTIONS)[number];

export function qualityEmojiForRating(quality: number): string {
  const row = SLEEP_QUALITY_OPTIONS.find(o => o.value === quality);
  return row?.emoji ?? '—';
}
