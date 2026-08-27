import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Shared, persisted "Auto Dim" preference — one toggle, read/written from both
// the Active Sleep screen and the Wake Time setup sheet. Pure in-app opacity
// (see SleepScreen's `dimOpacity`), not system brightness, so no native
// permission is involved; this hook only owns the on/off preference.
const STORAGE_KEY = '@mindpulse/auto-dim-enabled';

const listeners = new Set<() => void>();
let sharedEnabled = true;
let sharedLoaded = false;
let loadPromise: Promise<boolean> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getEnabledSnapshot() {
  return sharedEnabled;
}

function getLoadedSnapshot() {
  return sharedLoaded;
}

function notify() {
  for (const listener of listeners) listener();
}

async function loadShared(): Promise<boolean> {
  if (sharedLoaded) return sharedEnabled;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw != null) sharedEnabled = raw === 'true';
    } catch {
      // Fallback to default (enabled).
    }
    sharedLoaded = true;
    notify();
    return sharedEnabled;
  })();

  return loadPromise;
}

function setShared(value: boolean) {
  sharedEnabled = value;
  sharedLoaded = true;
  notify();
  AsyncStorage.setItem(STORAGE_KEY, String(value)).catch(() => {});
}

export function useAutoDim() {
  const enabled = useSyncExternalStore(subscribe, getEnabledSnapshot, getEnabledSnapshot);
  const loaded = useSyncExternalStore(subscribe, getLoadedSnapshot, getLoadedSnapshot);

  useEffect(() => {
    void loadShared();
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setShared(value);
  }, []);

  return { enabled, setEnabled, loaded };
}
