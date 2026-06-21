import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateWeeklyReflection } from '@/services/gemini';
import { useJournal } from '@/hooks/useJournal';
import { useSleep } from '@/context/SleepContext';
import { useAuth } from '@/context/AuthContext';
import { getLastNDayScores } from '@/services/dailyScorePersistence';
import { avgDuration, formatDuration } from '@/utils/sleepUtils';

const CACHE_KEY_REFLECTION = '@mindpulse/weekly-reflection';
const CACHE_KEY_DATE = '@mindpulse/weekly-reflection-date';

/** Fallback reflection when Gemini is unavailable. */
function fallbackReflection(eyeScore: number, sleepScore: number, mindScore: number): string {
  const lowest = Math.min(eyeScore, sleepScore, mindScore);
  if (lowest === eyeScore) {
    return 'Your eye score could use some attention this week. Try taking more frequent breaks and doing the Eye Reset Protocol to build consistency.';
  }
  if (lowest === sleepScore) {
    return 'Your sleep patterns have room to grow. Setting a consistent bedtime and winding down without screens can make a noticeable difference this coming week.';
  }
  return 'Your mind needs moments of calm. Even 5 minutes of journaling or box breathing each day can help lower stress and improve your mental clarity over the week ahead.';
}

export function useWeeklyReflection(params: {
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
}): { reflection: string; loading: boolean } {
  const { user, isGuestMode } = useAuth();
  const { entries: journalEntries } = useJournal(user?.uid, isGuestMode);
  const { sessions } = useSleep();

  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Load cached reflection on mount
  const loadCached = useCallback(async () => {
    try {
      const [cached, cachedDate] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY_REFLECTION),
        AsyncStorage.getItem(CACHE_KEY_DATE),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      if (cached && cachedDate === today) {
        setReflection(cached);
        setLoading(false);
        // Mark as fetched so we don't re-fetch for today
        fetchedRef.current = true;
      }
    } catch {
      // fall through
    }
  }, []);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  // Generate reflection when data is ready
  useEffect(() => {
    if (fetchedRef.current) return;

    const today = new Date().toISOString().slice(0, 10);

    async function generate() {
      setLoading(true);

      try {
        // Fetch last 7 days of scores
        const weekScores = user?.uid
          ? await getLastNDayScores(user.uid, 7)
          : [];

        // Recent journal entries (last 7 days)
        const cutoff = Date.now() - 7 * 86_400_000;
        const recentJournal = journalEntries
          .filter(e => new Date(e.date).getTime() >= cutoff)
          .map(e => ({
            mood: e.mood,
            text: e.text,
            triggers: e.triggers,
          }));

        // Sleep stats
        const recentSleep = sessions.filter(s => s.startTime >= cutoff);
        const avgSleepAvg = avgDuration(recentSleep);

        const geminiReflection = await generateWeeklyReflection({
          scores: weekScores,
          journalEntries: recentJournal,
          sleepSessions: recentSleep.length,
          avgSleepDuration: avgSleepAvg > 0 ? formatDuration(avgSleepAvg) : 'no data',
          currentFocusArea: params.eyeScore <= params.sleepScore && params.eyeScore <= params.mindScore
            ? 'Eyes'
            : params.sleepScore <= params.mindScore
              ? 'Sleep'
              : 'Mind',
          eyeScore: params.eyeScore,
          sleepScore: params.sleepScore,
          mindScore: params.mindScore,
        });

        if (geminiReflection) {
          setReflection(geminiReflection);
          await AsyncStorage.setItem(CACHE_KEY_REFLECTION, geminiReflection);
          await AsyncStorage.setItem(CACHE_KEY_DATE, today);
        } else {
          setReflection(fallbackReflection(params.eyeScore, params.sleepScore, params.mindScore));
        }
      } catch {
        setReflection(fallbackReflection(params.eyeScore, params.sleepScore, params.mindScore));
      } finally {
        setLoading(false);
        fetchedRef.current = true;
      }
    }

    generate();
  }, [user?.uid, journalEntries, sessions, params.eyeScore, params.sleepScore, params.mindScore]);

  return {
    reflection: reflection || fallbackReflection(params.eyeScore, params.sleepScore, params.mindScore),
    loading,
  };
}
