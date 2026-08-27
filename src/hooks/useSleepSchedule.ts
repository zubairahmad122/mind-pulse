import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { SleepSchedule } from '@/types/sleep.types';
import { withTimeout } from '@/utils/withTimeout';
import {
  defaultSleepSchedule,
  DEFAULT_SLEEP_SCHEDULE,
  normalizeSleepSchedule,
  saveCachedSleepSchedule,
  sleepScheduleStorageKey,
} from '@/services/sleepSchedulePersistence';
import { ensureDigitalSunsetScheduled } from '@/services/digitalSunset';

const db = getFirestore();

const FIRESTORE_DOC = 'sleepSchedule';

export function useSleepSchedule(uid?: string, isGuestMode = false) {
  const [schedule, setSchedule] = useState<SleepSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = sleepScheduleStorageKey(uid);

  const load = useCallback(async () => {
    const fallback = defaultSleepSchedule(uid);

    try {
      if (uid && !isGuestMode) {
        try {
          // Time-boxed so a hung Firestore read can't pin the screen on its
          // loading state — falls through to the local cache / default below.
          const snap = await withTimeout(
            getDoc(doc(db, 'users', uid, 'settings', FIRESTORE_DOC)),
            4000,
          );
          if (snap.exists()) {
            const data = snap.data() as Omit<SleepSchedule, 'uid'>;
            const loaded = { uid, ...data };
            setSchedule(loaded);
            await saveCachedSleepSchedule(uid, loaded);
            void ensureDigitalSunsetScheduled(uid, loaded);
            setLoading(false);
            return;
          }
        } catch {
          // Remote unavailable/slow — fall through to local cache.
        }
      }

      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const loaded = normalizeSleepSchedule(JSON.parse(raw), uid) ?? fallback;
        setSchedule(loaded);
        void ensureDigitalSunsetScheduled(uid, loaded);
      } else {
        setSchedule(fallback);
        void ensureDigitalSunsetScheduled(uid, fallback);
      }
    } catch {
      setSchedule(fallback);
    } finally {
      setLoading(false);
    }
  }, [storageKey, uid, isGuestMode]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const saveSchedule = async (next: SleepSchedule) => {
    setSchedule(next);
    await saveCachedSleepSchedule(uid, next);
    void ensureDigitalSunsetScheduled(uid, next);

    if (uid && !isGuestMode) {
      try {
        const { uid: _uid, ...data } = next;
        await setDoc(doc(db, 'users', uid, 'settings', FIRESTORE_DOC), data, { merge: true });
      } catch {
        // local copy already saved
      }
    }
  };

  return { schedule, loading, saveSchedule, reload: load };
}

export { DEFAULT_SLEEP_SCHEDULE };
