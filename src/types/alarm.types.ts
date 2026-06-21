export type AlarmPermissionStatus = {
  notifications: boolean;
  exactAlarm: boolean;
  fullScreenIntent: boolean;
  batteryUnrestricted?: boolean;
  nativeAvailable: boolean;
  ready: boolean;
};

export type SleepAlarmSupport = 'granted' | 'denied' | 'unavailable';

export type NativeAlarmModule = {
  scheduleAlarm: (timestampMillis: number, label: string) => Promise<string>;
  cancelAlarm: () => Promise<void>;
  stopRinging: () => Promise<void>;
  getPermissionStatus: () => Promise<AlarmPermissionStatus>;
  requestAlarmPermissions: () => Promise<AlarmPermissionStatus>;
  openAutostartSettings: () => Promise<boolean>;
  isAlarmRinging: () => Promise<boolean>;
  getRingingLabel: () => Promise<string>;
  addListener: (
    eventName: string,
    listener: (payload: { label?: string }) => void,
  ) => { remove: () => void };
};

export const ALARM_NATIVE_EVENTS = {
  fired: 'MindPulseAlarmFired',
  stopped: 'MindPulseAlarmStopped',
} as const;
