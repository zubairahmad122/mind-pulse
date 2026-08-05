import { useRouter } from 'expo-router';
import { ChevronLeft, Pause, Play, RotateCcw, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { useExpoFeedbackPort } from '@/engine/adapters/expoFeedbackPort';
import { createPerfSampler } from '@/engine/core/diagnostics/perfSampler';
import type { PointerPhase } from '@/engine/core/input/inputManager';
import { useGameLoop } from '@/engine/react/useGameLoop';
import { Skia2DRenderer, type PackedPopup } from '@/engine/renderers/skia/Skia2DRenderer';
import { SkiaGameCanvas } from '@/engine/renderers/skia/SkiaGameCanvas';
import { packedLength } from '@/engine/renderers/skia/frameBuffer';
import { COLORS, NODE_CAPACITY, POPUP_CAPACITY } from '@/features/eyeArcade/cometRun/design';
import {
  createCometRun,
  type CometRunRuntime,
  type HudSnapshot,
} from '@/features/eyeArcade/cometRun/runtime';
import { useEyeGameAccessibility } from '@/hooks/useEyeGameAccessibility';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSessionKeepAwake } from '@/hooks/useSessionKeepAwake';
import { spacing } from '@/constants/spacing';

/**
 * Comet Run — the shell.
 *
 * This component deliberately does almost nothing. It sizes a canvas,
 * forwards pointer events into the engine's input queue, and drives
 * `step`/`draw` from the fixed-timestep loop. **It holds no per-frame
 * gameplay state**: the only `setState` that fires while a run is live is the
 * HUD sampler below at 8Hz, and it re-renders one small subtree — the canvas
 * is memoised and every prop it takes is stable, so it renders once on mount
 * and never again while the ship is flying.
 *
 * The chrome is in-game on purpose. A stacked `ScreenHeader` with a
 * personal-best chip would eat ~90dp above the corridor and put a trophy in
 * the player's eyeline mid-run. Everything needed is in the 66dp bar below,
 * and both of its controls are 48dp targets.
 */

/** 8Hz. Immediate enough for a combo tick, negligible against a 120Hz loop. */
const HUD_INTERVAL_MS = 125;

