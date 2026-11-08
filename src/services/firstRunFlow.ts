import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent } from './analytics';
import { scheduleEyeBreakReminders } from './eyeBreakNotification';
import { loadEyeBreakSchedule, saveEyeBreakInterval } from './eyeBreakReminderPreferences';
import { getEyeBreakEnforcerEnabled, setEyeBreakEnforcerEnabled } from './eyeProgressPersistence';

const FIRST_RUN_REMINDER_MINUTES = 30;

// Set by onboarding's "Start 2-min reset", read once when the Eyes tab mounts.
let firstResetPending = false;

export function setFirstResetPending(pending: boolean): void {
  firstResetPending = pending;
}

export function consumeFirstResetPending(): boolean {
  const pending = firstResetPending;
  firstResetPending = false;
  return pending;
}

function reminderOfferKey(uid?: string) {
  return `@mindpulse/break-reminder-offer-shown:${uid ?? 'guest'}`;
}

/** True once per account, and only while break reminders are still off. */
export async function shouldOfferBreakReminders(uid?: string): Promise<boolean> {
  try {
    const [shown, enabled] = await Promise.all([
      AsyncStorage.getItem(reminderOfferKey(uid)),
      getEyeBreakEnforcerEnabled(uid),
    ]);
    return shown !== '1' && !enabled;
  } catch {
    return false;
  }
}

export async function markBreakReminderOfferShown(uid?: string): Promise<void> {
  await AsyncStorage.setItem(reminderOfferKey(uid), '1').catch(() => undefined);
}

/** Asks for notification permission, then starts 30-minute break reminders. */
export async function enableFirstRunBreakReminders(uid?: string): Promise<boolean> {
  await saveEyeBreakInterval(uid, FIRST_RUN_REMINDER_MINUTES);
  const schedule = await loadEyeBreakSchedule(uid);
  const scheduled = await scheduleEyeBreakReminders(
    uid,
    FIRST_RUN_REMINDER_MINUTES,
    true,
    schedule,
  );
  await setEyeBreakEnforcerEnabled(uid, scheduled);
  if (scheduled) {
    trackEvent('reminder_enabled', {
      kind: 'eye_break',
      interval_minutes: FIRST_RUN_REMINDER_MINUTES,
    });
  }
  return scheduled;
}
