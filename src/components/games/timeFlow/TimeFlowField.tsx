import { memo, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { FlowCell, FlowLayout } from "@/engine/core/games/timeFlow";

const CYAN = "#72E8F6";

type CellState =
  | "idle"
  | "trail"
  | "active"
  | "input"
  | "correct"
  | "incorrect";

const TimeFlowCell = memo(function TimeFlowCell({
  cell,
  size,
  state,
  order,
  interactive,
  onPress,
  reducedMotion,
}: {
  cell: FlowCell;
  size: number;
  state: CellState;
  order?: number;
  interactive: boolean;
  onPress?: () => void;
  reducedMotion: boolean;
}) {
  const scale = useSharedValue(1),
    glow = useSharedValue(0);
  useEffect(() => {
    const lit =
      state === "active" || state === "correct" || state === "incorrect";
    glow.value = withTiming(
      lit ? 1 : state === "trail" || state === "input" ? 0.34 : 0,
      { duration: reducedMotion ? 60 : lit ? 120 : 180 },
    );
    scale.value =
      reducedMotion || !lit
        ? 1
        : withSequence(
            withTiming(1.045, { duration: 120 }),
            withTiming(1, { duration: 220 }),
          );
  }, [glow, reducedMotion, scale, state]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.84 + glow.value * 0.16,
  }));
  const active = state === "active",
    correct = state === "correct",
    wrong = state === "incorrect",
    selected = state === "input";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Grid cell row ${cell.row + 1}, column ${cell.column + 1}`}
      accessibilityState={{ disabled: !interactive, selected }}
      disabled={!interactive}
      onPress={onPress}
      style={{ width: size, height: size }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.cell,
            {
              width: size,
              height: size,
              borderRadius: Math.max(17, size * 0.2),
            },
            animated,
            pressed && interactive && styles.pressed,
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient
                id={`tile-${cell.index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <Stop
                  offset="0"
                  stopColor={active || correct ? "#193F61" : "#171A36"}
                />
                <Stop
                  offset="1"
                  stopColor={active || correct ? "#12395A" : "#10152C"}
                />
              </LinearGradient>
            </Defs>
            {(active || correct || wrong) && (
              <Rect
                x="2"
                y="2"
                width="96"
                height="96"
                rx="22"
                fill={wrong ? "rgba(239,113,133,.12)" : "rgba(114,232,246,.12)"}
              />
            )}
            <Rect
              x="5"
              y="5"
              width="90"
              height="90"
              rx="20"
              fill={`url(#tile-${cell.index})`}
              stroke={
                wrong
                  ? "#EF7185"
                  : correct
                    ? "#62E3A5"
                    : active || selected
                      ? CYAN
                      : "rgba(126,143,204,.28)"
              }
              strokeWidth={active || correct || wrong || selected ? 3 : 1.2}
            />
            <Rect
              x="13"
              y="13"
              width="74"
              height="74"
              rx="15"
              fill="none"
              stroke={
                active || correct
                  ? "rgba(114,232,246,.32)"
                  : "rgba(169,139,255,.08)"
              }
              strokeWidth="1"
            />
            <Circle
              cx="50"
              cy="50"
              r={active || correct ? 17 : 13}
              fill={
                active || correct
                  ? "rgba(114,232,246,.16)"
                  : state === "trail"
                    ? "rgba(114,232,246,.06)"
                    : "rgba(95,111,180,.045)"
              }
            />
            <Path
              d="M 50 38 L 62 50 L 50 62 L 38 50 Z"
              fill={
                active || correct
                  ? "rgba(114,232,246,.24)"
                  : "rgba(169,139,255,.05)"
              }
              stroke={active || correct ? CYAN : "rgba(145,157,210,.24)"}
              strokeWidth="1.7"
            />
            <Circle
              cx="50"
              cy="50"
              r={active || correct ? 4.5 : 3}
              fill={
                wrong
                  ? "#EF7185"
                  : active || correct
                    ? CYAN
                    : "rgba(130,151,206,.35)"
              }
            />
            {[
              [24, 24],
              [76, 24],
              [24, 76],
              [76, 76],
            ].map(([x, y], index) => (
              <Path
                key={index}
                d={`M ${x - 4} ${y} L ${x} ${y} L ${x} ${y + (y < 50 ? 4 : -4)}`}
                fill="none"
                stroke={
                  active || correct
                    ? "rgba(114,232,246,.52)"
                    : "rgba(131,143,193,.16)"
                }
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            ))}
          </Svg>
          {order !== undefined && (
            <View style={styles.order}>
              <Text style={styles.orderText}>{order}</Text>
            </View>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
});

export const TimeFlowField = memo(function TimeFlowField({
  layout,
  size,
  activeCellIds = [],
  previousCellIds = [],
  interactive = false,
  onCellPress,
  selectedOrder = [],
  showOrder = true,
  correctCellId,
  wrongCellId,
  reducedMotion = false,
}: {
  layout: FlowLayout;
  size: number;
  activeCellIds?: string[];
  previousCellIds?: string[];
  interactive?: boolean;
  onCellPress?: (id: string) => void;
  selectedOrder?: string[];
  showOrder?: boolean;
  correctCellId?: string;
  wrongCellId?: string;
  reducedMotion?: boolean;
}) {
  const largestDimension = Math.max(layout.rows, layout.columns),
    gap =
      largestDimension === 3
        ? Math.max(12, size * 0.045)
        : Math.max(8, size * 0.03),
    tile = Math.min(
      (size - gap * (layout.columns - 1)) / layout.columns,
      (size - gap * (layout.rows - 1)) / layout.rows,
    ),
    width = tile * layout.columns + gap * (layout.columns - 1),
    height = tile * layout.rows + gap * (layout.rows - 1);
  return (
    <View style={[styles.grid, { width, height, gap }]}>
      {layout.cells.map((cell) => {
        const selectedIndex = selectedOrder.lastIndexOf(cell.id);
        const state: CellState =
          cell.id === wrongCellId
            ? "incorrect"
            : cell.id === correctCellId
              ? "correct"
              : activeCellIds.includes(cell.id)
                ? "active"
                : previousCellIds.includes(cell.id)
                  ? "trail"
                  : selectedIndex >= 0
                    ? "input"
                    : "idle";
        return (
          <TimeFlowCell
            key={cell.id}
            cell={cell}
            size={tile}
            state={state}
            order={
              showOrder && selectedIndex >= 0 ? selectedIndex + 1 : undefined
            }
            interactive={interactive}
            onPress={() => onCellPress?.(cell.id)}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { alignSelf: "center", flexDirection: "row", flexWrap: "wrap" },
  cell: {
    overflow: "visible",
    shadowColor: CYAN,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  order: {
    position: "absolute",
    right: 7,
    top: 7,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CYAN,
    borderWidth: 2,
    borderColor: "#10152A",
  },
  orderText: { fontSize: 10, fontWeight: "900", color: "#07131D" },
});
