import { DAMAGE, ENEMY, REWARD, RUN, SHIP, WEAPON } from '../design';
import { spawnBarrier, spawnBolt, spawnDebris, spawnGate, spawnPickup, spawnScout } from '../spawn';
import {
  PICKUP_SHIELD,
  PICKUP_WEAPON,
  SLOT_VERTICAL,
  type ObjData,
} from '../world';
import type { Entity } from '@/engine/core/types';
import {
  createHarness,
  flySlice,
  lift,
  pressAt,
  steerTo,
  step,
  stepUntil,
  tapSpecial,
} from './harness';
import type { CometRunRuntime } from '../runtime';

function count(runtime: CometRunRuntime, kind: string): number {
  const buffer: Entity<ObjData>[] = [];
  runtime.deps.store.queryInto(kind, buffer);
  return buffer.length;
}

function first(runtime: CometRunRuntime, kind: string): Entity<ObjData> | undefined {
  const buffer: Entity<ObjData>[] = [];
  runtime.deps.store.queryInto(kind, buffer);
  return buffer[0];
}

describe('Comet Run · the 45-second slice', () => {
  it('walks every scripted beat from launch to the relay checkpoint', () => {
    const runtime = createHarness();
    const seen: string[] = [];

    expect(runtime.world.beat).toBe('launch');
    seen.push('launch');

    // 0–5s · the ship flies itself into frame before control is handed over.
    expect(runtime.world.ship.launchMs).toBeGreaterThanOrEqual(0);
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'the launch to finish');
    expect(runtime.world.comms.text).toContain('relay is collapsing');

    for (const beat of ['debris', 'combat', 'turret', 'boss'] as const) {
      flySlice(runtime, { until: r => r.world.beat === beat });
      expect(runtime.world.beat).toBe(beat);
      seen.push(beat);
    }

    // 36–45s · kill the interceptor, then fly the relay ring.
    flySlice(runtime, { until: r => r.world.beat === 'checkpoint', steps: 6000 });
    seen.push('checkpoint');
    expect(runtime.world.bossId).toBe(-1);

    flySlice(runtime, { until: r => r.world.checkpointDone, steps: 6000 });
    expect(runtime.world.checkpointDone).toBe(true);

    stepUntil(runtime, r => r.phase() === 'ended', 'the run to end', 600);
    expect(runtime.result('id')!.endReason).toBe('completed');
    expect(seen).toEqual(['launch', 'debris', 'combat', 'turret', 'boss', 'checkpoint']);
  });

  it('runs the scripted content inside the 45-second budget', () => {
    const runtime = createHarness();
    flySlice(runtime, { until: r => r.world.checkpointDone, steps: 6000 });
    // The brief asks for a 45s slice; the checkpoint must land near it, not
    // three minutes later.
    expect(runtime.world.elapsedMs).toBeGreaterThan(30_000);
    expect(runtime.world.elapsedMs).toBeLessThan(60_000);
  });

  it('is survivable when flown competently', () => {
    const runtime = createHarness();
    flySlice(runtime, { until: r => r.world.checkpointDone, steps: 6000 });
    expect(runtime.world.shield).toBeGreaterThan(0);
    expect(runtime.metricsSnapshot().score).toBeGreaterThan(1000);
  });

  it('reports a result only once the run has ended', () => {
    const runtime = createHarness();
    expect(runtime.result('id-1')).toBeNull();
    runtime.quit();
    const result = runtime.result('id-1');
    expect(result!.gameId).toBe('comet-run');
    expect(result!.endReason).toBe('quit');
    expect(result!.seed).toBe(0xc0ffee);
  });
});

