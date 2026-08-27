import type { RenderFrame } from '../render/renderFrame';
import { randomRange, type SeededRandom } from '../rng';
import { Sprite } from '../types';

/**
 * Fixed-capacity particle system.
 *
 * Particles are the single easiest way to blow a frame budget, so this is
 * built defensively:
 *   • capacity is pre-allocated and never grows — a burst past capacity
 *     drops particles rather than allocating;
 *   • the accessibility policy scales `budget` down (to zero for reduced
 *     motion) without any game code branching on the setting;
 *   • state lives in parallel typed arrays, not objects, so stepping 300
 *     particles is a tight numeric loop with no pointer chasing.
 *
 * Motion is deliberately simple — velocity, drag, gravity, fade. Anything
 * more expressive belongs in a game, not in the runtime.
 */
export type ParticlePreset = 'burst' | 'spark' | 'dust';

export interface ParticleBurst {
  x: number;
  y: number;
  count: number;
  preset?: ParticlePreset;
  r?: number;
  g?: number;
  b?: number;
  speedPxPerSec?: number;
  sizePx?: number;
  lifeMs?: number;
}

export interface ParticleSystem {
  readonly alive: number;
  readonly capacity: number;
  burst(spec: ParticleBurst): void;
  step(dtMs: number): void;
  /** Appends live particles to the frame. Called once per display frame. */
  writeTo(frame: RenderFrame): void;
  clear(): void;
}

export interface ParticleSystemOptions {
  capacity: number;
  rng: SeededRandom;
  /** 0..1 multiplier on every requested burst count. 0 = no particles. */
  budgetScale?: number;
}

const PRESETS: Record<ParticlePreset, { drag: number; gravity: number; sprite: number }> = {
  // Drag is per-second retention: 0.86 keeps 86% of speed each second.
  burst: { drag: 0.86, gravity: 0, sprite: Sprite.Glow },
  spark: { drag: 0.55, gravity: 620, sprite: Sprite.Disc },
  dust: { drag: 0.94, gravity: -40, sprite: Sprite.Glow },
};

export function createParticleSystem(options: ParticleSystemOptions): ParticleSystem {
  const { capacity, rng } = options;
  const budgetScale = options.budgetScale ?? 1;

  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const age = new Float32Array(capacity);
  const life = new Float32Array(capacity);
  const size = new Float32Array(capacity);
  const cr = new Float32Array(capacity);
  const cg = new Float32Array(capacity);
  const cb = new Float32Array(capacity);
  const drag = new Float32Array(capacity);
  const gravity = new Float32Array(capacity);
  const sprite = new Uint8Array(capacity);
  const live = new Uint8Array(capacity);

  let alive = 0;
  // Round-robin cursor: when full, new particles overwrite the oldest slot
  // scanned from here, which keeps a sustained emitter visually stable.
  let cursor = 0;

  return {
    get alive() { return alive; },
    capacity,

    burst(spec) {
      const preset = PRESETS[spec.preset ?? 'burst'];
      const n = Math.round((spec.count ?? 0) * budgetScale);
      if (n <= 0) return;

      const speed = spec.speedPxPerSec ?? 260;
      const baseSize = spec.sizePx ?? 7;
      const baseLife = spec.lifeMs ?? 620;

      for (let k = 0; k < n; k++) {
        let slot = -1;
        for (let scan = 0; scan < capacity; scan++) {
          const i = (cursor + scan) % capacity;
          if (!live[i]) { slot = i; break; }
        }
        if (slot === -1) return; // genuinely full — drop the rest
        cursor = (slot + 1) % capacity;

        const angle = randomRange(rng, 0, Math.PI * 2);
        const s = speed * randomRange(rng, 0.45, 1);

        x[slot] = spec.x;
        y[slot] = spec.y;
        vx[slot] = Math.cos(angle) * s;
        vy[slot] = Math.sin(angle) * s;
        age[slot] = 0;
        life[slot] = baseLife * randomRange(rng, 0.7, 1.15);
        size[slot] = baseSize * randomRange(rng, 0.65, 1.25);
        cr[slot] = spec.r ?? 1;
        cg[slot] = spec.g ?? 1;
        cb[slot] = spec.b ?? 1;
        drag[slot] = preset.drag;
        gravity[slot] = preset.gravity;
        sprite[slot] = preset.sprite;
        live[slot] = 1;
        alive++;
      }
    },

    step(dtMs) {
      if (alive === 0) return;
      const dt = dtMs / 1000;
      for (let i = 0; i < capacity; i++) {
        if (!live[i]) continue;
        age[i] += dtMs;
        if (age[i] >= life[i]) {
          live[i] = 0;
          alive--;
          continue;
        }
        const d = Math.pow(drag[i], dt);
        vx[i] *= d;
        vy[i] = vy[i] * d + gravity[i] * dt;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
      }
    },

    writeTo(frame) {
      if (alive === 0) return;
      for (let i = 0; i < capacity; i++) {
        if (!live[i]) continue;
        const node = frame.push();
        if (!node) return; // frame full — the frame reports the overflow
        const t = age[i] / life[i];
        node.x = x[i];
        node.y = y[i];
        node.rotation = 0;
        // Shrink and fade together; a particle that only fades reads as a
        // smudge, one that only shrinks reads as a hard pop.
        node.size = size[i] * (1 - t * 0.65);
        node.sprite = sprite[i] as RenderFrame['nodes'][number]['sprite'];
        node.r = cr[i];
        node.g = cg[i];
        node.b = cb[i];
        node.a = 1 - t * t;
      }
    },

    clear() {
      live.fill(0);
      alive = 0;
      cursor = 0;
    },
  };
}
