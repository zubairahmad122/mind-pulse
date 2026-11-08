import { useCallback, useEffect, useState } from 'react';
import {
  loadEyeAudioGuideEnabled,
  saveEyeAudioGuideEnabled,
} from '@/services/eyeAudioGuidePreference';

/**
 * Canonical persisted preference for Eye spoken narration (20-20-20 break +
 * Eye Reset sessions). One source of truth — Profile toggle and in-session
 * mute icons all read/write this.
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
