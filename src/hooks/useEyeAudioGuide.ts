import { useCallback, useEffect, useState } from 'react';
import {
  loadEyeAudioGuideEnabled,
  saveEyeAudioGuideEnabled,
} from '@/services/eyeAudioGuidePreference';

/**
 * Canonical persisted preference for Eye Reset spoken narration.
 * One source of truth — used across overview, preparation, and active session.
 */
export function useEyeAudioGuide() {
  const [enabled, setEnabled] = useState(true); // optimistic default
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadEyeAudioGuideEnabled().then(v => {
      setEnabled(v);
      setLoaded(true);
    });
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      void saveEyeAudioGuideEnabled(next);
      return next;
    });
  }, []);

  return { enabled, loaded, toggle };
}
