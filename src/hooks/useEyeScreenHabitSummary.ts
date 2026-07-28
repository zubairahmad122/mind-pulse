import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadScreenHabitRecords } from '@/services/eyeScreenHabitPersistence';
import {
  summarizeScreenHabits,
  type ScreenHabitSummary,
} from '@/utils/eyeScreenHabits';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY: ScreenHabitSummary = {
  checkIns: 0,
  longestMinutes: null,
  averageMinutes: null,
  mostFrequentContext: null,
};

export function useEyeScreenHabitSummary(uid?: string) {
  const [summary, setSummary] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadScreenHabitRecords(uid).then(records => {
        if (!active) return;
        setSummary(summarizeScreenHabits(records, Date.now() - SEVEN_DAYS_MS));
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );
  return { summary, loading };
}
