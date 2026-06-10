import { SleepPreset } from '@/constants/sleepSessions';
import { formatWakeTime } from '@/services/sleepAlarm';

export function formatPresetDuration(preset: SleepPreset, scheduleHours?: number): string {
  if (preset.useSchedule && scheduleHours && scheduleHours > 0) {
    const h = scheduleHours;
    const mins = Math.round((h % 1) * 60);
    if (mins > 0) return `${Math.floor(h)}h ${mins}m`;
    return `${h}h`;
  }
  if (preset.minutes >= 60) {
    const h = preset.minutes / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  }
  return `${preset.minutes} min`;
}

export function formatWakePreview(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  return formatWakeTime(d);
}

export function formatAlarmCountdown(wakeAt: Date): string {
  const sec = Math.max(0, Math.floor((wakeAt.getTime() - Date.now()) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