describe('Comet Run · steering', () => {
  it('flies the ship to the finger, offset above it so a thumb never covers it', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    pressAt(runtime, 300, -120);
    step(runtime, 40);

    expect(runtime.world.ship.x).toBeCloseTo(300, 0);
    expect(runtime.world.ship.y).toBeCloseTo(-120, 0);
    // The lift is real: the touch point is well below the hull.
    expect(SHIP.fingerLiftPx).toBeGreaterThan(40);
  });

  it('keeps the ship inside the corridor', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    const view = runtime.world.view;

    steerTo(runtime, view.halfWidth * 4, view.halfHeight * 4);
    step(runtime, 60);

    expect(runtime.world.ship.x).toBeLessThanOrEqual(view.halfWidth + 0.5);
    expect(runtime.world.ship.y).toBeLessThanOrEqual(view.halfHeight + 0.5);
  });

  it('holds its heading when the finger lifts', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    pressAt(runtime, -220, 60);
    step(runtime, 40);
    lift(runtime);
    step(runtime, 30);

    expect(runtime.world.ship.x).toBeCloseTo(-220, 0);
  });

  it('banks into a turn', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    pressAt(runtime, -400, 0);
    step(runtime, 20);
    steerTo(runtime, 400, 0);
    step(runtime, 3);

    expect(runtime.world.ship.bank).toBeGreaterThan(0.02);
  });
});

describe('Comet Run · weapons', () => {
  it('auto-fires without any input at all', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    step(runtime, 20);
    expect(count(runtime, 'bolt')).toBeGreaterThan(0);
  });

  it('destroys a scout that flies into its fire, and banks its value', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    spawnScout(runtime.world, runtime.deps.store, 0, 0);
    const scout = first(runtime, 'scout')!;
    // Pulled in close so the kill lands well before the scripted corridor
    // starts spawning anything that could also score.
    scout.data!.z = 2600;
    scout.data!.prevZ = 2600;
    steerTo(runtime, scout.x, scout.y);

    const before = runtime.metricsSnapshot().score;
    stepUntil(runtime, r => count(r, 'scout') === 0, 'the scout to die', 900);

    // A score delta is what proves it was gunfire: ramming the hull kills
    // the scout too, but awards nothing. (The hull may well have taken a
    // bullet in the meantime — parking directly in front of a shooting drone
    // is not a safe place to be, and the sim is right to say so.)
    expect(runtime.metricsSnapshot().hits).toBeGreaterThan(0);
    expect(runtime.metricsSnapshot().score - before).toBeGreaterThanOrEqual(REWARD.scoutScore);
  });

  it('takes several bolts to kill a scout, so kills are earned', () => {
    expect(ENEMY.scoutHp).toBeGreaterThan(WEAPON.damage);
  });

  it('fires three bolts at once after the weapon pickup', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    runtime.world.ship.upgradeMs = WEAPON.upgradeMs;
    runtime.world.ship.fireMs = 0;
    const before = count(runtime, 'bolt');
    step(runtime, 1);
    expect(count(runtime, 'bolt') - before).toBe(3);
  });
});

describe('Comet Run · hazards cost hull', () => {
  it('loses shield on debris', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    spawnDebris(runtime.world, runtime.deps.store, runtime.deps.rng, 0);

    const rock = first(runtime, 'debris')!;
    stepUntil(
      runtime,
      r => {
        steerTo(r, rock.x, rock.y);
        return r.world.shield < RUN.startShield;
      },
      'the rock to connect',
      1200,
    );
    expect(runtime.world.shield).toBe(RUN.startShield - DAMAGE.debris);
    expect(runtime.metricsSnapshot().misses).toBe(1);
  });

  it('passes cleanly through a barrier slot and rewards it', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    spawnBarrier(runtime.world, runtime.deps.store, SLOT_VERTICAL, 0);

    const barrier = first(runtime, 'barrier')!;
    stepUntil(
      runtime,
      r => {
        steerTo(r, barrier.x, 0);
        return count(r, 'barrier') === 0;
      },
      'the barrier to pass',
      1200,
    );

    expect(runtime.world.shield).toBe(RUN.startShield);
    expect(runtime.metricsSnapshot().hits).toBeGreaterThan(0);
  });

  it('loses shield on the solid part of a barrier', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    spawnBarrier(runtime.world, runtime.deps.store, SLOT_VERTICAL, 0);

    stepUntil(
      runtime,
      r => {
        steerTo(r, r.world.view.halfWidth, 0);
        return count(r, 'barrier') === 0;
      },
      'the barrier to pass',
      1200,
    );
    expect(runtime.world.shield).toBe(RUN.startShield - DAMAGE.barrier);
  });

  it('gives invulnerability frames so one hazard is not three hits', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    runtime.world.shield = 100;
    spawnBolt(runtime.deps.store, 'ebolt', 0, 0, 300, -4000);
    spawnBolt(runtime.deps.store, 'ebolt', 0, 0, 320, -4000);
    steerTo(runtime, 0, 0);
    step(runtime, 40);

    expect(runtime.world.shield).toBe(100 - DAMAGE.enemyBullet);
    expect(runtime.world.ship.iframesMs).toBeGreaterThan(0);
  });

  it('ends the run when the hull is gone', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    runtime.world.shield = DAMAGE.debris;

    spawnDebris(runtime.world, runtime.deps.store, runtime.deps.rng, 0);
    const rock = first(runtime, 'debris')!;
    stepUntil(
      runtime,
      r => {
        steerTo(r, rock.x, rock.y);
        return r.phase() === 'ended';
      },
      'the hull to fail',
      1500,
    );

    expect(runtime.world.beat).toBe('failed');
    expect(runtime.result('id')!.endReason).toBe('failed');
  });
});

