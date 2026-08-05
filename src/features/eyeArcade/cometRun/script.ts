import type { SeededRandom } from '@/engine/core/rng';
import { RUN } from './design';
import {
  spawnBarrier,
  spawnBoss,
  spawnDebris,
  spawnGate,
  spawnPickup,
  spawnScout,
  spawnTurret,
  type Store,
} from './spawn';
import {
  PICKUP_SHIELD,
  PICKUP_WEAPON,
  SLOT_HORIZONTAL,
  SLOT_VERTICAL,
  banner,
  say,
  type RunBeat,
  type WorldState,
} from './world';

/**
 * The 45-second vertical slice, written down.
 *
 * A scripted timeline rather than a random spawner, because this slice has a
 * *teaching order*: steer, then dodge, then shoot, then survive, then spend.
 * A random corridor would sometimes open with the turret and sometimes never
 * show a pickup, and the one thing this build has to prove is that the whole
 * loop is legible on a first play.
 *
 * Times are ms from launch. Objects spawn at the horizon and take roughly
 * `farZ / speed` ≈ 4–5s to arrive, so each entry fires several seconds
 * *before* the beat the brief describes — the offsets below are already
 * corrected for that flight time.
 */

export interface ScriptEvent {
  atMs: number;
  /** Beat this event belongs to, for the HUD label and metrics stages. */
  beat?: RunBeat;
  run: (world: WorldState, store: Store, rng: SeededRandom) => void;
}

export const SLICE: ScriptEvent[] = [
  // ── 0–5s · launch ───────────────────────────────────────────────────────
  {
    atMs: 0,
    beat: 'launch',
    run: world => {
      say(world, 'MIRA', 'Astra-7, the relay is collapsing. Punch through and restore the checkpoint.', 5200);
      banner(world, 'DRAG TO FLY', 2600);
    },
  },
  {
    atMs: 2600,
    run: world => {
      world.targetSpeed = RUN.baseSpeed;
    },
  },

  // ── 5–15s · debris, barriers, one gate ──────────────────────────────────
  // Rocks first and sparse, so the first thing the player learns is that the
  // ship goes exactly where their thumb goes.
  { atMs: 5000, beat: 'debris', run: (w, s, r) => spawnDebris(w, s, r, -0.55) },
  { atMs: 6100, run: (w, s, r) => spawnDebris(w, s, r, 0.5) },
  { atMs: 6900, run: (w, s, r) => spawnDebris(w, s, r, -0.15) },
  { atMs: 7400, run: (w, s, r) => spawnDebris(w, s, r, 0.72) },
  { atMs: 8200, run: w => say(w, 'MIRA', 'Relay debris ahead. Thread it.', 2800) },
  { atMs: 8400, run: (w, s, r) => spawnDebris(w, s, r, -0.75) },

  // Two barriers asking two different questions: dodge sideways, then
  // dodge vertically.
  { atMs: 9000, run: (w, s) => spawnBarrier(w, s, SLOT_VERTICAL, -0.5) },
  { atMs: 11_200, run: (w, s) => spawnBarrier(w, s, SLOT_HORIZONTAL, 0.55) },

  // The gate is the reward for good flying, and the first thing that
  // *gives* rather than takes.
  { atMs: 13_000, run: (w, s) => spawnGate(w, s, 0.3, -0.2) },

  // ── 15–28s · combat ─────────────────────────────────────────────────────
  {
    atMs: 14_200,
    beat: 'combat',
    run: w => {
      say(w, 'MIRA', 'Hostiles. Weapons are on auto — keep them in front of you.', 3400);
      w.targetSpeed = RUN.baseSpeed * 1.12;
    },
  },
  { atMs: 14_400, run: (w, s) => spawnScout(w, s, -0.6, -0.3) },
  { atMs: 16_600, run: (w, s) => spawnScout(w, s, 0.65, 0.15) },
  { atMs: 19_400, run: (w, s) => spawnScout(w, s, 0.1, -0.55) },
  { atMs: 20_600, run: (w, s, r) => spawnDebris(w, s, r, 0.35) },
  { atMs: 22_000, run: (w, s) => spawnPickup(w, s, PICKUP_WEAPON, 0, 0) },
  { atMs: 24_400, run: (w, s, r) => spawnDebris(w, s, r, -0.62) },

  // ── 28–36s · beam turret ────────────────────────────────────────────────
  {
    atMs: 25_600,
    beat: 'turret',
    run: w => {
      say(w, 'MIRA', 'Beam turret on the wall. Find the gap.', 3200);
      w.targetSpeed = RUN.baseSpeed * 1.3;
    },
  },
  { atMs: 26_000, run: (w, s) => spawnTurret(w, s, 1) },
  { atMs: 30_000, run: (w, s) => spawnPickup(w, s, PICKUP_SHIELD, w.view.halfWidth * 0.3, 0) },
  { atMs: 31_600, run: (w, s) => spawnGate(w, s, -0.35, 0.25) },

  // ── 36–45s · Helix Interceptor ──────────────────────────────────────────
  {
    atMs: 32_400,
    beat: 'boss',
    run: (w, s) => {
      say(w, 'MIRA', 'Helix Interceptor inbound. Fill your energy and hit it hard.', 3600);
      banner(w, 'HELIX INTERCEPTOR', 2600);
      w.targetSpeed = RUN.maxSpeed;
      w.bossId = spawnBoss(w, s);
    },
  },
];

/** Fires every scripted event whose time has come. */
export function advanceScript(world: WorldState, store: Store, rng: SeededRandom): void {
  while (world.scriptCursor < SLICE.length && SLICE[world.scriptCursor].atMs <= world.elapsedMs) {
    const event = SLICE[world.scriptCursor++];
    if (event.beat && event.beat !== world.beat) {
      world.beat = event.beat;
      world.beatMs = 0;
    }
    event.run(world, store, rng);
  }
}
