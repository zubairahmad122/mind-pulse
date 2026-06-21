import { useEffect, useRef, useState } from 'react';

/**
 * A high-performance animation frame hook that uses a SINGLE global
 * requestAnimationFrame loop and pushes a frame counter every ~50ms (20fps).
 *
 * This avoids the overhead of multiple concurrent setInterval timers
 * and keeps re-renders at a reasonable rate for visual animations.
 */
let globalFrame = 0;
let globalListeners = new Set<() => void>();
let globalRunning = false;
let globalLastTick = 0;

function globalLoop(time: number) {
  if (globalListeners.size === 0) {
    globalRunning = false;
    return;
  }
  // Throttle to ~20fps (every ~50ms)
  if (time - globalLastTick >= 50) {
    globalLastTick = time;
    globalFrame++;
    globalListeners.forEach((fn) => fn());
  }
  requestAnimationFrame(globalLoop);
}

function subscribeGlobal(notify: () => void): () => void {
  globalListeners.add(notify);
  if (!globalRunning) {
    globalRunning = true;
    globalLastTick = performance.now();
    requestAnimationFrame(globalLoop);
  }
  return () => {
    globalListeners.delete(notify);
  };
}

/**
 * Returns the current global animation frame counter.
 * Updates ~20 times per second.  All components that use this hook
 * share the SAME global rAF loop — zero wasted frames.
 */
export function useGlobalFrame(): number {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const unsub = subscribeGlobal(() => {
      frameRef.current = globalFrame;
      setFrame(globalFrame);
    });
    return unsub;
  }, []);

  return frame;
}
