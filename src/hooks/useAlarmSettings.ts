import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_ALARM_SETTINGS } from '@/constants/alarmSounds';

const STORAGE_KEY = '@mindpulse/alarm-settings';

export interface AlarmSettings {
  smartAlarm: boolean;
  selectedRingtone: string;
  selectedVibration: string;
  snoozeDuration: 5 | 10 | 15 | 20 | 30;
  smartAlarmWindow: 15 | 30 | 45 | 60;
  alarmVolume: number;
  alarmLabel: string;
  darkMode: boolean;
}

function getDefaults(): AlarmSettings {
  return {
    smartAlarm: true,
    selectedRingtone: DEFAULT_ALARM_SETTINGS.ringtoneId,
    selectedVibration: DEFAULT_ALARM_SETTINGS.vibrationPatternId,
    snoozeDuration: DEFAULT_ALARM_SETTINGS.snoozeDuration as AlarmSettings['snoozeDuration'],
    smartAlarmWindow: DEFAULT_ALARM_SETTINGS.smartAlarmWindow as AlarmSettings['smartAlarmWindow'],
    alarmVolume: DEFAULT_ALARM_SETTINGS.alarmVolume,
    alarmLabel: DEFAULT_ALARM_SETTINGS.alarmLabel,
    darkMode: true,
  };
}

const listeners = new Set<() => void>();
let sharedSettings: AlarmSettings = getDefaults();
let sharedLoaded = false;
let loadPromise: Promise<AlarmSettings> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSettingsSnapshot() {
  return sharedSettings;
}

function getLoadedSnapshot() {
  return sharedLoaded;
}

function notify() {
  for (const listener of listeners) listener();
}

async function loadSharedSettings(): Promise<AlarmSettings> {
  if (sharedLoaded) return sharedSettings;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AlarmSettings>;
        sharedSettings = { ...sharedSettings, ...parsed };
      }
    } catch {
      // Fallback to defaults.
    }
    sharedLoaded = true;
    notify();
    return sharedSettings;
  })();

  return loadPromise;
}

function updateSharedSettings(updater: (settings: AlarmSettings) => AlarmSettings) {
  sharedSettings = updater(sharedSettings);
  sharedLoaded = true;
  notify();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sharedSettings)).catch(() => {});
}

export function useAlarmSettings() {
  const settings = useSyncExternalStore(subscribe, getSettingsSnapshot, getSettingsSnapshot);
  const loaded = useSyncExternalStore(subscribe, getLoadedSnapshot, getLoadedSnapshot);

  useEffect(() => {
    void loadSharedSettings();
  }, []);

  const setSmartAlarm = useCallback((value: boolean) => {
    updateSharedSettings(prev => ({ ...prev, smartAlarm: value }));
  }, []);

  const setSelectedRingtone = useCallback((value: string) => {
    updateSharedSettings(prev => ({ ...prev, selectedRingtone: value }));
  }, []);

  const setSelectedVibration = useCallback((value: string) => {
    updateSharedSettings(prev => ({ ...prev, selectedVibration: value }));
  }, []);

  const setSnoozeDuration = useCallback((value: 5 | 10 | 15 | 20 | 30) => {
    updateSharedSettings(prev => ({ ...prev, snoozeDuration: value }));
  }, []);

  const setSmartAlarmWindow = useCallback((value: 15 | 30 | 45 | 60) => {
    updateSharedSettings(prev => ({ ...prev, smartAlarmWindow: value }));
  }, []);

  const setAlarmVolume = useCallback((value: number) => {
    updateSharedSettings(prev => ({ ...prev, alarmVolume: value }));
  }, []);

  const setAlarmLabel = useCallback((value: string) => {
    updateSharedSettings(prev => ({ ...prev, alarmLabel: value }));
  }, []);

  const setDarkMode = useCallback((value: boolean) => {
    updateSharedSettings(prev => ({ ...prev, darkMode: value }));
  }, []);

  return {
    ...settings,
    loaded,
    setSmartAlarm,
    setSelectedRingtone,
    setSelectedVibration,
    setSnoozeDuration,
    setSmartAlarmWindow,
    setAlarmVolume,
    setAlarmLabel,
    setDarkMode,
  };
}
