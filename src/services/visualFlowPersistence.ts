import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VisualFlowId } from '@/constants/visualFlowActivities';

/**
 * Completion history for Visual Flow sessions (full 4-activity flow or a
 * solo activity). Deliberately separate from `eyeProgressPersistence`
 * (which feeds `useEyeScore`/`calculateEyeScore`) — no scoring, no
 * eye-health metric is ever derived from this data.
 */
export interface VisualFlowSessionRecord {
  completedAt: number;
  dateKey: string;
  durationSeconds: number;
  activityIds: VisualFlowId[];
  fullSession: boolean;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function historyKey(uid?: string): string {
  return `@mindpulse/visual-flow-history:${uid ?? 'guest'}`;
}

export async function loadVisualFlowHistory(uid?: string): Promise<VisualFlowSessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(historyKey(uid));
    return raw ? (JSON.parse(raw) as VisualFlowSessionRecord[]) : [];
  } catch {
    return [];
  }
}

export async function recordVisualFlowSession(
  uid: string | undefined,
  session: { durationSeconds: number; activityIds: VisualFlowId[]; fullSession: boolean },
): Promise<void> {
  const record: VisualFlowSessionRecord = {
    ...session,
    completedAt: Date.now(),
    dateKey: todayKey(),
  };

  const existing = await loadVisualFlowHistory(uid);
  const cutoff = Date.now() - NINETY_DAYS_MS;
  const pruned = [record, ...existing].filter(r => r.completedAt >= cutoff);

  try {
    await AsyncStorage.setItem(historyKey(uid), JSON.stringify(pruned));
  } catch {
    // ignore — local cache only, non-critical
  }
}
