/**
 * Cache for the Gemini-generated "tonight's plan" sleep insight shown on the
 * Sleep planning screen. Mirrors sleepTipCache: stores the last insight so it
 * shows instantly, plus a fingerprint to skip re-fetching when the plan is unchanged.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@mindpulse/sleep-plan-insight';
const FINGERPRINT_KEY = '@mindpulse/sleep-plan-insight-fingerprint';

export async function getCachedPlanInsight(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

export async function setCachedPlanInsight(insight: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, insight);
  } catch {
    // cache miss is acceptable
  }
}

export async function getCachedPlanFingerprint(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FINGERPRINT_KEY);
  } catch {
    return null;
  }
}

export async function setCachedPlanFingerprint(fp: string): Promise<void> {
  try {
    await AsyncStorage.setItem(FINGERPRINT_KEY, fp);
  } catch {
    // acceptable
  }
}

/** Build a fingerprint of the current plan so we only re-fetch on meaningful change. */
export function buildPlanFingerprint(params: {
  bedtime: string;
  wakeTime: string;
  goalLabel: string;
}): string {
  return `${params.bedtime}|${params.wakeTime}|${params.goalLabel}`;
}