export default function CometRunScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const accessibility = useEyeGameAccessibility();
  const osReducedMotion = useReducedMotion();
  const feedback = useExpoFeedbackPort();

  const hudHeight = 66;
  const canvasWidth = Math.round(width);
  const canvasHeight = Math.max(360, Math.round(height - insets.top - insets.bottom - hudHeight));

  const packed = useSharedValue<Float32Array>(new Float32Array(packedLength(NODE_CAPACITY)));
  const popupValue = useSharedValue<PackedPopup[]>([]);

  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [runKey, setRunKey] = useState(0);

  // Reduced motion is the OR of the OS signal and the in-app override, the
  // contract `useEyeGameAccessibility` documents.
  const settings = useMemo(
    () => ({
      largeTarget: accessibility.largeTarget,
      highContrast: accessibility.highContrast,
      reducedMotion: accessibility.reducedMotion || osReducedMotion,
    }),
    [accessibility.largeTarget, accessibility.highContrast, accessibility.reducedMotion, osReducedMotion],
  );

  // Built once per run and never read during render — this project runs
  // React Compiler, and a ref touched in a render body is exactly what it is
  // free to reorder.
  const runtimeRef = useRef<CometRunRuntime | null>(null);
  const perfRef = useRef(createPerfSampler());
  const popupsDirtyRef = useRef(true);

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

  useEffect(() => {
    const runtime = createCometRun({
      width: canvasWidth,
      height: canvasHeight,
      accessibility: settings,
      feedback,
    });
    runtimeRef.current = runtime;
    runtime.start();
    renderer.mount({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 });
    return () => {
      renderer.unmount();
      runtimeRef.current = null;
    };
    // `runKey` is the replay trigger; size and settings rebuild deliberately.
  }, [renderer, canvasWidth, canvasHeight, settings, feedback, runKey]);

  const isEnded = hud?.phase === 'ended';
  useSessionKeepAwake(!isEnded && !paused, 'mindpulse-comet-run');

  // Backgrounding pauses. Resume is never automatic — the player decides,
  // the same contract every other session in the app honours.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        runtimeRef.current?.pause('background');
        setPaused(true);
      }
    });
    return () => sub.remove();
  }, []);

  const onPointer = useCallback(
    (pointerId: number, phase: PointerPhase, x: number, y: number, tMs: number) => {
      runtimeRef.current?.pointer(pointerId, phase, x, y, tMs);
    },
    [],
  );

  const onStep = useCallback((dtMs: number) => {
    runtimeRef.current?.step(dtMs);
  }, []);

  const onRender = useCallback(
    (alpha: number, frameDeltaMs: number, stepsRun: number) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;

      const frame = runtime.draw(alpha);
      renderer.publish(frame);

      const popups = runtime.deps.popups;
      if (popupsDirtyRef.current || popups.alive > 0) {
        renderer.publishPopups(popups);
        popupsDirtyRef.current = popups.alive > 0;
      }

      perfRef.current.frame(frameDeltaMs, stepsRun);
      perfRef.current.counts(runtime.deps.store.count, popups.alive, frame.nodeCount, frame.overflow);
    },
    [renderer],
  );

  useGameLoop({ running: !isEnded, paused, onStep, onRender });

  // The one setState during play.
  useEffect(() => {
    if (paused || isEnded) return;
    const timer = setInterval(() => {
      const runtime = runtimeRef.current;
      if (runtime) setHud(runtime.hud());
    }, HUD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, isEnded]);

  const togglePause = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setPaused(previous => {
      if (previous) runtime.resume();
      else runtime.pause('user');
      return !previous;
    });
  }, []);

  const replay = useCallback(() => {
    setPaused(false);
    setHud(null);
    setRunKey(n => n + 1);
  }, []);

  const exit = useCallback(() => {
    runtimeRef.current?.quit();
    router.back();
  }, [router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <MissionHud hud={hud} height={hudHeight} paused={paused} onPause={togglePause} onBack={exit} />

      <View style={{ width: canvasWidth, height: canvasHeight }}>
        <SkiaGameCanvas
          width={canvasWidth}
          height={canvasHeight}
          capacity={NODE_CAPACITY}
          packed={packed}
          popups={popupValue}
          popupCapacity={POPUP_CAPACITY}
          onPointer={onPointer}
          backgroundColor={COLORS.space}
        />

        {hud?.banner ? <Banner text={hud.banner} /> : null}
        {hud?.commsText ? <Comms speaker={hud.commsSpeaker} text={hud.commsText} /> : null}

        {paused && !isEnded ? (
          <Overlay
            title="RUN PAUSED"
            actions={[
              { label: 'Resume', icon: 'play', onPress: togglePause, primary: true },
              { label: 'Restart', icon: 'restart', onPress: replay },
              { label: 'Leave', icon: 'close', onPress: exit },
            ]}
          />
        ) : null}

        {isEnded && hud ? (
          <Overlay
            title={hud.beat === 'checkpoint' ? 'CHECKPOINT RESTORED' : 'ASTRA-7 DOWN'}
            subtitle={`${hud.score.toLocaleString()} pts · best combo ×${hud.bestCombo} · ${hud.distanceKm.toFixed(1)} km`}
            actions={[
              { label: 'Fly it again', icon: 'restart', onPress: replay, primary: true },
              { label: 'Leave', icon: 'close', onPress: exit },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

// ── HUD ────────────────────────────────────────────────────────────────────

function MissionHud({
  hud,
  height,
  paused,
  onPause,
  onBack,
}: {
  hud: HudSnapshot | null;
  height: number;
  paused: boolean;
  onPause: () => void;
  onBack: () => void;
}) {
  const shield01 = hud?.shield01 ?? 1;
  const energy01 = hud?.energy01 ?? 0;
  const shieldColour = shield01 > 0.6 ? '#3BE8FF' : shield01 > 0.3 ? '#FFC24D' : '#FF3A4E';

  return (
    <View style={[styles.hud, { height }]}>
      <TouchableOpacity
        style={styles.hudButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Leave run"
      >
        <ChevronLeft size={22} color="#9EE7FF" strokeWidth={2.4} />
      </TouchableOpacity>

      <View style={styles.hudCentre}>
        <View style={styles.hudRow}>
          <Text style={styles.stage} numberOfLines={1}>
            {hud?.stageLabel ?? 'LAUNCH'}
          </Text>
          <Text style={styles.combo}>×{hud?.combo ?? 0}</Text>
          <Text style={styles.score}>{(hud?.score ?? 0).toLocaleString()}</Text>
        </View>

        <View style={styles.hudRow}>
          <Meter
            value={shield01}
            colour={shieldColour}
            label={`Hull integrity ${Math.round(shield01 * 100)} percent`}
          />
          <Meter
            value={energy01}
            colour={hud?.specialReady ? '#FFC24D' : '#B98BFF'}
            label={`Special charge ${Math.round(energy01 * 100)} percent`}
            icon={hud?.specialReady ? 'ready' : undefined}
          />
          {/* Distance to checkpoint — the run's objective, always visible. */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round((hud?.progress01 ?? 0) * 100)}%` }]} />
          </View>
          <Text style={styles.distance}>{(hud?.distanceKm ?? 0).toFixed(1)}km</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.hudButton}
        onPress={onPause}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume run' : 'Pause run'}
      >
        {paused ? (
          <Play size={20} color="#9EE7FF" strokeWidth={2.4} />
        ) : (
          <Pause size={20} color="#9EE7FF" strokeWidth={2.4} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function Meter({
  value,
  colour,
  label,
  icon,
}: {
  value: number;
  colour: string;
  label: string;
  icon?: 'ready';
}) {
  return (
    <View style={styles.meterTrack} accessible accessibilityLabel={label}>
      <View style={[styles.meterFill, { width: `${Math.round(value * 100)}%`, backgroundColor: colour }]} />
      {icon === 'ready' ? <Zap size={10} color="#0A1120" strokeWidth={3} style={styles.meterIcon} /> : null}
    </View>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <View style={styles.bannerWrap} pointerEvents="none">
      <Text style={styles.banner} accessibilityLiveRegion="polite">
        {text}
      </Text>
    </View>
  );
}

/** MIRA's transmissions. Bottom-anchored so they never sit over the corridor
 *  the player is reading. */
function Comms({ speaker, text }: { speaker: string; text: string }) {
  return (
    <View style={styles.commsWrap} pointerEvents="none">
      <View style={styles.commsCard}>
        <Text style={styles.commsSpeaker}>{speaker}</Text>
        <Text style={styles.commsText} accessibilityLiveRegion="polite">
          {text}
        </Text>
      </View>
    </View>
  );
}

interface OverlayAction {
  label: string;
  icon: 'play' | 'restart' | 'close';
  onPress: () => void;
  primary?: boolean;
}

function Overlay({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions: OverlayAction[];
}) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.overlayTitle}>{title}</Text>
      {subtitle ? <Text style={styles.overlaySubtitle}>{subtitle}</Text> : null}
      <View style={styles.overlayActions}>
        {actions.map(action => (
          <TouchableOpacity
            key={action.label}
            style={[styles.overlayButton, action.primary ? styles.overlayButtonPrimary : null]}
            onPress={action.onPress}
            accessibilityRole="button"
          >
            {action.icon === 'play' ? <Play size={16} color="#0A1120" strokeWidth={2.6} /> : null}
            {action.icon === 'restart' ? (
              <RotateCcw size={16} color={action.primary ? '#0A1120' : '#9EE7FF'} strokeWidth={2.6} />
            ) : null}
            {action.icon === 'close' ? <X size={16} color="#9EE7FF" strokeWidth={2.6} /> : null}
            <Text style={[styles.overlayButtonText, action.primary ? styles.overlayButtonTextPrimary : null]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#04070F' },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  // 48dp minimum target, the bar every control in the app is held to.
  hudButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,232,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.22)',
  },
  hudCentre: { flex: 1, gap: 6 },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  stage: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: 'rgba(220,250,255,0.78)' },
  combo: { fontSize: 13, fontWeight: '900', color: '#FFC24D', fontVariant: ['tabular-nums'] },
  score: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'right',
  },

  meterTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  meterFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  meterIcon: { position: 'absolute', left: 3 },

  progressTrack: {
    width: 46,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#5BE58B' },
  distance: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    fontVariant: ['tabular-nums'],
    minWidth: 42,
    textAlign: 'right',
  },

  bannerWrap: { position: 'absolute', top: 22, left: 0, right: 0, alignItems: 'center' },
  banner: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: 'rgba(220,250,255,0.95)',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(4,7,15,0.6)',
  },

  commsWrap: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: spacing.md },
  commsCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(4,10,22,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.25)',
    gap: 3,
  },
  commsSpeaker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6, color: '#3BE8FF' },
  commsText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.86)', lineHeight: 18 },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(4,7,15,0.88)',
  },
  overlayTitle: { fontSize: 25, fontWeight: '900', letterSpacing: 2.4, color: '#DCFAFF', textAlign: 'center' },
  overlaySubtitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  overlayActions: { marginTop: spacing.md, gap: spacing.sm, width: '72%' },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.3)',
    backgroundColor: 'rgba(59,232,255,0.08)',
  },
  overlayButtonPrimary: { backgroundColor: '#3BE8FF', borderColor: '#3BE8FF' },
  overlayButtonText: { fontSize: 14.5, fontWeight: '800', color: '#9EE7FF' },
  overlayButtonTextPrimary: { color: '#0A1120' },
});
