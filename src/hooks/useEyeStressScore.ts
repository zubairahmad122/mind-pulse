import { useCallback, useEffect, useState } from 'react';
import {
  getEyeBreakEnforcerEnabled,
  loadEyeSessions,
} from '@/services/eyeProgressPersistence';
import {
  calculateEyeStressScore,
  EyeScoreResult,
} from '@/utils/eyeStressScore';

export function useEyeStressScore(uid?: string) {
  const [result, setResult] = useState<EyeScoreResult>({ score: 50, primaryReason: 'Calculating…' });
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const [sessions, breakEnabled] = await Promise.all([
        loadEyeSessions(uid),
        getEyeBreakEnforcerEnabled(uid),
      ]);
      setResult(calculateEyeStressScore({ sessions, breakEnforcerEnabled: breakEnabled }));
    } catch {
      // keep default
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { void compute(); }, [compute]);

  return { ...result, loading, refresh: compute };
}
