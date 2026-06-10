import { Alert, Platform } from 'react-native';
import { scheduleWakeAlarm } from '@/services/sleepAlarm';
import type { SleepAlarmSupport } from '@/types/alarm.types';

/**
 * Check alarm support level and show appropriate feedback to the user.
 *
 * - 'granted'    → All good, proceed with scheduling (returns true).
 * - 'denied'     → Show a one-time Alert explaining native alarm permissions are needed.
 * - 'unavailable'→ Show a one-time Alert explaining Expo Go limitations.
 *
 * Returns `true` if scheduling should proceed, `false` otherwise.
 */
let deniedAlertShown = false;
let unavailableAlertShown = false;

export function handleAlarmSupport(support: SleepAlarmSupport): boolean {
  if (support === 'granted') return true;

  if (support === 'denied' && !deniedAlertShown) {
    deniedAlertShown = true;
    Alert.alert(
      'Alarm Permissions Required',
      Platform.OS === 'android'
        ? 'Wake alarms need exact alarm & notification permissions. Please allow them in Settings > Apps > Mind Pulse > Permissions.\n\nSleep tracking still works without alarms.'
        : 'Wake alarms need notification permissions. Please enable them in Settings.\n\nSleep tracking still works without alarms.',
    );
  }

  if (support === 'unavailable' && !unavailableAlertShown) {
    unavailableAlertShown = true;
    Alert.alert(
      'Alarm Not Supported',
      'Wake alarms need a native build. Run:\n\n  npx expo run:android\n\nSleep tracking still works without alarms.',
    );
  }

  return false;
}

/**
 * Schedule a wake alarm and show a brief feedback Alert if scheduling fails.
 * Silently ignores failures inside a caught error (the alarm just won't fire).
 */
export async function scheduleWakeAlarmWithFeedback(
  wakeAt: Date,
  label: string,
): Promise<string | null> {
  try {
    const id = await scheduleWakeAlarm(wakeAt, label);
    if (!id) {
      // Scheduling returned null — the wake time is too close (under 5s)
      console.warn('Alarm scheduling returned null — wake time too soon');
    }
    return id;
  } catch (err) {
    console.warn('Failed to schedule wake alarm:', err);
    return null;
  }
}
