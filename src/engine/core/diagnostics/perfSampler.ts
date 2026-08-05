/**
 * Rolling frame-time statistics — the instrument the Phase 1 exit gate is
 * measured with.
 *
 * Average FPS hides everything that matters. A run that averages 58fps but
 * drops one 140ms frame per second feels broken, and that is precisely the
 * failure mode a JS-thread game loop on a low-end Android device produces.
 * So this reports the **5th-percentile FPS** and the **worst frame**
 * alongside the median, and counts long frames explicitly.
 *
 * Samples live in a fixed ring buffer; the sampler itself allocates nothing
 * per frame, because a diagnostic that perturbs what it measures is useless.
 */
export interface PerfSnapshot {
  fpsMedian: number;
  fpsP5: number;
  worstFrameMs: number;
  /** Frames slower than 32ms (i.e. a dropped frame at 60Hz). */
  longFrames: number;
  /** Frames slower than 100ms — the gate forbids these after warmup. */
  stallFrames: number;
  avgStepsPerFrame: number;
  samples: number;
  entityCount: number;
  particleCount: number;
  nodeCount: number;
  overflow: number;
}

export interface PerfSampler {
  frame(frameDeltaMs: number, stepsRun: number): void;
  counts(entities: number, particles: number, nodes: number, overflow: number): void;
  snapshot(): PerfSnapshot;
  reset(): void;
}

export function createPerfSampler(window = 180): PerfSampler {
  const frames = new Float32Array(window);
  // Scratch buffer for percentiles, sorted in place — reused so `snapshot()`
  // stays allocation-free even when polled every second.
  const scratch = new Float32Array(window);

  let index = 0;
  let filled = 0;
  let longFrames = 0;
  let stallFrames = 0;
  let stepsSum = 0;
  let stepFrames = 0;
  let entityCount = 0;
  let particleCount = 0;
  let nodeCount = 0;
  let overflow = 0;

  const percentileFps = (sorted: Float32Array, n: number, p: number): number => {
    if (n === 0) return 0;
    // Slow frames sort last, so the p-th percentile of *frame time* is the
    // (1-p)-th percentile of FPS. Index from the slow end deliberately.
    const i = Math.min(n - 1, Math.max(0, Math.floor((1 - p) * (n - 1))));
    const ms = sorted[i];
    return ms > 0 ? Math.round(1000 / ms) : 0;
  };

  return {
    frame(frameDeltaMs, stepsRun) {
      frames[index] = frameDeltaMs;
      index = (index + 1) % window;
      if (filled < window) filled++;
      if (frameDeltaMs > 32) longFrames++;
      if (frameDeltaMs > 100) stallFrames++;
      stepsSum += stepsRun;
      stepFrames++;
    },

    counts(entities, particles, nodes, over) {
      entityCount = entities;
      particleCount = particles;
      nodeCount = nodes;
      overflow = over;
    },

    snapshot() {
      const n = filled;
      for (let i = 0; i < n; i++) scratch[i] = frames[i];
      // Insertion sort: n is small (≤180) and already near-sorted in
      // practice, and it avoids the closure allocation of Array#sort.
      for (let i = 1; i < n; i++) {
        const v = scratch[i];
        let j = i - 1;
        while (j >= 0 && scratch[j] > v) {
          scratch[j + 1] = scratch[j];
          j--;
        }
        scratch[j + 1] = v;
      }

      let worst = 0;
      for (let i = 0; i < n; i++) if (scratch[i] > worst) worst = scratch[i];

      return {
        fpsMedian: percentileFps(scratch, n, 0.5),
        fpsP5: percentileFps(scratch, n, 0.05),
        worstFrameMs: Math.round(worst * 10) / 10,
        longFrames,
        stallFrames,
        avgStepsPerFrame: stepFrames === 0 ? 0 : Math.round((stepsSum / stepFrames) * 100) / 100,
        samples: n,
        entityCount,
        particleCount,
        nodeCount,
        overflow,
      };
    },

    reset() {
      frames.fill(0);
      index = 0;
      filled = 0;
      longFrames = 0;
      stallFrames = 0;
      stepsSum = 0;
      stepFrames = 0;
      entityCount = 0;
      particleCount = 0;
      nodeCount = 0;
      overflow = 0;
    },
  };
}
