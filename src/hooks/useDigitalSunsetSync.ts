import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { ensureDigitalSunsetScheduled } from '@/services/digitalSunset';

export function useDigitalSunsetSync(): void {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    void ensureDigitalSunsetScheduled(uid);
  }, [uid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void ensureDigitalSunsetScheduled(uid);
    });
    return () => sub.remove();
  }, [uid]);
}
