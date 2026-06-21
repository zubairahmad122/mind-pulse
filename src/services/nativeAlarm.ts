import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type { NativeAlarmModule } from '@/types/alarm.types';

let cached: NativeAlarmModule | null | undefined;

export function getNativeAlarmModule(): NativeAlarmModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') {
    cached = null;
    return cached;
  }
  cached = requireOptionalNativeModule<NativeAlarmModule>('MindPulseAlarm') ?? null;
  return cached;
}

export function hasNativeAlarmModule(): boolean {
  return getNativeAlarmModule() != null;
}
