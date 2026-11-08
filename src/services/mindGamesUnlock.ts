import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysBetween, todayISO } from '@/utils/dateUtils';

const FIRST_SEEN_KEY = '@mindpulse/first-seen-date';
/** Day 1 is the first day seen, so day 3 is two days later. */
const UNLOCK_AFTER_DAYS = 2;
const NEW_BADGE_DAYS = 7;

export function getMindGamesUnlock(
  firstSeen: string,
  today: string,
): { unlocked: boolean; isNew: boolean } {
  const days = daysBetween(firstSeen, today);
  return {
    unlocked: days >= UNLOCK_AFTER_DAYS,
    isNew: days >= UNLOCK_AFTER_DAYS && days < UNLOCK_AFTER_DAYS + NEW_BADGE_DAYS,
  };
}

/** The first date stored on this device, saving today if there is none yet. */
export async function loadFirstSeenDate(): Promise<string> {
  const today = todayISO();
  try {
    const stored = await AsyncStorage.getItem(FIRST_SEEN_KEY);
    if (stored) return stored;
    await AsyncStorage.setItem(FIRST_SEEN_KEY, today);
  } catch {
    // Treated as day 1 for this visit.
  }
  return today;
}
