import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
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
import { PILLAR_COLORS, RADIUS, STATUS_COLORS } from '@/constants/designSystem';
import { computeSafeGridLayout } from '@/utils/neonCipherGrid';
import type { SymbolSpec } from '@/utils/neonCipherSymbols';
import { NeonCipherSymbolGlyph, type NeonCipherSymbolState } from './NeonCipherSymbol';

interface Props {
  cells: SymbolSpec[];
  gridSize: number;
  /** Per-cell feedback state, keyed by cell index. Cells not present default to 'default'. */
  cellStates?: Record<number, NeonCipherSymbolState>;
  onTapCell: (index: number) => void;
  /** Disabled during preview/feedback beats — the grid is visible but not tappable. */
  disabled?: boolean;
  largeTarget?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
}

const GAP_DP = 8;
const EYE = PILLAR_COLORS.eye;

/**
 * The Cipher Field — a responsive grid of symbols. Sizing always respects
 * the 48dp minimum touch target (`computeSafeGridLayout`), degrading grid
 * density on small screens rather than shrinking cells below it.
 */
export function NeonCipherGrid({
  cells,
  gridSize,
  cellStates,
  onTapCell,
  disabled = false,
  largeTarget = false,
  highContrast = false,
  reducedMotion = false,
}: Props) {
  const [available, setAvailable] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setAvailable({ width, height });
  };

  // `computeSafeGridLayout` already returns the *maximum* cellSize that
  // fits `gridSize` cells in the available space — a tight fit by design.
  // Inflating that further for Large Symbol mode (this used to multiply
  // cellSize by 1.2x here) mathematically guarantees the grid overflows
  // its container by ~20% regardless of grid size, which is what produced
  // the crash/broken layout. Large Symbol mode now enlarges the *symbol*
  // rendered inside each cell instead (see `symbolSizeRatio` below) — the
  // cell grid itself, and therefore the container width, never changes.
  const layout = available
    ? computeSafeGridLayout(available.width, available.height, gridSize, GAP_DP)
    : { gridSize, cellSize: 0 };
  const cellSize = layout.cellSize;
  const symbolSizeRatio = largeTarget ? 0.88 : 0.72;

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {available && (
        <View
          style={[
            styles.grid,
            { width: layout.gridSize * cellSize + (layout.gridSize - 1) * GAP_DP },
          ]}
        >
          {cells.map((spec, index) => (
            <NeonCipherGridCell
              key={index}
              spec={spec}
              index={index}
              total={cells.length}
              size={cellSize}
              symbolSizeRatio={symbolSizeRatio}
              marginRight={(index + 1) % layout.gridSize === 0 ? 0 : GAP_DP}
              state={cellStates?.[index] ?? 'default'}
              disabled={disabled}
              highContrast={highContrast}
              reducedMotion={reducedMotion}
              onPress={() => onTapCell(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface CellProps {
  spec: SymbolSpec;
  index: number;
  total: number;
  size: number;
  /** Symbol render size as a fraction of the cell — grows for Large Symbol
   *  mode without changing the cell/grid dimensions themselves. */
  symbolSizeRatio: number;
  marginRight: number;
  state: NeonCipherSymbolState;
  disabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  onPress: () => void;
}

/**
 * One grid cell with real game-feel: a spring press-scale, an expanding
 * shockwave + glow flash on a correct tap, and a shake + red flash on a
 * wrong one — the same physics-based language FocusSprint's hit effects
 * use (spring bounce, timing-driven shockwave ring), rebuilt for a static
 * grid cell instead of a moving target.
 */
function NeonCipherGridCell({
  spec,
  index,
  total,
  size,
  symbolSizeRatio,
  marginRight,
  state,
  disabled,
  highContrast,
  reducedMotion,
  onPress,
}: CellProps) {
  // Two separate scale values, deliberately: `pressScale` is owned only by
  // the touch handlers below, `bounceScale` only by the state-change effect
  // — sharing one value between a press interaction and a feedback bounce
  // meant they could fight each other if a press landed mid-bounce.
  const pressScale = useSharedValue(1);
  const bounceScale = useSharedValue(1);
  const burst = useSharedValue(0);
  const shake = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (state === 'default') return;
    if (reducedMotion) {
      // Still communicate state, just without motion: an instant glow/flash
      // held briefly instead of an animated burst or shake.
      glowOpacity.value = withSequence(withTiming(1, { duration: 60 }), withDelay(300, withTiming(0, { duration: 120 })));
      return;
    }
    if (state === 'correct') {
      burst.value = 0;
      burst.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
      glowOpacity.value = withSequence(withTiming(1, { duration: 80 }), withDelay(160, withTiming(0, { duration: 240 })));
      bounceScale.value = withSequence(withSpring(1.12, { damping: 8, stiffness: 260 }), withSpring(1, { damping: 12 }));
    } else {
      glowOpacity.value = withSequence(withTiming(1, { duration: 60 }), withDelay(180, withTiming(0, { duration: 220 })));
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 90 }),
        withTiming(-4, { duration: 90 }),
        withTiming(0, { duration: 60 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per state transition, not on every render
  }, [state]);

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * bounceScale.value }, { translateX: shake.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    borderColor: state === 'wrong' ? STATUS_COLORS.error : EYE,
    shadowColor: state === 'wrong' ? STATUS_COLORS.error : EYE,
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.15, 1], [0, 0.7, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.6, 1.6]) }],
  }));

  return (
    <Animated.View style={[{ marginBottom: GAP_DP, marginRight }, cellStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Symbol ${index + 1} of ${total}`}
        disabled={disabled}
        activeOpacity={1}
        onPressIn={() => {
          if (!reducedMotion) pressScale.value = withSpring(0.93, { damping: 14, stiffness: 300 });
        }}
        onPressOut={() => {
          if (!reducedMotion && state === 'default') pressScale.value = withSpring(1, { damping: 14, stiffness: 300 });
        }}
        onPress={onPress}
        style={[
          styles.cell,
          { width: size, height: size },
          highContrast && styles.cellHighContrast,
        ]}
      >
        {state === 'correct' && !reducedMotion && (
          <Animated.View pointerEvents="none" style={[styles.burstRing, { borderColor: EYE }, burstStyle]} />
        )}
        <Animated.View pointerEvents="none" style={[styles.glowRing, glowStyle]} />
        <NeonCipherSymbolGlyph spec={spec} size={size * symbolSizeRatio} state={state} highContrast={highContrast} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.iconBox,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'visible',
  },
  cellHighContrast: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  glowRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: RADIUS.iconBox,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  burstRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: RADIUS.iconBox,
    borderWidth: 2.5,
  },
});
