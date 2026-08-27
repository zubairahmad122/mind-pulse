import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';

interface Props { active: boolean }

const DWELL_MS = 1800;
const CORE = 16, HALO = 32;

/** Widely-separated target pairs (fractions of the open field), cycled
 * deterministically — never a small shared circle. */
const PAIRS: [{ x: number; y: number }, { x: number; y: number }][] = [
  [{ x: 0.16, y: 0.2 }, { x: 0.84, y: 0.82 }], // upper-left ↔ lower-right
  [{ x: 0.16, y: 0.82 }, { x: 0.84, y: 0.2 }], // lower-left ↔ upper-right
  [{ x: 0.14, y: 0.5 }, { x: 0.86, y: 0.5 }], // left-center ↔ right-center
  [{ x: 0.5, y: 0.16 }, { x: 0.5, y: 0.84 }], // upper-center ↔ lower-center
];

/**
 * "Look here → now look there" — a dedicated Visual Flow component (not
 * `SaccadeGuide`, which stays untouched so Eye Reset's Quick Focus step is
 * never affected). Two widely-separated targets, one bright/current and one
 * dim/next, with a deliberate dwell before crossfading — never a small
 * shared orbit. The crossfade itself is driven by `useAnimatedReaction`
 * (UI-thread, reacting to `sideSV`) rather than a React effect, so no
 * render round-trip is needed just to swap which target is brightest.
 */
export function TargetSwitchGuide({ active }: Props) {
  const { width, height } = useWindowDimensions();
  const canvasW = width * 0.9;
  const canvasH = Math.min(Math.max(height * 0.4, 220), 340);

  const [pairIndex, setPairIndex] = useState(0);
  const sideSV = useSharedValue<0 | 1>(0);
  const aOpacity = useSharedValue(1);
  const bOpacity = useSharedValue(0.4);
  const aScale = useSharedValue(1);
  const bScale = useSharedValue(0.72);

  useAnimatedReaction(
    () => sideSV.value,
    (cur, prev) => {
      if (prev === null) return; // initial mount — already at rest state
      const aIsCurrent = cur === 0;
      aOpacity.value = withTiming(aIsCurrent ? 1 : 0.4, { duration: 420 });
      bOpacity.value = withTiming(aIsCurrent ? 0.4 : 1, { duration: 420 });
      aScale.value = withTiming(aIsCurrent ? 1 : 0.72, { duration: 420 });
      bScale.value = withTiming(aIsCurrent ? 0.72 : 1, { duration: 420 });
    },
  );

  // Resetting shared values / local state here (on deactivate) is
  // intentional — it mirrors the remount-reset pattern used elsewhere
  // (e.g. useSessionClock), not a read of stale state.
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/immutability
      sideSV.value = 0;
      // eslint-disable-next-line react-hooks/immutability
      aOpacity.value = 1;
      // eslint-disable-next-line react-hooks/immutability
      bOpacity.value = 0.4;
      // eslint-disable-next-line react-hooks/immutability
      aScale.value = 1;
      // eslint-disable-next-line react-hooks/immutability
      bScale.value = 0.72;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPairIndex(0);
      return;
    }
    const id = setInterval(() => {
      void Haptics.selectionAsync();
      const next = sideSV.value === 0 ? 1 : 0;
      sideSV.value = next;
      if (next === 0) setPairIndex(p => (p + 1) % PAIRS.length);
    }, DWELL_MS);
    return () => clearInterval(id);
  }, [active, sideSV, aOpacity, bOpacity, aScale, bScale]);

  const pair = PAIRS[pairIndex];
  const a = pair[0], b = pair[1];
  const ax = a.x * canvasW, ay = a.y * canvasH;
  const bx = b.x * canvasW, by = b.y * canvasH;

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ax - HALO / 2 }, { translateY: ay - HALO / 2 }, { scale: aScale.value }],
    opacity: aOpacity.value,
  }));
  const bStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bx - HALO / 2 }, { translateY: by - HALO / 2 }, { scale: bScale.value }],
    opacity: bOpacity.value,
  }));

  return (
    <View style={[styles.arena, { width: canvasW, height: canvasH }]}>
      <Animated.View style={[styles.target, aStyle]} pointerEvents="none">
        <View style={styles.halo} />
        <View style={styles.core}><View style={styles.highlight} /></View>
      </Animated.View>
      <Animated.View style={[styles.target, bStyle]} pointerEvents="none">
        <View style={styles.halo} />
        <View style={styles.core}><View style={styles.highlight} /></View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  target: { position: 'absolute', left: 0, top: 0, width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2,
    backgroundColor: '#7B61FF', opacity: 0.3,
  },
  core: {
    width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: '#63E8FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#63E8FF', shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  highlight: {
    position: 'absolute', top: 3, left: 3.5, width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#FFFFFF', opacity: 0.9,
  },
});
