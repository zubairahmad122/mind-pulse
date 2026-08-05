import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { createPerfSampler, type PerfSnapshot } from '@/engine/core/diagnostics/perfSampler';
import { createEntityStore } from '@/engine/core/entities/entityStore';
import { createCameraShake } from '@/engine/core/fx/cameraShake';
import { createParticleSystem } from '@/engine/core/fx/particles';
import { createPopupSystem } from '@/engine/core/fx/popups';
import { hitTest } from '@/engine/core/input/hitTest';
import { createInputManager, type PointerPhase } from '@/engine/core/input/inputManager';
import { createRenderFrame } from '@/engine/core/render/renderFrame';
import { createSeededRandom, randomRange } from '@/engine/core/rng';
import { rgba, Sprite } from '@/engine/core/types';
import { useGameLoop } from '@/engine/react/useGameLoop';
import { Skia2DRenderer, type PackedPopup } from '@/engine/renderers/skia/Skia2DRenderer';
import { SkiaGameCanvas } from '@/engine/renderers/skia/SkiaGameCanvas';
import { packedLength } from '@/engine/renderers/skia/frameBuffer';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

/**
 * Phase 1 exit-gate instrument. Dev-only: not in the Eye tab, not linked
 * from any user-facing screen, and it never writes a score.
 *
 * The load is deliberately harsher than any real game will be — 150 moving
 * entities plus a 300-particle budget, all hit-testable — because a runtime
 * that only holds 60fps at its design load has no headroom for the game
 * built on top of it.
 */

const ENTITY_CAPACITY = 260;
const PARTICLE_CAPACITY = 300;
const POPUP_CAPACITY = 12;
const NODE_CAPACITY = ENTITY_CAPACITY + PARTICLE_CAPACITY + 16;
const DEFAULT_ENTITIES = 150;
const HUD_INTERVAL_MS = 500;

const PALETTE = [
  rgba('#00E0FF'),
  rgba('#1A8FFF'),
  rgba('#7B61FF'),
  rgba('#FF4D8D'),
  rgba('#FFD34D'),
];

interface Runtime {
  store: ReturnType<typeof createEntityStore>;
  particles: ReturnType<typeof createParticleSystem>;
  popups: ReturnType<typeof createPopupSystem>;
  shake: ReturnType<typeof createCameraShake>;
  input: ReturnType<typeof createInputManager>;
  perf: ReturnType<typeof createPerfSampler>;
  frame: ReturnType<typeof createRenderFrame>;
  rng: ReturnType<typeof createSeededRandom>;
}

