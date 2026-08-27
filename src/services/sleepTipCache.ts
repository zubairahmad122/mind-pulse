/**
 * Cache for Gemini-generated sleep tips.
 *
 * Stores the last-generated sleep tip in AsyncStorage so it can be shown
 * immediately when the user revisits the Routine tab, while a fresh tip
 * loads in the background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@mindpulse/sleep-tip';
const FINGERPRINT_KEY = '@mindpulse/sleep-tip-fingerprint';

/**
 * Retrieve the cached sleep tip. Returns `null` if nothing is cached.
 */
export async function getCachedSleepTip(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

/**
 * Cache a sleep tip for immediate display on next visit.
 */
export async function setCachedSleepTip(tip: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, tip);
  } catch {
    // cache miss is acceptable
  }
}

/**
 * Build a fingerprint of the current sleep data + journal data so we can
 * detect meaningful changes and avoid re-fetching when nothing changed.
 */
export function buildSleepFingerprint(params: {
  avgBedtime: string;
  avgWakeTime: string;
  avgDurationHours: number;
  consistencyScore: number;
  sessionCount: number;
  journalEntryCount: number;
}): string {
  return `${params.avgBedtime}|${params.avgWakeTime}|${params.avgDurationHours}|${params.consistencyScore}|${params.sessionCount}|${params.journalEntryCount}`;
}

/**
 * Get the last cached fingerprint. Returns `null` if none exists.
 */
export async function getCachedFingerprint(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FINGERPRINT_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the current fingerprint so we can compare on next load.
 */
export async function setCachedFingerprint(fp: string): Promise<void> {
  try {
    await AsyncStorage.setItem(FINGERPRINT_KEY, fp);
  } catch {
    // acceptable
  }
}
