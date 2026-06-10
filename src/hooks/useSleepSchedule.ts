import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { SleepSchedule } from '@/types/sleep.types';

const STORAGE_KEY = '@mindpulse/sleep-schedule';
const FIRESTORE_DOC = 'sleepSchedule';

const DEFAULT_SCHEDULE: Omit<SleepSchedule, 'uid'> = {
  bedtime: '23:00',
  wakeTime: '06:30',
  duration: 7.5,
  activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  reminderEnabled: true,
  reminderMinutes: 30,
};

export function useSleepSchedule(uid?: string, isGuestMode = false) {
  const [schedule, setSchedule] = useState<SleepSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = `${STORAGE_KEY}:${uid ?? 'guest'}`;

  const load = useCallback(async () => {
    setLoading(true);
    const fallback = { uid: uid ?? 'guest', ...DEFAULT_SCHEDULE };

    try {
      if (uid && !isGuestMode) {
        const snap = await firestore()
          .collection('users')
          .doc(uid)
          .collection('settings')
          .doc(FIRESTORE_DOC)
          .get();
        if (snap.exists()) {
          const data = snap.data() as Omit<SleepSchedule, 'uid'>;
          const loaded = { uid, ...data };
          setSchedule(loaded);
          await AsyncStorage.setItem(storageKey, JSON.stringify(loaded));
          setLoading(false);
          return;
        }
      }

      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        setSchedule(JSON.parse(raw) as SleepSchedule);
      } else {
        setSchedule(fallback);
      }
    } catch {
      setSchedule(fallback);
    } finally {
      setLoading(false);
    }
  }, [storageKey, uid, isGuestMode]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSchedule = async (next: SleepSchedule) => {
    setSchedule(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));

    if (uid && !isGuestMode) {
      try {
        const { uid: _uid, ...data } = next;
        await firestore()
          .collection('users')
          .doc(uid)
          .collection('settings')
          .doc(FIRESTORE_DOC)
          .set(data, { merge: true });
      } catch {
        // local copy already saved
      }
    }
  };

  return { schedule, loading, saveSchedule, reload: load };
}
