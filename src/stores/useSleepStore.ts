// ──────────────────────────────────────────────────────────────────────────────
// useSleepStore — Sleep settings + sessions with AsyncStorage persistence
// ──────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SleepSession {
  id: string;
  startTime: string;
  endTime: string | null;
  bedtime: string;
  wakeTime: string;
  duration: number | null;
}

// ── Monotonic counter to guarantee unique session IDs within the same ms ──
let _counter = 0;
function uniqueId(): string {
  return `${Date.now()}-${++_counter}`;
}

interface SleepState {
  bedtime: string;
  wakeTime: string;
  sleepGoal: number;
  activeDays: number[];
  smartAlarm: boolean;
  reminderEnabled: boolean;
  reminderMinutes: number;
  alarmSound: string;
  vibrationPattern: string;
  snoozeDuration: number;
  alarmVolume: number;
  sleepSessions: SleepSession[];
  lastNightData: {
    bedtime: string;
    wakeTime: string;
    duration: number;
    quality: 'poor' | 'fair' | 'good' | 'great';
  } | null;

  // Actions
  setBedtime: (time: string) => void;
  setWakeTime: (time: string) => void;
  setSleepGoal: (hours: number) => void;
  toggleDay: (dayIndex: number) => void;
  toggleSmartAlarm: () => void;
  toggleReminder: () => void;
  setAlarmSound: (sound: string) => void;
  setAlarmVolume: (volume: number) => void;
  startSleepSession: () => void;
  endSleepSession: (duration: number) => void;
}

export const useSleepStore = create<SleepState>()(
  persist(
    (set, get) => ({
      bedtime: '23:00',
      wakeTime: '06:30',
      sleepGoal: 7.5,
      activeDays: [1, 2, 3, 4, 5], // Mon–Fri
      smartAlarm: true,
      reminderEnabled: true,
      reminderMinutes: 30,
      alarmSound: 'gentle-awake',
      vibrationPattern: 'default',
      snoozeDuration: 10,
      alarmVolume: 0.7,
      sleepSessions: [],
      lastNightData: null,

      setBedtime: (time) => set({ bedtime: time }),
      setWakeTime: (time) => set({ wakeTime: time }),
      setSleepGoal: (hours) => set({ sleepGoal: hours }),

      toggleDay: (dayIndex) =>
        set((state) => ({
          activeDays: state.activeDays.includes(dayIndex)
            ? state.activeDays.filter((d) => d !== dayIndex)
            : [...state.activeDays, dayIndex].sort(),
        })),

      toggleSmartAlarm: () =>
        set((state) => ({ smartAlarm: !state.smartAlarm })),

      toggleReminder: () =>
        set((state) => ({ reminderEnabled: !state.reminderEnabled })),

      setAlarmSound: (sound) => set({ alarmSound: sound }),
      setAlarmVolume: (volume) => set({ alarmVolume: volume }),

      startSleepSession: () =>
        set((state) => ({
          sleepSessions: [
            ...state.sleepSessions,
            {
              id: uniqueId(),
              startTime: new Date().toISOString(),
              endTime: null,
              bedtime: state.bedtime,
              wakeTime: state.wakeTime,
              duration: null,
            },
          ],
        })),

      endSleepSession: (duration) =>
        set((state) => {
          const sessions = [...state.sleepSessions];
          const last = sessions[sessions.length - 1];
          if (last && !last.endTime) {
            sessions[sessions.length - 1] = {
              ...last,
              endTime: new Date().toISOString(),
              duration,
            };
          }
          return { sleepSessions: sessions };
        }),
    }),
    {
      name: 'mindpulse-sleep',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bedtime: state.bedtime,
        wakeTime: state.wakeTime,
        sleepGoal: state.sleepGoal,
        activeDays: state.activeDays,
        smartAlarm: state.smartAlarm,
        reminderEnabled: state.reminderEnabled,
        alarmSound: state.alarmSound,
        alarmVolume: state.alarmVolume,
        sleepSessions: state.sleepSessions.slice(-30), // keep last 30 sessions
      }),
    },
  ),
);