describe('Comet Run · pickups and the special', () => {
  it('collects energy, hull and weapon pickups with distinct effects', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    runtime.world.shield = 40;

    for (const [type, check] of [
      [PICKUP_SHIELD, () => expect(runtime.world.shield).toBe(40 + REWARD.shieldPickup)],
      [PICKUP_WEAPON, () => expect(runtime.world.ship.upgradeMs).toBeGreaterThan(0)],
    ] as const) {
      spawnPickup(runtime.world, runtime.deps.store, type, 0, 0, 800);
      steerTo(runtime, 0, 0);
      stepUntil(runtime, r => count(r, 'pickup') === 0, `pickup ${type}`, 600);
      check();
    }
  });

  it('fills energy from gates and kills, then spends it on the special', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');

    spawnGate(runtime.world, runtime.deps.store, 0, 0);
    steerTo(runtime, 0, 0);
    stepUntil(runtime, r => count(r, 'gate') === 0, 'the gate', 1200);
    expect(runtime.world.energy).toBe(REWARD.energyPerGate);

    runtime.world.energy = RUN.maxEnergy;
    expect(runtime.hud().specialReady).toBe(true);

    spawnScout(runtime.world, runtime.deps.store, 0, 0);
    const before = count(runtime, 'scout');
    tapSpecial(runtime);

    expect(runtime.world.energy).toBe(0);
    expect(runtime.world.specialMs).toBeGreaterThan(0);
    expect(count(runtime, 'scout')).toBeLessThan(before);
  });

  it('ignores the special when there is not enough energy', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    runtime.world.energy = 40;

    tapSpecial(runtime);
    expect(runtime.world.energy).toBe(40);
    expect(runtime.world.specialMs).toBe(0);
  });

  it('never lets a tap steer the ship', () => {
    const runtime = createHarness();
    stepUntil(runtime, r => r.world.ship.launchMs < 0, 'launch');
    pressAt(runtime, -300, 0);
    step(runtime, 40);

    const before = runtime.world.ship.targetX;
    tapSpecial(runtime);
    step(runtime, 5);
    expect(runtime.world.ship.targetX).toBeCloseTo(before, 3);
  });
});

describe('Comet Run · the Helix Interceptor', () => {
  it('holds station, cycles two attack patterns and dies to sustained fire', () => {
    const runtime = createHarness();
    flySlice(runtime, { until: r => r.world.beat === 'boss', steps: 4000 });

    const boss = first(runtime, 'boss')!;
    stepUntil(runtime, () => (boss.data?.z ?? 1e9) <= 1600, 'the boss to close', 1200);

    const patterns = new Set<number>();
    for (let i = 0; i < 600; i++) {
      patterns.add(boss.data!.variant);
      step(runtime);
      if (!boss.active) break;
    }
    expect(patterns.size).toBe(2);

    flySlice(runtime, { until: r => r.world.beat === 'checkpoint', steps: 6000 });
    expect(runtime.world.bossId).toBe(-1);
    expect(runtime.metricsSnapshot().score).toBeGreaterThan(REWARD.bossScore);
  });

  it('spawns a relay checkpoint gate once the interceptor is down', () => {
    const runtime = createHarness();
    flySlice(runtime, { until: r => r.world.beat === 'checkpoint', steps: 6000 });

    const gate = first(runtime, 'gate');
    expect(gate?.data?.variant).toBe(1);
  });
});
