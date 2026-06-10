import { NativeModules, Platform } from 'react-native';
import type { NativeAlarmModule } from '@/types/alarm.types';

export function getNativeAlarmModule(): NativeAlarmModule | null {
  if (Platform.OS !== 'android') return null;
  return (NativeModules.MindPulseAlarm as NativeAlarmModule | undefined) ?? null;
}

export function hasNativeAlarmModule(): boolean {
  return getNativeAlarmModule() != null;
}
