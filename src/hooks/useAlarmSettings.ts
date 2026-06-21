import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useAlarmSettings() {
  const [settings, setSettings] = useState<AlarmSettings>(getDefaults);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  // Load once on mount
  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AlarmSettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch {
        // Fallback to defaults
      }
      loadedRef.current = true;
      setLoaded(true);
    }
    load();
  }, []);

  // Persist whenever settings change (after initial load)
  const prevRef = useRef('');
  useEffect(() => {
    if (!loadedRef.current) return;
    const serialized = JSON.stringify(settings);
    // Avoid writing if nothing changed
    if (prevRef.current === serialized) return;
    prevRef.current = serialized;
    AsyncStorage.setItem(STORAGE_KEY, serialized).catch(() => {});
  }, [settings]);

  // Individual setters
  const setSmartAlarm = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, smartAlarm: value }));
  }, []);

  const setSelectedRingtone = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, selectedRingtone: value }));
  }, []);

  const setSelectedVibration = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, selectedVibration: value }));
  }, []);

  const setSnoozeDuration = useCallback((value: 5 | 10 | 15 | 20 | 30) => {
    setSettings(prev => ({ ...prev, snoozeDuration: value }));
  }, []);

  const setSmartAlarmWindow = useCallback((value: 15 | 30 | 45 | 60) => {
    setSettings(prev => ({ ...prev, smartAlarmWindow: value }));
  }, []);

  const setAlarmVolume = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, alarmVolume: value }));
  }, []);

  const setAlarmLabel = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, alarmLabel: value }));
  }, []);

  const setDarkMode = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, darkMode: value }));
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
