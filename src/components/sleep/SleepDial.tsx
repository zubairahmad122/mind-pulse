/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally
   mutated outside render (gesture worklets, effects); the React Compiler rule doesn't
   yet model that pattern. */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Line } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Time <-> angle helpers ──────────────────────────────────────────────────────
// Angles are radians, clockwise, with 0 at the top of the circle — a direct
// minutes-of-day -> radians mapping, no offset needed.

const TWO_PI = Math.PI * 2;
/** How close (px) a touch must land to a handle's knob to grab it. */
const GRAB_RADIUS = 44;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  'worklet';
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function minutesToAngle(minutes: number): number {
  'worklet';
  return (minutes / 1440) * TWO_PI;
}

/** Snaps to 5-minute steps so tiny touch jitter doesn't move the dial every pixel. */
function angleToSnappedMinutes(angle: number): number {
  'worklet';
  const norm = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const raw = (norm / TWO_PI) * 1440;
  return Math.round(raw / 5) * 5;
}

function polarToXY(angle: number, radius: number) {
  'worklet';
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
}

/** Inverse of polarToXY — touch offset from center back to a clockwise, top-origin angle. */
function pointToAngle(dx: number, dy: number): number {
  'worklet';
  const angle = Math.atan2(dx, -dy);
  return angle < 0 ? angle + TWO_PI : angle;
}

