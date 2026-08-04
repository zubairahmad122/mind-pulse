import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PILLAR_COLORS } from '@/constants/designSystem';

/**
 * Decorative near/far depth demonstration shown in the Focus Switch arena
 * *before* a session starts. It exists purely to communicate the idea that
 * attention shifts between a far target and a near target.
 *
 * Isolation contract — this component:
 *  - owns its own shared value and never reads or writes any gameplay shared
 *    value (sharpness, orbNormX/Y, spawnScale, tapScale, rush, timerBar);
 *  - is unmounted the instant the session starts, so it can never influence
 *    scoring, timing, or hit detection;
 *  - is `pointerEvents="none"` throughout, so it never receives a touch;
 *  - holds a static mid-state when the OS reduce-motion setting is on.
 */

/** One direction of the far → near transition. Deliberately slow and calm. */
const CYCLE_MS = 2600;

const EYE = PILLAR_COLORS.eye;
const FAR_COLOR = '#A5B4FC';

/** Cap so the composition stays elegant inside very large arenas. */
const MAX_BASE = 340;

export function FocusSwitchDepthPreview() {
  const reduced = useReducedMotion();
  // 0 = target sits at the FAR anchor, 1 = target sits at the NEAR anchor.
  const depth = useSharedValue(reduced ? 0.5 : 0);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (reduced) {
      cancelAnimation(depth);
      depth.value = 0.5;
      return;
    }
    depth.value = 0;
    depth.value = withRepeat(
      withSequence(
        withTiming(1, { duration: CYCLE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: CYCLE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(depth);
  }, [reduced, depth]);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  }

  const base = Math.min(box.width, box.height, MAX_BASE);

  // Anchor geometry, all derived from one base measurement so the whole
  // composition scales down cleanly on small Android screens. The concentric
  // depth rings themselves are owned by the arena, so they stay put when this
  // preview unmounts at session start.
  //
  // Sizes were bumped ~20–25% (relative to base) so the target reads as the
  // hero of the shorter pre-session card rather than a small dot in a large
  // empty box.
  const farY = base * 0.24;
  const nearY = base * 0.27;
  const farRing = base * 0.155;
  const nearRing = base * 0.28;
  const dotSize = base * 0.19;

  const travelStyle = useAnimatedStyle(() => {
    const d = depth.value;
    return {
      transform: [
        { translateY: interpolate(d, [0, 1], [-farY, nearY]) },
        { scale: interpolate(d, [0, 1], [0.62, 1]) },
      ],
      opacity: interpolate(d, [0, 1], [0.55, 1]),
      shadowOpacity: interpolate(d, [0, 1], [0.2, 0.9]),
    };
  });

  const farAnchorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depth.value, [0, 1], [1, 0.32]),
  }));

  const nearAnchorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(depth.value, [0, 1], [0.32, 1]),
  }));

  return (
    <View style={s.root} onLayout={onLayout} pointerEvents="none">
      {base > 0 && (
        <>
          {/* FAR anchor — smaller, softer, label above. */}
          <Animated.View style={[s.layer, farAnchorStyle]}>
            <View style={[s.anchor, { transform: [{ translateY: -farY }] }]}>
              <Text style={[s.label, s.labelFar, { color: FAR_COLOR }]}>FAR</Text>
              <View
                style={[
                  s.anchorRing,
                  {
                    width: farRing,
                    height: farRing,
                    borderRadius: farRing / 2,
                    borderColor: FAR_COLOR,
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* NEAR anchor — larger, sharper, label below. */}
          <Animated.View style={[s.layer, nearAnchorStyle]}>
            <View style={[s.anchor, { transform: [{ translateY: nearY }] }]}>
              <View
                style={[
                  s.anchorRing,
                  {
                    width: nearRing,
                    height: nearRing,
                    borderRadius: nearRing / 2,
                    borderColor: EYE,
                    borderWidth: 2,
                    shadowColor: EYE,
                    shadowOffset: { width: 0, height: 0 },
                    shadowRadius: 10,
                    shadowOpacity: 0.6,
                    elevation: 4,
                  },
                ]}
              />
              <Text style={[s.label, s.labelNear, { color: EYE }]}>NEAR</Text>
            </View>
          </Animated.View>

          {/* The target preview gently transitioning between the two zones. */}
          <View style={s.layer}>
            <Animated.View
              style={[
                s.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                },
                travelStyle,
              ]}
            />
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Every decorative element gets its own centred absolute layer, so offsets
  // are expressed as transforms from the exact centre of the zone.
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchor: { alignItems: 'center', gap: 5 },
  anchorRing: { borderWidth: 1 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Elegant, understated distinction — far is lighter-weight and slightly
  // smaller, near is bolder with a soft glow, so scale/weight carries the
  // depth cue as much as the text does.
  labelFar: { fontWeight: '600', fontSize: 10.5 },
  labelNear: {
    textShadowColor: 'rgba(0,224,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  dot: {
    backgroundColor: EYE,
    shadowColor: EYE,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 6,
  },
});
