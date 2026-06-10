import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getPresetById, SleepPreset } from '@/constants/sleepSessions';
import {
  cancelSleepAlarms,
  prepareAlarmPermissions,
  scheduleWakeAlarm,
} from '@/services/sleepAlarm';
import {
  clearActiveSleep,
  loadActiveSleep,
  loadPreferredPresetId,
  saveActiveSleep,
  savePreferredPresetId,
} from '@/services/sleepPersistence';
import {
  isAccelerometerAvailable,
  startAccelerometerSensing,
  stopAccelerometerSensing,
  classifySleepStage,
  SleepStage,
} from '@/services/accelerometerSleepTracker';
import { ActiveSleepRecord } from '@/types/activeSleep.types';
import { handleAlarmSupport, scheduleWakeAlarmWithFeedback } from '@/utils/alarmFeedback';

const SNOOZE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SNOOZES = 3;

const DEFAULT_PRESET_ID = 'night-7.5';

type Options = {
  uid?: string;
  defaultPreset: SleepPreset;
};

export function usePersistedSleepTracker({ uid, defaultPreset }: Options) {
  const [hydrated, setHydrated] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<SleepPreset>(defaultPreset);
  const [tracking, setTracking] = useState(false);
  const [alarmPastDue, setAlarmPastDue] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [wakeAt, setWakeAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  // Advanced sleep stage states
  const [alarmLabel, setAlarmLabel] = useState('');
  const [smartAlarmEnabled, setSmartAlarmEnabled] = useState(true);
  const [sleepStage, setSleepStage] = useState<SleepStage>('deep');
  const magnitudesRef = useRef<number[]>([]);
  const presetSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPreset = useCallback(
    (preset: SleepPreset) => {
      setSelectedPreset(preset);
      if (presetSaveTimer.current) clearTimeout(presetSaveTimer.current);
      presetSaveTimer.current = setTimeout(() => {
        void savePreferredPresetId(uid, preset.id);
      }, 200);
    },
    [uid],
  );

  // Restore session
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const savedPresetId = await loadPreferredPresetId(uid);
      const preset = (savedPresetId && getPresetById(savedPresetId)) || defaultPreset;
      const active = await loadActiveSleep(uid);
      if (cancelled) return;

      setSelectedPreset(preset);

      if (active) {
        const start = new Date(active.startTime);
        const wake = new Date(active.wakeAt);
        const restored = getPresetById(active.presetId) ?? preset;
        setSelectedPreset(restored);
        setStartTime(start);
        setWakeAt(wake);
        setAlarmLabel(active.alarmLabel);
        setTracking(true);
        setSmartAlarmEnabled(active.smartAlarmEnabled ?? true);
        setAlarmPastDue(wake.getTime() <= Date.now());

        if (wake.getTime() > Date.now()) {
          try {
            const support = await prepareAlarmPermissions();
            if (support === 'granted') {
              await scheduleWakeAlarm(wake, active.alarmLabel);
            }
          } catch {
            // Native alarm module may be unavailable in Expo Go
          }
        }
      }

      setHydrated(true);
    })();

    return () => {
      cancelled = true;
      if (presetSaveTimer.current) clearTimeout(presetSaveTimer.current);
    };
  }, [uid, defaultPreset.id]);

  // Handle real-time sleep stage tracking and smart alarm wake-up window
  useEffect(() => {
    if (!tracking || !smartAlarmEnabled || !wakeAt || alarmPastDue) {
      stopAccelerometerSensing();
      setSleepStage('deep');
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const available = await isAccelerometerAvailable();
      if (cancelled || !available) return;

      magnitudesRef.current = [];
      cleanup = startAccelerometerSensing(data => {
        magnitudesRef.current = [...magnitudesRef.current.slice(-29), data.magnitude];
        const nextStage = classifySleepStage(magnitudesRef.current);
        setSleepStage(nextStage);

        const msUntilWake = wakeAt.getTime() - Date.now();
        const WAKE_UP_WINDOW_MS = 30 * 60 * 1000;

        if (msUntilWake > 0 && msUntilWake <= WAKE_UP_WINDOW_MS && nextStage === 'light') {
          setAlarmPastDue(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 1000);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      stopAccelerometerSensing();
    };
  }, [tracking, smartAlarmEnabled, wakeAt, alarmPastDue]);

  const startSleep = useCallback(
    async (minutes: number, label: string, presetId: string) => {
      if (busy) return false;
      if (minutes < 1) {
        Alert.alert('Invalid duration', 'Choose a sleep or nap duration.');
        return false;
      }

      setBusy(true);
      const wake = new Date(Date.now() + minutes * 60 * 1000);
      const start = new Date();
      const preset = getPresetById(presetId) ?? selectedPreset;

      setSelectedPreset(preset);
      setWakeAt(wake);
      setStartTime(start);
      setAlarmLabel(label);
      setTracking(true);
      setAlarmPastDue(false);

      const record: ActiveSleepRecord = {
        presetId,
        startTime: start.getTime(),
        wakeAt: wake.getTime(),
        alarmLabel: label,
        smartAlarmEnabled,
      };

      void saveActiveSleep(uid, record);
      void savePreferredPresetId(uid, presetId);

      const support = await prepareAlarmPermissions();
      if (handleAlarmSupport(support)) {
        await scheduleWakeAlarmWithFeedback(wake, label);
      }

      setBusy(false);
      return true;
    },
    [busy, selectedPreset, uid, smartAlarmEnabled],
  );

  const stopSleep = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setAlarmPastDue(false);
    await cancelSleepAlarms();
    await clearActiveSleep(uid);
    setTracking(false);
    setWakeAt(null);
    setBusy(false);
  }, [busy, uid]);

  const snooze = useCallback(async () => {
    if (!wakeAt || busy || !alarmLabel) return;
    setBusy(true);

    // Cancel old alarm
    await cancelSleepAlarms();

    // Set new wake time 10 min from now
    const newWake = new Date(Date.now() + SNOOZE_MS);
    setWakeAt(newWake);
    setAlarmPastDue(false);

    // Persist updated record
    if (startTime) {
      const record: ActiveSleepRecord = {
        presetId: selectedPreset.id,
        startTime: startTime.getTime(),
        wakeAt: newWake.getTime(),
        alarmLabel,
        smartAlarmEnabled,
      };
      await saveActiveSleep(uid, record);
    }

    // Schedule new alarm
    const support = await prepareAlarmPermissions();
    if (handleAlarmSupport(support)) {
      await scheduleWakeAlarmWithFeedback(newWake, alarmLabel);
    }

    setBusy(false);
  }, [wakeAt, busy, alarmLabel, startTime, selectedPreset.id, smartAlarmEnabled, uid]);

  const clearSession = useCallback(async () => {
    await clearActiveSleep(uid);
    setTracking(false);
    setAlarmPastDue(false);
    setStartTime(null);
    setWakeAt(null);
  }, [uid]);

  const refreshAlarmState = useCallback(() => {
    if (!wakeAt || !tracking) return;
    setAlarmPastDue(wakeAt.getTime() <= Date.now());
  }, [tracking, wakeAt]);

  return {
    hydrated,
    busy,
    selectedPreset,
    setSelectedPreset: persistPreset,
    tracking,
    alarmPastDue,
    startTime,
    wakeAt,
    startSleep,
    stopSleep,
    snooze,
    clearSession,
    refreshAlarmState,
    smartAlarmEnabled,
    setSmartAlarmEnabled,
    sleepStage,
  };
}

export type SleepTrackerApi = ReturnType<typeof usePersistedSleepTracker>;

export { DEFAULT_PRESET_ID };
