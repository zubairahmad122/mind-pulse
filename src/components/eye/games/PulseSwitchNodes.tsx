import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PILLAR_COLORS, STATUS_COLORS } from '@/constants/designSystem';
import { PULSE_NODE_COUNT } from '@/utils/pulseSwitchEngine';

const EYE = PILLAR_COLORS.eye;
const NODE_SIZE = 62;
const FIELD_SIZE = 260;
const RADIUS = FIELD_SIZE / 2 - NODE_SIZE / 2 - 4;

export type PulseNodeState = 'idle' | 'showing' | 'correct' | 'wrong';

interface Props {
  /** Node currently being highlighted during sequence playback (null once playback ends). */
  playbackIndex: number | null;
  /** Per-node feedback state after a tap, keyed by node index. */
  nodeStates?: Record<number, PulseNodeState>;
  onTapNode: (index: number) => void;
  disabled?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

/**
 * Pulse Switch's node field — a radial ring of glowing nodes around empty
 * center space, deliberately not a rectangular grid, since the mechanic is
 * attention-switching speed and sequence order, not symbol recognition or
 * spatial search. This is the strongest visual differentiator from Neon
 * Cipher's tile grid: no rows/columns at all.
 */
export function PulseSwitchNodes({
  playbackIndex,
  nodeStates,
  onTapNode,
  disabled = false,
  reducedMotion = false,
  highContrast = false,
}: Props) {
  const nodes = Array.from({ length: PULSE_NODE_COUNT }, (_, i) => i);

  return (
    <View style={styles.radialField}>
      {nodes.map(i => {
        const angle = (i / PULSE_NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = FIELD_SIZE / 2 + RADIUS * Math.cos(angle) - NODE_SIZE / 2;
        const y = FIELD_SIZE / 2 + RADIUS * Math.sin(angle) - NODE_SIZE / 2;
        return (
          <View key={i} style={[styles.nodeSlot, { left: x, top: y }]}>
            <PulseNode
              index={i}
              isPlayback={playbackIndex === i}
              state={nodeStates?.[i] ?? 'idle'}
              disabled={disabled}
              reducedMotion={reducedMotion}
              highContrast={highContrast}
              onPress={() => onTapNode(i)}
            />
          </View>
        );
      })}
    </View>
  );
}

function PulseNode({
  isPlayback,
  state,
  disabled,
  reducedMotion,
  highContrast,
  onPress,
}: {
  index: number;
  isPlayback: boolean;
  state: PulseNodeState;
  disabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  onPress: () => void;
}) {
  const pressScale = useSharedValue(1);
  const bounceScale = useSharedValue(1);
  const shake = useSharedValue(0);
  // Two separate glow values, deliberately: `playbackGlow` is owned only by
  // the playback-toggle effect, `tapGlow` only by the tap-feedback effect —
  // sharing one value between them is the same footgun fixed in
  // NeonCipherGrid's tile animation (they'd fight each other if a tap
  // landed while playback glow was still settling).
  const playbackGlow = useSharedValue(0);
  const tapGlow = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      playbackGlow.value = isPlayback ? 1 : 0;
      return;
    }
    playbackGlow.value = isPlayback
      ? withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) })
      : withTiming(0, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per playback toggle
  }, [isPlayback]);

  useEffect(() => {
    if (state === 'idle') return;
    if (reducedMotion) {
      tapGlow.value = withSequence(withTiming(1, { duration: 60 }), withDelay(260, withTiming(0, { duration: 120 })));
      return;
    }
    if (state === 'correct') {
      bounceScale.value = withSequence(withSpring(1.14, { damping: 8, stiffness: 260 }), withSpring(1.04, { damping: 12 }));
      tapGlow.value = withSequence(withTiming(1, { duration: 70 }), withDelay(150, withTiming(0, { duration: 220 })));
    } else if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 90 }),
        withTiming(-4, { duration: 90 }),
        withTiming(0, { duration: 60 }),
      );
      tapGlow.value = withSequence(withTiming(1, { duration: 60 }), withDelay(160, withTiming(0, { duration: 200 })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per state transition
  }, [state]);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * bounceScale.value }, { translateX: shake.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: Math.max(interpolate(playbackGlow.value, [0, 1], [0, 0.9]), interpolate(tapGlow.value, [0, 1], [0, 0.9])),
    borderColor: state === 'wrong' ? STATUS_COLORS.error : EYE,
    shadowColor: state === 'wrong' ? STATUS_COLORS.error : EYE,
  }));

  const dotColor = state === 'wrong' ? STATUS_COLORS.error : isPlayback || state === 'correct' ? EYE : highContrast ? '#FFFFFF' : 'rgba(233,240,255,0.55)';

  return (
    <Animated.View style={nodeStyle}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Pulse node"
        disabled={disabled}
        activeOpacity={1}
        onPressIn={() => { if (!reducedMotion) pressScale.value = withSpring(0.92, { damping: 14, stiffness: 300 }); }}
        onPressOut={() => { if (!reducedMotion) pressScale.value = withSpring(1, { damping: 14, stiffness: 300 }); }}
        onPress={onPress}
        style={[styles.node, highContrast && styles.nodeHighContrast]}
      >
        <Animated.View pointerEvents="none" style={[styles.glowRing, glowStyle]} />
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  radialField: {
    width: FIELD_SIZE, height: FIELD_SIZE,
  },
  nodeSlot: {
    position: 'absolute', width: NODE_SIZE, height: NODE_SIZE,
  },
  node: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  nodeHighContrast: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.24)' },
  glowRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: NODE_SIZE / 2, borderWidth: 2,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10,
  },
  dot: { width: 20, height: 20, borderRadius: 10 },
});
