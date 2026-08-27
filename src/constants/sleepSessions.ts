export type SleepPresetKind = 'nap' | 'night';

export type SleepPreset = {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
  minutes: number;
  kind: SleepPresetKind;
  /** night only — use schedule duration from profile */
  useSchedule?: boolean;
};

export const NAP_PRESETS: SleepPreset[] = [
  { id: 'nap-15', label: 'Micro Nap', subtitle: '15 min boost', emoji: '☕', minutes: 15, kind: 'nap' },
  { id: 'nap-20', label: 'Power Nap', subtitle: '20 min recharge', emoji: '⚡', minutes: 20, kind: 'nap' },
  { id: 'nap-30', label: 'Classic Nap', subtitle: '30 min rest', emoji: '💤', minutes: 30, kind: 'nap' },
  { id: 'nap-45', label: 'Restore Nap', subtitle: '45 min recovery', emoji: '🌿', minutes: 45, kind: 'nap' },
  { id: 'nap-60', label: 'Deep Nap', subtitle: '1 hour sleep', emoji: '🛋️', minutes: 60, kind: 'nap' },
  { id: 'nap-90', label: 'Full Cycle', subtitle: '90 min REM nap', emoji: '🌙', minutes: 90, kind: 'nap' },
];

export const NIGHT_PRESETS: SleepPreset[] = [
  {
    id: 'night-schedule',
    label: 'My Schedule',
    subtitle: 'Uses your sleep goal',
    emoji: '📅',
    minutes: 0,
    kind: 'night',
    useSchedule: true,
  },
  { id: 'night-7', label: '7 Hours', subtitle: 'Solid rest', emoji: '🌙', minutes: 420, kind: 'night' },
  { id: 'night-7.5', label: '7.5 Hours', subtitle: 'Recommended', emoji: '✨', minutes: 450, kind: 'night' },
  { id: 'night-8', label: '8 Hours', subtitle: 'Full recovery', emoji: '🌟', minutes: 480, kind: 'night' },
  { id: 'night-9', label: '9 Hours', subtitle: 'Weekend mode', emoji: '😴', minutes: 540, kind: 'night' },
];

export function getPresetById(id: string): SleepPreset | undefined {
  return [...NAP_PRESETS, ...NIGHT_PRESETS].find(p => p.id === id);
}

/** Short delays to verify wake notifications (seconds). */
export const ALARM_TEST_SECONDS = [3, 10, 30] as const;

export function resolvePresetMinutes(preset: SleepPreset, scheduleHours?: number): number {
  if (preset.useSchedule && scheduleHours && scheduleHours > 0) {
    return Math.round(scheduleHours * 60);
  }
  return preset.minutes;
}
