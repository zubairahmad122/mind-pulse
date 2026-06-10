import { useEffect, useState } from 'react';
import { getLastBreakTime } from '@/services/lastBreakPersistence';

export function useLastBreakTime(uid?: string): { minutesAgo: number | null; loading: boolean } {
  const [ts, setTs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLastBreakTime(uid).then(t => {
      if (!cancelled) { setTs(t); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [uid]);

  const minutesAgo = ts !== null ? Math.floor((Date.now() - ts) / 60000) : null;
  return { minutesAgo, loading };
}
