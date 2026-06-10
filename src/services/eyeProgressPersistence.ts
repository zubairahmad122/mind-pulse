import AsyncStorage from '@react-native-async-storage/async-storage';

export type EyeSessionType = 'cvs-protocol' | 'eye-reset';

export interface EyeSessionRecord {
  dateKey: string;
  completedAt: number;
  type: EyeSessionType;
}

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function sessionKey(uid?: string): string {
  return `@mindpulse/eye-sessions:${uid ?? 'guest'}`;
}

function enforcerKey(uid?: string): string {
  return `@mindpulse/eye-break-enforcer:${uid ?? 'guest'}`;
}

function notifIdKey(uid?: string): string {
  return `@mindpulse/eye-break-notif-id:${uid ?? 'guest'}`;
}

async function loadSessions(uid?: string): Promise<EyeSessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(sessionKey(uid));
    return raw ? (JSON.parse(raw) as EyeSessionRecord[]) : [];
  } catch {
    return [];
  }
}

async function saveSessions(uid: string | undefined, records: EyeSessionRecord[]): Promise<void> {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const pruned = records.filter(r => r.completedAt >= cutoff);
  try {
    await AsyncStorage.setItem(sessionKey(uid), JSON.stringify(pruned));
  } catch {
    // ignore
  }
}

export async function recordEyeCompletion(
  uid: string | undefined,
  type: EyeSessionType,
): Promise<void> {
  const sessions = await loadSessions(uid);
  const record: EyeSessionRecord = {
    dateKey: todayKey(),
    completedAt: Date.now(),
    type,
  };
  await saveSessions(uid, [record, ...sessions]);
}

export async function loadEyeSessions(uid?: string): Promise<EyeSessionRecord[]> {
  return loadSessions(uid);
}

export async function getEyeBreakEnforcerEnabled(uid?: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(enforcerKey(uid));
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setEyeBreakEnforcerEnabled(
  uid: string | undefined,
  enabled: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(enforcerKey(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function saveEyeBreakNotifId(
  uid: string | undefined,
  id: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(notifIdKey(uid), id);
  } catch {
    // ignore
  }
}

export async function loadEyeBreakNotifId(uid?: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(notifIdKey(uid));
  } catch {
    return null;
  }
}

export async function clearEyeBreakNotifId(uid?: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(notifIdKey(uid));
  } catch {
    // ignore
  }
}