export default function EngineBenchmarkScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const canvasWidth = width;
  const canvasHeight = Math.round(width * 1.15);

  const [paused, setPaused] = useState(false);
  const [entityTarget, setEntityTarget] = useState(DEFAULT_ENTITIES);
  const [stats, setStats] = useState<PerfSnapshot | null>(null);
  const [tapLatencyMs, setTapLatencyMs] = useState<number | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [publishes, setPublishes] = useState(0);

  const packed = useSharedValue<Float32Array>(new Float32Array(packedLength(NODE_CAPACITY)));
  const popupValue = useSharedValue<PackedPopup[]>([]);

  // Every mutable system lives behind a ref and is created once. Nothing
  // here is touched during render — this project runs React Compiler, and a
  // ref read in a render body is exactly what it may reorder.
  const rt = useRef<Runtime | null>(null);
  if (rt.current === null) {
    const rng = createSeededRandom(0xc0ffee);
    rt.current = {
      store: createEntityStore(ENTITY_CAPACITY),
      particles: createParticleSystem({ capacity: PARTICLE_CAPACITY, rng }),
      popups: createPopupSystem({ capacity: POPUP_CAPACITY }),
      shake: createCameraShake(),
      input: createInputManager(),
      perf: createPerfSampler(),
      frame: createRenderFrame(NODE_CAPACITY),
      rng,
    };
  }

  const renderer = useMemo(
    () =>
      new Skia2DRenderer({
        capacity: NODE_CAPACITY,
        packed,
        popups: popupValue,
        popupCapacity: POPUP_CAPACITY,
      }),
    [packed, popupValue],
  );

  const pendingTapAtRef = useRef<number | null>(null);
  const popupsDirtyRef = useRef(true);

  useEffect(() => {
    renderer.mount({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 });
    return () => renderer.unmount();
  }, [renderer, canvasWidth, canvasHeight]);

  const spawnOne = useCallback((w: number, h: number) => {
    const r = rt.current;
    if (!r) return;
    const c = PALETTE[Math.floor(r.rng() * PALETTE.length) % PALETTE.length];
    const radius = randomRange(r.rng, 9, 20);
    r.store.spawn({
      kind: 'target',
      x: randomRange(r.rng, radius, w - radius),
      y: randomRange(r.rng, radius, h - radius),
      vx: randomRange(r.rng, -130, 130),
      vy: randomRange(r.rng, -130, 130),
      radius,
      sprite: r.rng() > 0.75 ? Sprite.Ring : Sprite.Disc,
      r: c.r, g: c.g, b: c.b, a: 1,
      layer: 1,
    });
  }, []);

  // Reconcile the live population toward the target whenever it changes.
  useEffect(() => {
    const r = rt.current;
    if (!r) return;
    while (r.store.count > entityTarget) {
      let victim = -1;
      r.store.forEachActive(e => { if (victim === -1) victim = e.id; });
      if (victim === -1) break;
      r.store.kill(victim);
    }
    while (r.store.count < entityTarget) spawnOne(canvasWidth, canvasHeight);
  }, [entityTarget, canvasWidth, canvasHeight, spawnOne]);

  // Backgrounding pauses. Resume is never automatic — the player decides.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') setPaused(true);
    });
    return () => sub.remove();
  }, []);

  const onPointer = useCallback(
    (pointerId: number, phase: PointerPhase, x: number, y: number, tMs: number) => {
      rt.current?.input.enqueue(pointerId, phase, x, y, tMs);
    },
    [],
  );

  const onStep = useCallback(
    (dtMs: number) => {
      const r = rt.current;
      if (!r) return;

      for (const event of r.input.drain()) {
        if (event.phase !== 'down') continue;
        pendingTapAtRef.current = event.tMs;

        const id = hitTest(r.store, event.x, event.y, { slopPx: 6, kind: 'target' });
        const hitEntity = id === -1 ? undefined : r.store.get(id);
        if (hitEntity) {
          r.particles.burst({
            x: hitEntity.x, y: hitEntity.y, count: 18, preset: 'burst',
            r: hitEntity.r, g: hitEntity.g, b: hitEntity.b, speedPxPerSec: 300,
          });
          r.popups.add({
            x: hitEntity.x, y: hitEntity.y, text: '+100',
            r: hitEntity.r, g: hitEntity.g, b: hitEntity.b,
          });
          r.shake.kick(0.45, 220);
          r.store.kill(hitEntity.id);
          spawnOne(canvasWidth, canvasHeight);
        } else {
          r.popups.add({ x: event.x, y: event.y, text: 'MISS', r: 1, g: 0.3, b: 0.35 });
        }
        popupsDirtyRef.current = true;
      }

      r.store.integrate(dtMs);

      // Bounce off the walls so the population stays on screen forever.
      r.store.forEachActive(e => {
        if (e.x < e.radius && e.vx < 0) { e.x = e.radius; e.vx = -e.vx; }
        if (e.x > canvasWidth - e.radius && e.vx > 0) { e.x = canvasWidth - e.radius; e.vx = -e.vx; }
        if (e.y < e.radius && e.vy < 0) { e.y = e.radius; e.vy = -e.vy; }
        if (e.y > canvasHeight - e.radius && e.vy > 0) { e.y = canvasHeight - e.radius; e.vy = -e.vy; }
        e.rotation += dtMs * 0.0012;
      });

      r.particles.step(dtMs);
      r.popups.step(dtMs);
      r.shake.step(dtMs);
    },
    [canvasWidth, canvasHeight, spawnOne],
  );

  const onRender = useCallback(
    (alpha: number, frameDeltaMs: number, stepsRun: number) => {
      const r = rt.current;
      if (!r) return;

      const frame = r.frame;
      frame.reset();
      frame.camera.shakeX = r.shake.offsetX;
      frame.camera.shakeY = r.shake.offsetY;

      r.store.forEachActive(e => {
        const node = frame.push();
        if (!node) return;
        // Interpolate between the last two fixed steps so motion is smooth
        // at the display rate even though logic ran at 60Hz.
        node.x = e.prevX + (e.x - e.prevX) * alpha;
        node.y = e.prevY + (e.y - e.prevY) * alpha;
        node.rotation = e.rotation;
        node.size = e.radius * 2 * e.scale;
        node.sprite = e.sprite;
        node.r = e.r; node.g = e.g; node.b = e.b; node.a = e.a;
      });

      r.particles.writeTo(frame);
      renderer.publish(frame);

      if (popupsDirtyRef.current || r.popups.alive > 0) {
        renderer.publishPopups(r.popups);
        popupsDirtyRef.current = r.popups.alive > 0;
      }

      r.perf.frame(frameDeltaMs, stepsRun);
      r.perf.counts(r.store.count, r.particles.alive, frame.nodeCount, frame.overflow);

      const tappedAt = pendingTapAtRef.current;
      if (tappedAt !== null) {
        pendingTapAtRef.current = null;
        // Tap timestamp → the frame carrying the response reaching the UI
        // thread. Excludes compositor and panel latency, so treat it as a
        // floor; the screen recording is the end-to-end number.
        setTapLatencyMs(Math.max(0, Date.now() - tappedAt));
      }
    },
    [renderer],
  );

  useGameLoop({ running: true, paused, onStep, onRender });

  // Counts every commit of this screen. Unkeyed on purpose — it must fire
  // after each render, and it writes a ref rather than state so counting
  // renders cannot itself cause one.
  const commitsRef = useRef(0);
  useEffect(() => {
    commitsRef.current++;
  });

  // The HUD samples at 2Hz. This is the ONLY setState during play — if this
  // interval is removed, a running session performs zero React renders. The
  // commit count is published from here so it stays a single batched render.
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const r = rt.current;
      if (!r) return;
      setStats(r.perf.snapshot());
      setRenderCount(commitsRef.current);
      setPublishes(renderer.publishCount);
    }, HUD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, renderer]);

  const reset = useCallback(() => {
    const r = rt.current;
    if (!r) return;
    r.perf.reset();
    r.particles.clear();
    r.popups.clear();
    r.shake.reset();
    r.input.clear();
    setTapLatencyMs(null);
    setRenderCount(0);
  }, []);

  const gate = useMemo(() => {
    if (!stats || stats.samples < 60) return null;
    return {
      fps: stats.fpsMedian >= 55,
      p5: stats.fpsP5 >= 45,
      stalls: stats.stallFrames === 0,
      tap: tapLatencyMs === null || tapLatencyMs < 80,
      overflow: stats.overflow === 0,
    };
  }, [stats, tapLatencyMs]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SkiaGameCanvas
        width={canvasWidth}
        height={canvasHeight}
        capacity={NODE_CAPACITY}
        packed={packed}
        popups={popupValue}
        popupCapacity={POPUP_CAPACITY}
        onPointer={onPointer}
      />

      <View style={styles.hud}>
        <View style={styles.row}>
          <Metric label="FPS med" value={stats ? `${stats.fpsMedian}` : '—'} ok={gate?.fps} />
          <Metric label="FPS p5" value={stats ? `${stats.fpsP5}` : '—'} ok={gate?.p5} />
          <Metric label="worst" value={stats ? `${stats.worstFrameMs}ms` : '—'} />
        </View>
        <View style={styles.row}>
          <Metric label="long >32ms" value={stats ? `${stats.longFrames}` : '—'} />
          <Metric label="stall >100ms" value={stats ? `${stats.stallFrames}` : '—'} ok={gate?.stalls} />
          <Metric label="steps/frame" value={stats ? `${stats.avgStepsPerFrame}` : '—'} />
        </View>
        <View style={styles.row}>
          <Metric label="entities" value={stats ? `${stats.entityCount}` : '—'} />
          <Metric label="particles" value={stats ? `${stats.particleCount}` : '—'} />
          <Metric label="nodes" value={stats ? `${stats.nodeCount}` : '—'} />
        </View>
        <View style={styles.row}>
          <Metric label="tap→frame" value={tapLatencyMs === null ? '—' : `${tapLatencyMs}ms`} ok={gate?.tap} />
          <Metric label="overflow" value={stats ? `${stats.overflow}` : '—'} ok={gate?.overflow} />
          <Metric label="RN renders" value={`${renderCount}`} />
          <Metric label="publishes" value={`${publishes}`} />
        </View>

        <View style={styles.controls}>
          <Btn label={paused ? 'Resume' : 'Pause'} onPress={() => setPaused(p => !p)} />
          <Btn label="−25" onPress={() => setEntityTarget(n => Math.max(0, n - 25))} />
          <Btn label="+25" onPress={() => setEntityTarget(n => Math.min(ENTITY_CAPACITY, n + 25))} />
          <Btn label="Reset" onPress={reset} />
        </View>
        <Text style={styles.hint}>
          Target {entityTarget} entities · tap a target to burst · gate needs 60s of samples
        </Text>
      </View>
    </View>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          ok === true && styles.metricPass,
          ok === false && styles.metricFail,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} accessibilityRole="button">
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.primary },
  hud: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 6 },
  row: { flexDirection: 'row', gap: spacing.sm },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  metricLabel: { fontSize: 9.5, color: colors.text.tertiary, letterSpacing: 0.3 },
  metricValue: { fontSize: 15, fontWeight: '800', color: colors.text.primary },
  metricPass: { color: '#4CAF50' },
  metricFail: { color: '#FF4D6D' },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  btn: {
    flex: 1,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,255,0.28)',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnText: { fontSize: 12.5, fontWeight: '700', color: '#00E0FF' },
  hint: { fontSize: 10.5, color: colors.text.tertiary, textAlign: 'center', marginTop: 2 },
});
