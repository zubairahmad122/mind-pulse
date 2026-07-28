import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadEyeComfortRecords } from '@/services/eyeComfortPersistence';
import { summarizeEyeComfort, type EyeComfortSummary } from '@/utils/eyeComfort';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_SUMMARY: EyeComfortSummary = {
  sessions: 0,
  comparedSessions: 0,
  improvedSessions: 0,
  sameSessions: 0,
  worsenedSessions: 0,
  averageChange: null,
};

export function useEyeComfortSummary(uid?: string) {
  const [summary, setSummary] = useState<EyeComfortSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadEyeComfortRecords(uid).then(records => {
        if (!active) return;
        setSummary(summarizeEyeComfort(records, Date.now() - SEVEN_DAYS_MS));
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );

  return { summary, loading };
}
