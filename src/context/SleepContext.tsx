import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import {
  loadGuestSessions,
  saveGuestSessions,
  loadUserSessionsCache,
  saveUserSessionsCache,
} from '@/services/sleepPersistence';
import { useAuth } from './AuthContext';
import { SleepSession } from '../utils/sleepUtils';

type SleepContextType = {
  sessions: SleepSession[];
  loading: boolean;
  addSession: (session: Omit<SleepSession, 'id'>) => Promise<void>;
  refresh: () => Promise<void>;
};

const SleepContext = createContext<SleepContextType>({} as SleepContextType);

export function SleepProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuestMode } = useAuth();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [loading, setLoading] = useState(true);

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
      const snap = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('sleepSessions')
        .orderBy('startTime', 'desc')
        .get();
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as SleepSession));
      setSessions(loaded);
      void saveUserSessionsCache(user.uid, loaded);
    } catch {
      // offline, load from local cache
      const cached = await loadUserSessionsCache(user.uid);
      setSessions(cached);
    } finally {
      setLoading(false);
    }
  }, [user, isGuestMode]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const addSession = async (session: Omit<SleepSession, 'id'>) => {
    if (!user) {
      if (isGuestMode) {
        const localId = `guest-${Date.now()}`;
        setSessions(prev => {
          const next = [{ id: localId, ...session }, ...prev];
          void saveGuestSessions(next);
          return next;
        });
        return;
      }
      throw new Error('Please sign in to save sessions.');
    }
    const docRef = await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('sleepSessions')
      .add(session);
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
