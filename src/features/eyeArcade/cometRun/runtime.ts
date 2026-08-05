import {
  createAccessibilityPolicy,
  DEFAULT_ACCESSIBILITY,
  type AccessibilitySettings,
} from '@/engine/core/a11y/accessibilityPolicy';
import { createEntityStore } from '@/engine/core/entities/entityStore';
import { createCameraShake } from '@/engine/core/fx/cameraShake';
import { createParticleSystem } from '@/engine/core/fx/particles';
import { createPopupSystem } from '@/engine/core/fx/popups';
import { createInputManager, type PointerPhase } from '@/engine/core/input/inputManager';
import {
  createRuntimeLifecycle,
  type PauseReason,
  type RuntimePhase,
} from '@/engine/core/lifecycle/runtimeLifecycle';
import {
  createMetricsRecorder,
  starRating,
  type MetricsSnapshot,
} from '@/engine/core/metrics/metricsRecorder';
import { nullFeedbackPort, type FeedbackPort } from '@/engine/core/ports/feedbackPort';
import type { SessionResult } from '@/engine/core/ports/sessionSink';
import { createRenderFrame, type RenderFrame } from '@/engine/core/render/renderFrame';
import { createSeededRandom } from '@/engine/core/rng';
import { clamp01, type EndReason } from '@/engine/core/types';
import {
  ENTITY_CAPACITY,
  MISSION,
  NODE_CAPACITY,
  PARTICLE_CAPACITY,
  POPUP_CAPACITY,
  RUN,
} from './design';
import { drawWorld } from './draw';
import { COMET_RUN_SCORE } from './scoring';
import {
  createPointerFrame,
  readPointer,
  stepRun,
  type PointerFrame,
  type SimDeps,
} from './sim';
import { createWorld, layoutWorld, type ObjData, type RunBeat, type WorldState } from './world';

/**
 * Comet Run's runtime — the whole game, minus a screen to put it on.
 *
 * Everything with state lives here: the entity pool, particles, popups,
 * shake, the input queue, the lifecycle clock, the metrics recorder and the
 * world. The React shell owns *none* of it. It calls `pointer()` from the
 * gesture handler, `step()` from the fixed timestep, `draw()` once per
 * display frame, and samples `hud()` a few times a second for the top bar.
 * That is the entire surface between React and the game, and it is why a
 * Jest spec can fly a whole 45-second slice with no renderer attached.
 */

export const COMET_RUN_GAME_ID = 'comet-run';

export interface CometRunOptions {
  width: number;
  height: number;
  seed?: number;
  accessibility?: AccessibilitySettings;
  feedback?: FeedbackPort;
}

/** The only thing the React shell may read, and only on a timer. */
export interface HudSnapshot {
  shield01: number;
  energy01: number;
  /** True when the special is ready — the HUD's one call to action. */
  specialReady: boolean;
  score: number;
  combo: number;
  bestCombo: number;
  /** 0..1 progress toward the relay checkpoint. */
  progress01: number;
  distanceKm: number;
  stageLabel: string;
  beat: RunBeat;
  banner: string;
  commsSpeaker: string;
  commsText: string;
  /** Ms left on the triple-shot upgrade; 0 when stock. */
  upgradeMs: number;
  phase: RuntimePhase;
}

const STAGE_LABELS: Record<RunBeat, string> = {
  launch: 'LAUNCH',
  debris: 'DEBRIS FIELD',
  combat: 'HOSTILE CONTACT',
  turret: 'BEAM TURRET',
  boss: 'HELIX INTERCEPTOR',
  checkpoint: 'RELAY CHECKPOINT',
  failed: 'HULL BREACH',
};

export interface CometRunRuntime {
  readonly world: WorldState;
  readonly frame: RenderFrame;
  readonly deps: SimDeps;

  pointer(pointerId: number, phase: PointerPhase, x: number, y: number, tMs: number): void;
  step(dtMs: number): void;
  draw(alpha: number): RenderFrame;

  hud(): HudSnapshot;
  phase(): RuntimePhase;

  start(): void;
  pause(reason: PauseReason): void;
  resume(): void;
  quit(): void;

  resize(width: number, height: number): void;
  result(sessionResultId: string): SessionResult | null;
  metricsSnapshot(): MetricsSnapshot;
}

