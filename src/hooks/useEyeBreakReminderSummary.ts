import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadEyeBreakReminderEvents } from '@/services/eyeBreakReminderEvents';
import {
  summarizeEyeBreakReminderEvents,
  type EyeBreakReminderSummary,
} from '@/utils/eyeBreakReminderStats';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_SUMMARY: EyeBreakReminderSummary = {
  interactions: 0,
  opened: 0,
  snoozed: 0,
  completed: 0,
  abandoned: 0,
  completionRate: null,
};

export function useEyeBreakReminderSummary(uid?: string) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadEyeBreakReminderEvents(uid).then(events => {
        if (!active) return;
        setSummary(
          summarizeEyeBreakReminderEvents(events, Date.now() - SEVEN_DAYS_MS),
        );
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );

  return { summary, loading };
}
