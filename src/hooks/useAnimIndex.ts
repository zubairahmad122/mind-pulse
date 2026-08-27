import { useEffect, useState } from 'react';

/**
 * Returns an index that cycles 0 → length-1 at the given interval (ms).
 * Useful for driving frame-based CSS-like animations (twinkle, wave, scan).
 */
export function useAnimIndex(length: number, interval = 180) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % length), interval);
    return () => clearInterval(id);
  }, [length, interval]);
  return idx;
}
