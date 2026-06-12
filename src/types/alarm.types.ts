export type AlarmPermissionStatus = {
  notifications: boolean;
  exactAlarm: boolean;
  fullScreenIntent: boolean;
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
  isAlarmRinging: () => Promise<boolean>;
  getRingingLabel: () => Promise<string>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

export const ALARM_NATIVE_EVENTS = {
  fired: 'MindPulseAlarmFired',
  stopped: 'MindPulseAlarmStopped',
} as const;
