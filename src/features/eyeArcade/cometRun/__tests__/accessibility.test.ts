import type { AccessibilitySettings } from '@/engine/core/a11y/accessibilityPolicy';
import { COMET_RUN_SCORE, SCORE_UNIT } from '../scoring';
import { createHarness, flySlice, step, stepUntil } from './harness';

/**
 * The contract, restated: **no accessibility setting may move a score.**
 *
 * `accessibilityPolicy.ts` promises it and the engine enforces it
 * structurally by never handing the policy to the `MetricsRecorder`. This
 * spec closes the remaining hole — that a *game* could still leak the policy
 * into gameplay by scaling something that decides an outcome rather than
 * something that decides comfort.
 *
 * Comet Run is free flight: there are no tap targets to enlarge and no
 * reaction windows to stretch, so the policy touches contrast, particles,
 * shake and popup travel, and the pickup collect radius — nothing that can
 * change whether a hazard connects. The proof is below: fly one identical
 * input stream under every combination and compare the whole snapshot.
 */

const COMBINATIONS: AccessibilitySettings[] = [
  { largeTarget: false, highContrast: false, reducedMotion: false },
  { largeTarget: true, highContrast: false, reducedMotion: false },
  { largeTarget: false, highContrast: true, reducedMotion: false },
  { largeTarget: false, highContrast: false, reducedMotion: true },
  { largeTarget: true, highContrast: true, reducedMotion: true },
];

function flyIdentically(settings: AccessibilitySettings) {
  const runtime = createHarness(settings);
  flySlice(runtime, { until: r => r.world.checkpointDone, steps: 6000 });
  stepUntil(runtime, r => r.phase() === 'ended', 'the run to end', 600);

  const snapshot = runtime.metricsSnapshot();
  return {
    score: snapshot.score,
    hits: snapshot.hits,
    misses: snapshot.misses,
    bestCombo: snapshot.bestCombo,
    accuracy01: snapshot.accuracy01,
    shield: runtime.world.shield,
    distance: Math.round(runtime.world.distance),
    endReason: runtime.result('x')!.endReason,
  };
}

describe('Comet Run · accessibility never reaches scoring', () => {
  it('flies one identical run to the same result under every setting', () => {
    const baseline = flyIdentically(COMBINATIONS[0]);
    expect(baseline.hits).toBeGreaterThan(5);
    expect(baseline.endReason).toBe('completed');

    for (const settings of COMBINATIONS.slice(1)) {
      expect(flyIdentically(settings)).toEqual(baseline);
    }
  });

  it('keeps the corridor and the ship identical under reduced motion', () => {
    const plain = createHarness({ largeTarget: false, highContrast: false, reducedMotion: false });
    const reduced = createHarness({ largeTarget: false, highContrast: false, reducedMotion: true });

    step(plain, 600);
    step(reduced, 600);

    // Reduced motion stills decorative oscillation in the *draw* pass only.
    // Corridor speed, ship handling and every hitbox are untouched.
    expect(reduced.world.speed).toBeCloseTo(plain.world.speed, 6);
    expect(reduced.world.distance).toBeCloseTo(plain.world.distance, 6);
    expect(reduced.world.view.halfWidth).toBeCloseTo(plain.world.view.halfWidth, 6);
  });

  it('drops particles for reduced motion without dropping anything else', () => {
    const reduced = createHarness({ largeTarget: false, highContrast: false, reducedMotion: true });
    flySlice(reduced, { until: r => r.world.beat === 'combat', steps: 3000 });
    step(reduced, 120);

    expect(reduced.deps.particles.alive).toBe(0);
    // The corridor is still full of objects to see and shoot.
    expect(reduced.deps.store.count).toBeGreaterThan(0);
  });
});

describe('Comet Run · score curve', () => {
  it('pays an event its face value before combo', () => {
    expect(COMET_RUN_SCORE.pointsForHit(0, 0, 200 / SCORE_UNIT)).toBeCloseTo(200, 6);
    expect(COMET_RUN_SCORE.pointsForHit(0, 0, 1500 / SCORE_UNIT)).toBeCloseTo(1500, 6);
  });

  it('multiplies by combo up to a cap', () => {
    expect(COMET_RUN_SCORE.comboMultiplier(0)).toBe(1);
    expect(COMET_RUN_SCORE.comboMultiplier(6)).toBeGreaterThan(1);
    expect(COMET_RUN_SCORE.comboMultiplier(60)).toBe(COMET_RUN_SCORE.comboMultiplier(12));
  });

  it('punishes a lost hull harder than a missed opportunity', () => {
    expect(COMET_RUN_SCORE.penaltyForMiss('timeout')).toBeGreaterThan(
      COMET_RUN_SCORE.penaltyForMiss('wrong-target'),
    );
  });
});