function arcPath(radius: number, startAngle: number, angleLength: number): string {
  'worklet';
  const endAngle = startAngle + angleLength;
  const { x: x1, y: y1 } = polarToXY(startAngle, radius);
  const { x: x2, y: y2 } = polarToXY(endAngle, radius);
  const largeArc = angleLength > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Three-stop sweep: dark blue-purple (bedtime end) -> purple -> yellow (wake
// end). A straight 2-color RGB lerp from blue to yellow crosses a muddy grey
// midpoint, so the purple midpoint stop keeps the transition looking rich.
const ARC_STOPS = [
  { r: 0x31, g: 0x2e, b: 0x81 }, // #312e81 dark indigo / blue-purple
  { r: 0xa8, g: 0x55, b: 0xf7 }, // #a855f7 purple
  { r: 0xfa, g: 0xcc, b: 0x15 }, // #facc15 yellow
];

/** Interpolates the sweep gradient's color at t (0–1) along its length. */
function sweepColor(t: number): string {
  const scaled = t * (ARC_STOPS.length - 1);
  const i = Math.min(ARC_STOPS.length - 2, Math.floor(scaled));
  const localT = scaled - i;
  const a = ARC_STOPS[i];
  const b = ARC_STOPS[i + 1];
  const r = Math.round(a.r + (b.r - a.r) * localT);
  const g = Math.round(a.g + (b.g - a.g) * localT);
  const bl = Math.round(a.b + (b.b - a.b) * localT);
  return `rgb(${r},${g},${bl})`;
}

// ─── Haptic helpers (called via runOnJS) ────────────────────────────────────────

function lightImpact() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function mediumImpact() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// ─── Clock face reference points ────────────────────────────────────────────────

const HOUR_LABELS = [
  { label: '12 AM', min: 0 },
  { label: '6 AM', min: 360 },
  { label: '12 PM', min: 720 },
  { label: '6 PM', min: 1080 },
];

const ARC_SEGMENTS = 16;

// ─── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  bedtime: string;
  wakeTime: string;
  alarmWindowEnabled: boolean;
  radius?: number;
  onBedtimeChange: (time: string) => void;
  onWakeTimeChange: (time: string) => void;
};

// ─── Gesture availability check ────────────────────────────────────────────────
// RNGH v2's GestureDetector already has an internal guard and will render a plain
// Fragment if GestureHandlerRootView is missing in the ancestor tree, so no crash
// occurs in normal use. This check adds defense-in-depth for edge cases (SSR,
// test environments, Expo web without the native gesture host module).
// We verify that Gesture.Pan() — a pure JS factory — is callable. If the import
// itself is broken (e.g. stale Metro cache), we fall back to a static View.

function useGestureAvailable(): boolean {
  const [available] = useState(() => {
    try {
      Gesture.Pan();
      return true;
    } catch {
      return false;
    }
  });
  return available;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function SleepDial({
  bedtime,
  wakeTime,
  alarmWindowEnabled,
  radius = 100,
  onBedtimeChange,
  onWakeTimeChange,
}: Props) {
  const ringStrokeWidth = 26;
  const ringGap = 10;
  const clockFaceRadius = radius - ringStrokeWidth / 2 - ringGap;
  const knobRadius = 14;
  const glowRadius = knobRadius * 1.8;
  const padding = glowRadius + 6;
  const containerWidth = padding * 2 + radius * 2;
  const center = containerWidth / 2;
  const trackRadius = radius;

  // Driven on the UI thread by the pan gesture below.
  const bedAngle = useSharedValue(minutesToAngle(timeToMinutes(bedtime)));
  const wakeAngle = useSharedValue(minutesToAngle(timeToMinutes(wakeTime)));
  const activeHandle = useSharedValue<'bed' | 'wake' | 'none'>('none');
  const lastBedMin = useSharedValue(timeToMinutes(bedtime));
  const lastWakeMin = useSharedValue(timeToMinutes(wakeTime));
  const bedScale = useSharedValue(1);
  const wakeScale = useSharedValue(1);

  // Keep the UI-thread angle in sync with externally-driven prop changes (time
  // picker, duration presets). Debounced: a single drag gesture can emit dozens
  // of intermediate `bedtime` values (one per 5-min crossing) as it commits to
  // the parent. Without debouncing, each stale intermediate render's effect
  // fires in sequence right after release (activeHandle is already 'none' by
  // then) and yanks bedAngle through each old value before the final one wins —
  // visible as the dial jumping back through earlier positions. Debouncing
  // collapses that whole backlog into a single, correct, final sync.
  useEffect(() => {
    const id = setTimeout(() => {
      if (activeHandle.value !== 'bed') {
        bedAngle.value = minutesToAngle(timeToMinutes(bedtime));
        lastBedMin.value = timeToMinutes(bedtime);
      }
    }, 90);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedtime]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (activeHandle.value !== 'wake') {
        wakeAngle.value = minutesToAngle(timeToMinutes(wakeTime));
        lastWakeMin.value = timeToMinutes(wakeTime);
      }
    }, 90);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeTime]);

  // Memoize the gesture so it's only created ONCE. Without this, every re-render
  // creates a new gesture object, which cancels the active drag mid-way, triggers
  // onFinalize -> activeHandle='none', and lets the useEffect above reset the angle
  // to the (potentially stale) props value — causing a jump mid-drag.
  // All captured variables are either stable (shared values, setState callbacks) or
  // constants (center, trackRadius derived from radius=100), so empty deps are safe.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(event => {
          const dx = event.x - center;
          const dy = event.y - center;
          const angle = pointToAngle(dx, dy);
          const snappedMin = angleToSnappedMinutes(angle);
          const bedKnob = polarToXY(bedAngle.value, trackRadius);
          const wakeKnob = polarToXY(wakeAngle.value, trackRadius);
          const distBed = Math.hypot(dx - bedKnob.x, dy - bedKnob.y);
          const distWake = Math.hypot(dx - wakeKnob.x, dy - wakeKnob.y);

          if (distBed > GRAB_RADIUS && distWake > GRAB_RADIUS) {
            activeHandle.value = 'none';
            return;
          }

          activeHandle.value = distBed <= distWake ? 'bed' : 'wake';

          // Snap the VISUAL angle too (not just the emitted value) — if the knob
          // tracked the raw touch angle while dragging, it'd sit slightly off the
          // 5-min grid at release, and the prop-sync effect would yank it onto the
          // grid a beat later. Snapping live means there's nothing left to correct.
          if (activeHandle.value === 'bed') {
            bedAngle.value = minutesToAngle(snappedMin);
            if (snappedMin !== lastBedMin.value) {
              lastBedMin.value = snappedMin;
              runOnJS(onBedtimeChange)(minutesToTime(snappedMin));
            }
            bedScale.value = withSpring(1.25, { stiffness: 300, damping: 12, overshootClamping: true });
          } else {
            wakeAngle.value = minutesToAngle(snappedMin);
            if (snappedMin !== lastWakeMin.value) {
              lastWakeMin.value = snappedMin;
              runOnJS(onWakeTimeChange)(minutesToTime(snappedMin));
            }
            wakeScale.value = withSpring(1.25, { stiffness: 300, damping: 12, overshootClamping: true });
          }

          runOnJS(lightImpact)();
        })
        .onUpdate(event => {
          if (activeHandle.value === 'none') return;
          const angle = pointToAngle(event.x - center, event.y - center);
          const snappedMin = angleToSnappedMinutes(angle);
          if (activeHandle.value === 'bed') {
            bedAngle.value = minutesToAngle(snappedMin);
            if (snappedMin !== lastBedMin.value) {
              lastBedMin.value = snappedMin;
              runOnJS(onBedtimeChange)(minutesToTime(snappedMin));
            }
          } else {
            wakeAngle.value = minutesToAngle(snappedMin);
            if (snappedMin !== lastWakeMin.value) {
              lastWakeMin.value = snappedMin;
              runOnJS(onWakeTimeChange)(minutesToTime(snappedMin));
            }
          }
        })
        .onFinalize(() => {
          activeHandle.value = 'none';
          bedScale.value = withSpring(1, { stiffness: 300, damping: 14, overshootClamping: true });
          wakeScale.value = withSpring(1, { stiffness: 300, damping: 14, overshootClamping: true });
          runOnJS(mediumImpact)();
        }),
    [],
  );

  // Smart alarm window (static, re-renders on prop change)
  const wakeMin = timeToMinutes(wakeTime);
  const windowMin = alarmWindowEnabled ? 30 : 4;
  const alarmStartAngle = minutesToAngle(((wakeMin - windowMin) % 1440 + 1440) % 1440);
  const alarmAngleLength = minutesToAngle(windowMin);

  const gestureOk = useGestureAvailable();

  const face = (
    <View style={{ width: containerWidth, height: containerWidth }}>
      <Svg width={containerWidth} height={containerWidth}>
        <G transform={`translate(${center}, ${center})`}>
          {/* Outer ring track (static background) */}
          <Circle r={trackRadius} stroke="#23242b" strokeWidth={ringStrokeWidth} fill="none" />

          {/* Sleep-span gradient sweep (indigo -> amber) */}
          <MainArc radius={trackRadius} strokeWidth={ringStrokeWidth} bedAngle={bedAngle} wakeAngle={wakeAngle} />

          {/* Smart alarm window (amber sliver) */}
          <Path
            d={arcPath(trackRadius, alarmStartAngle, alarmAngleLength)}
            stroke="#f59e0b"
            strokeWidth={ringStrokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />

          {/* Inner clock face */}
          <Circle r={clockFaceRadius} fill="#0a0a0f" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />

          {/* Tick marks — every 30 min, bolder every 6h (12/3/6/9) */}
          {Array.from({ length: 48 }, (_, i) => {
            const tickAngle = (i / 48) * TWO_PI;
            const isMajor = i % 12 === 0;
            const outerR = clockFaceRadius - 4;
            const innerR = clockFaceRadius - (isMajor ? 13 : 7);
            const { x: x1, y: y1 } = polarToXY(tickAngle, innerR);
            const { x: x2, y: y2 } = polarToXY(tickAngle, outerR);
            return (
              <Line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isMajor ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>

      {/* Hour numbers — plain RN Text for crisp bold rendering over the SVG face */}
      {HOUR_LABELS.map(mark => {
        const pos = polarToXY(minutesToAngle(mark.min), clockFaceRadius * 0.52);
        return (
          <Text
            key={mark.label}
            style={[styles.hourLabel, { left: center + pos.x - 30, top: center + pos.y - 9 }]}
          >
            {mark.label}
          </Text>
        );
      })}

      {/* Knobs (outside SVG so RN views aren't affected by SVG coordinate space) */}
      <BedKnob angle={bedAngle} radius={trackRadius} scale={bedScale} glowRadius={glowRadius} knobRadius={knobRadius} center={center} />
      <WakeKnob angle={wakeAngle} radius={trackRadius} scale={wakeScale} glowRadius={glowRadius} knobRadius={knobRadius} center={center} />
    </View>
  );

  return gestureOk ? <GestureDetector gesture={panGesture}>{face}</GestureDetector> : face;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

type SharedAngle = SharedValue<number>;
type SharedNum = SharedValue<number>;

/** Sleep-span sweep, drawn as several short segments so the indigo -> amber
 * gradient always reads correctly along the arc regardless of rotation. */
function MainArc({
  radius,
  strokeWidth,
  bedAngle,
  wakeAngle,
}: {
  radius: number;
  strokeWidth: number;
  bedAngle: SharedAngle;
  wakeAngle: SharedAngle;
}) {
  return (
    <>
      {Array.from({ length: ARC_SEGMENTS }, (_, i) => (
        <ArcSegment
          key={i}
          index={i}
          radius={radius}
          strokeWidth={strokeWidth}
          color={sweepColor(i / (ARC_SEGMENTS - 1))}
          bedAngle={bedAngle}
          wakeAngle={wakeAngle}
        />
      ))}
    </>
  );
}

function ArcSegment({
  index,
  radius,
  strokeWidth,
  color,
  bedAngle,
  wakeAngle,
}: {
  index: number;
  radius: number;
  strokeWidth: number;
  color: string;
  bedAngle: SharedAngle;
  wakeAngle: SharedAngle;
}) {
  const animatedProps = useAnimatedProps(() => {
    const length = ((wakeAngle.value - bedAngle.value) % TWO_PI + TWO_PI) % TWO_PI;
    const segStart = bedAngle.value + (length * index) / ARC_SEGMENTS;
    const segLength = length / ARC_SEGMENTS;
    return { d: arcPath(radius, segStart, segLength) };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** Knob for bedtime handle (moon) — positioned + scaled on UI thread. */
function BedKnob({
  angle,
  radius,
  scale,
  glowRadius,
  knobRadius,
  center,
}: {
  angle: SharedAngle;
  radius: number;
  scale: SharedNum;
  glowRadius: number;
  knobRadius: number;
  center: number;
}) {
  const posStyle = useAnimatedStyle(() => {
    const { x, y } = polarToXY(angle.value, radius);
    return {
      transform: [
        { translateX: center + x - glowRadius },
        { translateY: center + y - glowRadius },
      ],
    };
  });

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        width: glowRadius * 2,
        height: glowRadius * 2,
        alignItems: 'center',
        justifyContent: 'center',
      }, posStyle]}
    >
      <Animated.View
        style={[{
          position: 'absolute',
          width: glowRadius * 2,
          height: glowRadius * 2,
          borderRadius: glowRadius,
          backgroundColor: 'rgba(49,46,129,0.32)',
        }, scaleStyle]}
      />
      <View
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          borderRadius: knobRadius,
          backgroundColor: '#4338ca',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#4338ca',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 5,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 13 }}>{'\u{1F319}'}</Text>
      </View>
    </Animated.View>
  );
}

/** Knob for wake-time handle (bell) — positioned + scaled on UI thread. */
function WakeKnob({
  angle,
  radius,
  scale,
  glowRadius,
  knobRadius,
  center,
}: {
  angle: SharedAngle;
  radius: number;
  scale: SharedNum;
  glowRadius: number;
  knobRadius: number;
  center: number;
}) {
  const posStyle = useAnimatedStyle(() => {
    const { x, y } = polarToXY(angle.value, radius);
    return {
      transform: [
        { translateX: center + x - glowRadius },
        { translateY: center + y - glowRadius },
      ],
    };
  });

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        width: glowRadius * 2,
        height: glowRadius * 2,
        alignItems: 'center',
        justifyContent: 'center',
      }, posStyle]}
    >
      <Animated.View
        style={[{
          position: 'absolute',
          width: glowRadius * 2,
          height: glowRadius * 2,
          borderRadius: glowRadius,
          backgroundColor: 'rgba(250,204,21,0.22)',
        }, scaleStyle]}
      />
      <View
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          borderRadius: knobRadius,
          backgroundColor: '#facc15',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#facc15',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 5,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 13 }}>{'\u{1F514}'}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hourLabel: {
    position: 'absolute',
    width: 60,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
