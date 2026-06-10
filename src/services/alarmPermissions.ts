import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlarmPermissionStatus } from '@/types/alarm.types';
import { getNativeAlarmModule } from './nativeAlarm';

const STORAGE_KEY = '@mindpulse/alarm-permissions-setup-v1';

export async function getAlarmPermissionStatus(): Promise<AlarmPermissionStatus> {
  const native = getNativeAlarmModule();
  if (native) {
    return native.getPermissionStatus();
  }
  return {
    notifications: true,
    exactAlarm: true,
    fullScreenIntent: true,
    nativeAvailable: false,
    ready: true,
  };
}

export async function requestAllAlarmPermissions(): Promise<AlarmPermissionStatus> {
  const native = getNativeAlarmModule();
  if (native) {
    return native.requestAlarmPermissions();
  }
  return getAlarmPermissionStatus();
}

export async function shouldShowPermissionSetup(): Promise<boolean> {
  const status = await getAlarmPermissionStatus();
  if (status.ready) return false;
  const dismissed = await AsyncStorage.getItem(STORAGE_KEY);
  return dismissed !== 'done';
}

export async function markPermissionSetupDone(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, 'done');
}
