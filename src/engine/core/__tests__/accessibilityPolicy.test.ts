import {
  createAccessibilityPolicy,
  type AccessibilitySettings,
} from '../a11y/accessibilityPolicy';
import { createCameraShake } from '../fx/cameraShake';
import { createParticleSystem } from '../fx/particles';
import { createMetricsRecorder, type ScoreRules } from '../metrics/metricsRecorder';
import { createSeededRandom } from '../rng';

const rules: ScoreRules = {
  pointsForHit: (reactionMs, comboBefore, difficulty01) =>
    (120 + Math.max(0, 600 - reactionMs) / 8 + difficulty01 * 40) * (1 + comboBefore * 0.08),
  penaltyForMiss: reason => (reason === 'decoy' ? 80 : 40),
  comboMultiplier: combo => 1 + combo * 0.08,
};

const ALL_COMBINATIONS: AccessibilitySettings[] = [false, true].flatMap(largeTarget =>
  [false, true].flatMap(highContrast =>
    [false, true].map(reducedMotion => ({ largeTarget, highContrast, reducedMotion })),
  ),
);

/** A fixed script of gameplay outcomes — the same run, every time. */
const SCRIPT: ({ kind: 'hit'; reactionMs: number } | { kind: 'miss'; reason: 'decoy' | 'timeout' })[] = [
  { kind: 'hit', reactionMs: 412 },
  { kind: 'hit', reactionMs: 288 },
  { kind: 'miss', reason: 'decoy' },
  { kind: 'hit', reactionMs: 195 },
  { kind: 'hit', reactionMs: 640 },
  { kind: 'miss', reason: 'timeout' },
  { kind: 'hit', reactionMs: 233 },
];

describe('accessibility policy — scoring invariance', () => {
  it('produces an identical score for the same outcomes under every setting', () => {
    const snapshots = ALL_COMBINATIONS.map(settings => {
      // The policy is constructed and available, exactly as a real game would
      // have it — the guarantee is that it is structurally unable to reach
      // the recorder, not that games remember to avoid it.
      const policy = createAccessibilityPolicy(settings);
      expect(policy.settings).toEqual(settings);

      const metrics = createMetricsRecorder(rules);
      metrics.beginStage('wave-1');
      for (const event of SCRIPT) {
        metrics.tick(100);
        if (event.kind === 'hit') metrics.hit(event.reactionMs, 0.5);
        else metrics.miss(event.reason);
      }
      metrics.endStage('complete');
      return metrics.snapshot();
    });

    const reference = snapshots[0];
    for (const snapshot of snapshots) {
      expect(snapshot).toEqual(reference);
    }
    // Guard against the whole test passing vacuously on an empty session.
    expect(reference.score).toBeGreaterThan(0);
    expect(reference.hits).toBe(5);
    expect(reference.misses).toBe(2);
  });
});

describe('accessibility policy — presentation effects', () => {
  it('enlarges targets and tap forgiveness under largeTarget', () => {
    const off = createAccessibilityPolicy({ largeTarget: false, highContrast: false, reducedMotion: false });
    const on = createAccessibilityPolicy({ largeTarget: true, highContrast: false, reducedMotion: false });
    expect(on.targetRadius(20)).toBeGreaterThan(off.targetRadius(20));
    expect(on.hitSlopPx()).toBeGreaterThan(off.hitSlopPx());
  });

  it('boosts contrast only when asked', () => {
    const off = createAccessibilityPolicy({ largeTarget: false, highContrast: false, reducedMotion: false });
    const on = createAccessibilityPolicy({ largeTarget: false, highContrast: true, reducedMotion: false });
    expect(off.contrastBoost()).toBe(1);
    expect(on.contrastBoost()).toBeGreaterThan(1);
  });

  it('reducedMotion silences shake and particles entirely', () => {
    const policy = createAccessibilityPolicy({ largeTarget: false, highContrast: false, reducedMotion: true });
    expect(policy.shakeScale()).toBe(0);
    expect(policy.particleBudget()).toBe(0);

    const shake = createCameraShake({ scale: policy.shakeScale() });
    shake.kick(1, 400);
    shake.step(16);
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
    expect(shake.active).toBe(false);

    const particles = createParticleSystem({
      capacity: 64,
      rng: createSeededRandom(1),
      budgetScale: policy.particleBudget(),
    });
    particles.burst({ x: 0, y: 0, count: 40 });
    expect(particles.alive).toBe(0);
  });

  it('shortens transitions but is not asked to shorten reaction windows', () => {
    const policy = createAccessibilityPolicy({ largeTarget: false, highContrast: false, reducedMotion: true });
    expect(policy.transitionMs(1000)).toBeLessThan(1000);
    expect(policy.popupMotionScale()).toBeLessThan(1);
    expect(policy.popupMotionScale()).toBeGreaterThan(0);
  });
});
