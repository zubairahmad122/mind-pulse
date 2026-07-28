import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EyeSymptomId } from '@/utils/eyeSymptomGuidance';

export interface EyeSymptomRecord {
  recordedAt: number;
  symptoms: EyeSymptomId[];
}

const MAX_RECORDS = 90;

function symptomKey(uid?: string): string {
  return `@mindpulse/eye-symptoms:${uid ?? 'guest'}`;
}

export async function loadEyeSymptomRecords(
  uid?: string,
): Promise<EyeSymptomRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(symptomKey(uid));
    return raw ? (JSON.parse(raw) as EyeSymptomRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveEyeSymptomRecord(
  uid: string | undefined,
  symptoms: EyeSymptomId[],
): Promise<EyeSymptomRecord> {
  const record = { recordedAt: Date.now(), symptoms };
  const current = await loadEyeSymptomRecords(uid);
  try {
    await AsyncStorage.setItem(
      symptomKey(uid),
      JSON.stringify([record, ...current].slice(0, MAX_RECORDS)),
    );
  } catch {
    // The guidance remains available even if local persistence fails.
  }
  return record;
}
