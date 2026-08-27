import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadEyeSymptomRecords } from '@/services/eyeSymptomPersistence';
import {
  summarizeEyeSymptoms,
  type EyeSymptomSummary,
} from '@/utils/eyeSymptomGuidance';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_SUMMARY: EyeSymptomSummary = {
  checkIns: 0,
  symptomCheckIns: 0,
  concerningCheckIns: 0,
  mostFrequent: null,
};

export function useEyeSymptomSummary(uid?: string) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadEyeSymptomRecords(uid).then(records => {
        if (!active) return;
        setSummary(summarizeEyeSymptoms(records, Date.now() - SEVEN_DAYS_MS));
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );

  return { summary, loading };
}
