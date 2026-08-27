import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { RoastLevel } from '@/constants/eyeRoast';

const KEY = '@mindpulse/roast-mode';

export function useRoastMode() {
  const [roastMode, setRoastMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(val => {
      if (val === 'true') setRoastMode(true);
    });
  }, []);

  const toggle = useCallback(async (next: boolean) => {
    setRoastMode(next);
    await AsyncStorage.setItem(KEY, next ? 'true' : 'false');
  }, []);

  const level: RoastLevel = roastMode ? 'savage' : 'gentle';

  return { roastMode, level, toggle };
}
