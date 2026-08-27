import { clamp01 } from '../types';

/**
 * Screen shake with a decaying envelope.
 *
 * Deterministic: the offset is a product of sine waves at incommensurate
 * frequencies rather than random jitter, so a replayed session shakes
 * identically and the benchmark's frame timings stay comparable run to run.
 *
 * `reducedMotion` scales the whole effect to zero. Every effect in `fx/`
 * takes that scale rather than checking a global, so accessibility is a
 * value passed in, never a hidden dependency.
 */
export interface CameraShake {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly active: boolean;

  /** `intensity01` 0..1 maps to `maxAmplitudePx`. Stacking kicks takes the
   *  stronger of the two rather than summing — three simultaneous hits
   *  should not throw the camera off-screen. */
  kick(intensity01: number, durationMs: number): void;
  step(dtMs: number): void;
  reset(): void;
}

export interface CameraShakeOptions {
  maxAmplitudePx?: number;
  /** 0 disables shake entirely (reduced motion). */
  scale?: number;
}

export function createCameraShake(options: CameraShakeOptions = {}): CameraShake {
  const maxAmplitude = options.maxAmplitudePx ?? 14;
  const scale = options.scale ?? 1;

  let amplitude = 0;
  let remainingMs = 0;
  let durationMs = 0;
  let tMs = 0;
  let offsetX = 0;
  let offsetY = 0;

  return {
    get offsetX() { return offsetX; },
    get offsetY() { return offsetY; },
    get active() { return remainingMs > 0; },

    kick(intensity01, kickDurationMs) {
      if (scale <= 0 || kickDurationMs <= 0) return;
      const next = clamp01(intensity01) * maxAmplitude * scale;
      if (next >= amplitude) {
        amplitude = next;
        durationMs = kickDurationMs;
        remainingMs = kickDurationMs;
      } else if (kickDurationMs > remainingMs) {
        remainingMs = kickDurationMs;
        durationMs = Math.max(durationMs, kickDurationMs);
      }
    },

    step(dtMs) {
      if (remainingMs <= 0) {
        offsetX = 0;
        offsetY = 0;
        return;
      }
      remainingMs = Math.max(0, remainingMs - dtMs);
      tMs += dtMs;

      // Linear decay reads as a sharp "impact then settle"; an exponential
      // tail lingers and makes rapid hits feel mushy.
      const envelope = durationMs > 0 ? remainingMs / durationMs : 0;
      const a = amplitude * envelope;

      offsetX = Math.sin(tMs * 0.061) * a;
      offsetY = Math.cos(tMs * 0.083) * a;

      if (remainingMs === 0) {
        amplitude = 0;
        offsetX = 0;
        offsetY = 0;
      }
    },

    reset() {
      amplitude = 0;
      remainingMs = 0;
      durationMs = 0;
      tMs = 0;
      offsetX = 0;
      offsetY = 0;
    },
  };
}
