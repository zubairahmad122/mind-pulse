import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, addDoc, query, orderBy, getFirestore } from '@react-native-firebase/firestore';

import {
  loadGuestSessions,
  saveGuestSessions,
  loadUserSessionsCache,
  saveUserSessionsCache,
} from '@/services/sleepPersistence';
import { useAuth } from './AuthContext';
import { SleepSession } from '../utils/sleepUtils';
import { withTimeout } from '@/utils/withTimeout';

type SleepContextType = {
  sessions: SleepSession[];
  loading: boolean;
  addSession: (session: Omit<SleepSession, 'id'>) => Promise<void>;
  refresh: () => Promise<void>;
};

const SleepContext = createContext<SleepContextType>({} as SleepContextType);

let _sleepCounter = 0;

export function SleepProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuestMode } = useAuth();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Evaluated at render time, not import time — avoids edge cases where
  // Firebase config isn't ready yet and makes the provider unit-testable.
  const db = useMemo(() => getFirestore(), []);

  const refresh = useCallback(async () => {
    if (!user) {
      if (isGuestMode) {
        setSessions(await loadGuestSessions());
      } else {
        setSessions([]);
      }
      setLoading(false);
      return;
    }
    try {
      const snap = await withTimeout(
        getDocs(query(collection(db, 'users', user.uid, 'sleepSessions'), orderBy('startTime', 'desc'))),
        4000,
      );
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as SleepSession));
      setSessions(loaded);
      void saveUserSessionsCache(user.uid, loaded);
    } catch (error) {
      // offline, load from local cache
      reportError(error, { tag: 'SleepContext', action: 'refresh' });
      const cached = await loadUserSessionsCache(user.uid);
      setSessions(cached);
    } finally {
      setLoading(false);
    }
  }, [user, isGuestMode, db]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const addSession = async (session: Omit<SleepSession, 'id'>) => {
    if (!user) {
      if (isGuestMode) {
        const localId = `guest-${Date.now()}-${++_sleepCounter}`;
        setSessions(prev => {
          const next = [{ id: localId, ...session }, ...prev];
          void saveGuestSessions(next);
          return next;
        });
        return;
      }
      throw new Error('Please sign in to save sessions.');
    }
    const docRef = await addDoc(collection(db, 'users', user.uid, 'sleepSessions'), session);
    setSessions(prev => {
      const next = [{ id: docRef.id, ...session }, ...prev];
      void saveUserSessionsCache(user.uid, next);
      return next;
    });
  };

  return (
    <SleepContext.Provider value={{ sessions, loading, addSession, refresh }}>
      {children}
    </SleepContext.Provider>
  );
}

export const useSleep = () => useContext(SleepContext);
