import AsyncStorage from '@react-native-async-storage/async-storage';

export type EyeBreakReminderEventType =
  | 'opened'
  | 'snoozed'
  | 'completed'
  | 'abandoned';

export interface EyeBreakReminderEvent {
  type: EyeBreakReminderEventType;
  occurredAt: number;
  notificationId?: string;
}

const MAX_EVENTS = 300;

function eventKey(uid?: string): string {
  return `@mindpulse/eye-break-reminder-events:${uid ?? 'guest'}`;
}

export async function recordEyeBreakReminderEvent(
  uid: string | undefined,
  event: EyeBreakReminderEvent,
): Promise<void> {
  try {
    const key = eventKey(uid);
    const raw = await AsyncStorage.getItem(key);
    const existing: EyeBreakReminderEvent[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(
      key,
      JSON.stringify([event, ...existing].slice(0, MAX_EVENTS)),
    );
  } catch {
    // Analytics must never block a break or navigation.
  }
}

export async function loadEyeBreakReminderEvents(
  uid?: string,
): Promise<EyeBreakReminderEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(eventKey(uid));
    return raw ? (JSON.parse(raw) as EyeBreakReminderEvent[]) : [];
  } catch {
    return [];
  }
}