export function createCometRun(options: CometRunOptions): CometRunRuntime {
  const seed = options.seed ?? ((Date.now() ^ 0x5eed) >>> 0);
  const settings = options.accessibility ?? DEFAULT_ACCESSIBILITY;
  const policy = createAccessibilityPolicy(settings);
  const rng = createSeededRandom(seed);

  const store = createEntityStore<ObjData>(ENTITY_CAPACITY);
  const particles = createParticleSystem({
    capacity: PARTICLE_CAPACITY,
    rng,
    budgetScale: policy.particleBudget(),
  });
  const popups = createPopupSystem({
    capacity: POPUP_CAPACITY,
    motionScale: policy.popupMotionScale(),
  });
  const shake = createCameraShake({ scale: policy.shakeScale() });
  const input = createInputManager();
  const metrics = createMetricsRecorder(COMET_RUN_SCORE);
  const lifecycle = createRuntimeLifecycle();
  const frame = createRenderFrame(NODE_CAPACITY);

  const deps: SimDeps = {
    store,
    particles,
    popups,
    shake,
    metrics,
    feedback: options.feedback ?? nullFeedbackPort,
    policy,
    rng,
  };

  const world = createWorld(options.width, options.height, rng);
  let endedAt = 0;
  let stageOpen = '';

  const pointerFrame: PointerFrame = createPointerFrame();
  const previousPointer: PointerFrame = createPointerFrame();

  const finish = (reason: EndReason) => {
    if (lifecycle.phase === 'ended') return;
    if (stageOpen) metrics.endStage(reason === 'completed' ? 'complete' : 'failed');
    lifecycle.end(reason);
    endedAt = Date.now();
  };

  /** Mirrors the sim's beats onto the shared recorder's stage list, so the
   *  results screen can say which part of the run went badly. */
  const syncStage = () => {
    if (world.beat === stageOpen || world.beat === 'failed') return;
    if (stageOpen) metrics.endStage('complete');
    metrics.beginStage(world.beat);
    stageOpen = world.beat;
  };

  return {
    world,
    frame,
    deps,

    pointer(pointerId, phase, x, y, tMs) {
      input.enqueue(pointerId, phase, x, y, tMs);
    },

    step(dtMs) {
      if (lifecycle.phase !== 'running') {
        // Drop anything queued while paused, so a touch from before the
        // pause is not replayed into the first live step after resume.
        input.clear();
        return;
      }

      lifecycle.tick(dtMs);
      metrics.tick(dtMs);

      readPointer(input.drain(), previousPointer, pointerFrame);
      previousPointer.steering = pointerFrame.steering;
      previousPointer.x = pointerFrame.x;
      previousPointer.y = pointerFrame.y;
      previousPointer.tapped = false;

      const outcome = stepRun(world, deps, pointerFrame, dtMs);
      syncStage();

      store.integrate(dtMs);
      particles.step(dtMs);
      popups.step(dtMs);
      shake.step(dtMs);

      if (outcome.finished) finish(outcome.finished);
    },

    draw(alpha) {
      frame.reset();
      frame.camera.shakeX = shake.offsetX;
      frame.camera.shakeY = shake.offsetY;
      drawWorld(world, { store, policy }, frame, alpha);
      particles.writeTo(frame);
      return frame;
    },

    hud() {
      const snapshot = metrics.snapshot();
      return {
        shield01: clamp01(world.shield / RUN.maxShield),
        energy01: clamp01(world.energy / RUN.maxEnergy),
        specialReady: world.energy >= RUN.maxEnergy,
        score: snapshot.score,
        combo: snapshot.combo,
        bestCombo: snapshot.bestCombo,
        progress01: world.checkpointDone ? 1 : clamp01(world.elapsedMs / MISSION.sliceMs),
        // World units are px at the near plane; 1,000 of them reads as a
        // kilometre of corridor, which is a scale a player can feel.
        distanceKm: world.distance / 1000,
        stageLabel: STAGE_LABELS[world.beat],
        beat: world.beat,
        banner: world.bannerMs > 0 ? world.banner : '',
        commsSpeaker: world.comms.remainingMs > 0 ? world.comms.speaker : '',
        commsText: world.comms.remainingMs > 0 ? world.comms.text : '',
        upgradeMs: world.ship.upgradeMs,
        phase: lifecycle.phase,
      };
    },

    phase() {
      return lifecycle.phase;
    },

    start() {
      lifecycle.start();
    },
    pause(reason) {
      lifecycle.pause(reason);
      input.clear();
      previousPointer.steering = false;
    },
    resume() {
      lifecycle.resume();
    },
    quit() {
      finish('quit');
    },

    resize(width, height) {
      layoutWorld(world, width, height);
    },

    result(sessionResultId) {
      if (lifecycle.phase !== 'ended') return null;
      const snapshot = metrics.snapshot();
      return {
        sessionResultId,
        gameId: COMET_RUN_GAME_ID,
        score: snapshot.score,
        starRating: starRating(snapshot),
        metrics: snapshot,
        endReason: lifecycle.endReason ?? 'quit',
        seed,
        endedAt,
      };
    },

    metricsSnapshot() {
      return metrics.snapshot();
    },
  };
}
