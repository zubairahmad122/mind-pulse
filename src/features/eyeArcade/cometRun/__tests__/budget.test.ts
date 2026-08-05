import { NODE_CAPACITY } from '../design';
import type { CometRunRuntime } from '../runtime';
import { createHarness, flySlice, setAfterStep, step } from './harness';

/**
 * The node budget, verified by flying rather than by counting comments.
 *
 * `frame.overflow` is the number of draw nodes silently dropped because the
 * frame was full — which on a device looks like the corridor losing a strut
 * or an explosion half-appearing for one frame: invisible in review,
 * obvious in a recording. Asserting it is zero across a full played slice is
 * the only way to know the budget in `design.ts` is a measurement rather
 * than a hope.
 *
 * The draw pass is pure TypeScript against a `RenderFrame`, so this runs in
 * Node with no Skia anywhere near it.
 */

interface BudgetReport {
  peakNodes: number;
  overflow: number;
  frames: number;
}

function drawInto(report: BudgetReport) {
  return (runtime: CometRunRuntime) => {
    const frame = runtime.draw(0.5);
    report.peakNodes = Math.max(report.peakNodes, frame.nodeCount);
    report.overflow += frame.overflow;
    report.frames++;
  };
}

afterEach(() => setAfterStep(null));

describe('Comet Run · frame budget', () => {
  it('never overflows the render frame across a full slice', () => {
    const runtime = createHarness();
    const report: BudgetReport = { peakNodes: 0, overflow: 0, frames: 0 };
    setAfterStep(drawInto(report));

    // Every frame of a complete run, including the two worst: the boss
    // fight (a full corridor, bullet spray, beam wall and debris at once)
    // and the special attack firing over the top of it.
    flySlice(runtime, { until: r => r.world.checkpointDone, steps: 6000 });
    step(runtime, 120);

    expect(report.frames).toBeGreaterThan(1800);
    expect(report.overflow).toBe(0);
    expect(report.peakNodes).toBeLessThanOrEqual(NODE_CAPACITY);
    // Sanity floor: an empty scene would pass every assertion above while
    // meaning the draw pass had silently stopped emitting.
    expect(report.peakNodes).toBeGreaterThan(150);
  });

  it('draws a complete scene with high contrast and reduced motion on', () => {
    const runtime = createHarness({
      largeTarget: false,
      highContrast: true,
      reducedMotion: true,
    });
    const report: BudgetReport = { peakNodes: 0, overflow: 0, frames: 0 };
    setAfterStep(drawInto(report));

    flySlice(runtime, { until: r => r.world.beat === 'boss', steps: 4000 });
    step(runtime, 300);

    expect(report.overflow).toBe(0);
    expect(report.peakNodes).toBeGreaterThan(150);

    const frame = runtime.draw(0.5);
    let maxChannel = 0;
    for (let i = 0; i < frame.nodeCount; i++) {
      maxChannel = Math.max(maxChannel, frame.nodes[i].r, frame.nodes[i].g, frame.nodes[i].b);
    }
    // High contrast pushes colour toward saturation but must never overflow
    // the 0..1 channel range the packer writes.
    expect(maxChannel).toBeLessThanOrEqual(1);
  });

  it('keeps the entity pool inside its capacity', () => {
    const runtime = createHarness();
    let peak = 0;
    setAfterStep(r => {
      peak = Math.max(peak, r.deps.store.count);
    });

    flySlice(runtime, { until: r => r.world.checkpointDone, steps: 6000 });
    // A pool that ever fills starts silently dropping spawns, which shows up
    // as the corridor mysteriously thinning out under load.
    expect(peak).toBeLessThan(runtime.deps.store.capacity);
  });
});
