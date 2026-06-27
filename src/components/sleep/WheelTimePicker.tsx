/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally
   mutated outside render (scroll callbacks, effects); the React Compiler rule doesn't
   yet model that pattern. */
import { useEffect, useMemo, useRef } from 'react';
import {
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const ITEM_HEIGHT = 54;
const VIEWPORT_HEIGHT = ITEM_HEIGHT * 3; // one row above + selected + one row below
/** Copies of the base list rendered side by side so scrolling never visibly
 * hits an edge — settling re-centers into the middle copy, simulating an
 * infinite wheel without rendering an unbounded list. */
const REPEAT = 3;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const MERIDIEMS = ['AM', 'PM'];

function buildRepeated(base: string[]): string[] {
  const out: string[] = [];
  for (let r = 0; r < REPEAT; r++) out.push(...base);
  return out;
}

const MIDDLE_COPY = Math.floor(REPEAT / 2);

// ─── One scrollable, infinitely-wrapping column (hour / minute / AM-PM) ────────

function WheelColumn({
  base,
  selectedIndex,
  onChange,
  width,
}: {
  base: string[];
  /** Logical index into `base` (e.g. 0–11 for hours). */
  selectedIndex: number;
  onChange: (index: number) => void;
  width: number;
}) {
  const repeated = useMemo(() => buildRepeated(base), [base]);
  const scrollRef = useRef<ScrollView>(null);
  // scrollY tracks the raw contentOffset.y — with paddingVertical: ITEM_HEIGHT
  // the padding naturally cancels in the distance calculation (items are at
  // paddingTop + index*ITEM_HEIGHT, scrollY = selectedIndex*ITEM_HEIGHT),
  // so distance = 0 for the selected item.
  const scrollY = useSharedValue((MIDDLE_COPY * base.length + selectedIndex) * ITEM_HEIGHT);
  const dragging = useRef(false);
  const lastAbsolute = useRef(MIDDLE_COPY * base.length + selectedIndex);

  // Sync to an externally-driven change (e.g. the screen seeding a new time,
  // or switching tabs) — but never fight the user's own in-progress scroll.
  useEffect(() => {
    if (dragging.current) return;
    const currentLogical = ((lastAbsolute.current % base.length) + base.length) % base.length;
    if (currentLogical === selectedIndex) return;
    const next = MIDDLE_COPY * base.length + selectedIndex;
    lastAbsolute.current = next;
    scrollY.value = next * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: next * ITEM_HEIGHT, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  // Android doesn't reliably honor the `contentOffset` prop for initial
  // placement, which would otherwise leave the wheel sitting on the first
  // (wrong) copy. Force it explicitly once, after the first layout.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: lastAbsolute.current * ITEM_HEIGHT, animated: false });
  }, []);

  // Only `onMomentumScrollEnd` reflects where the scroll actually comes to
  // rest — `snapToInterval` guarantees a momentum/snap phase runs after every
  // release, even a slow one, so this always fires. It used to ALSO run from
  // onScrollEndDrag, which reads the offset at the instant of release, before
  // the native snap has settled; recentering off that pre-snap offset fought
  // the in-flight snap animation and caused both the visible jump and the
  // active (white) cell not matching what was actually centered.
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    const rawIndex = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(repeated.length - 1, rawIndex));
    const logical = clamped % base.length;

    // Re-center into the middle copy so there's always buffer left to scroll
    // into next time — invisible since every copy renders the same labels.
    const recentered = MIDDLE_COPY * base.length + logical;
    if (recentered !== clamped) {
      scrollY.value = recentered * ITEM_HEIGHT;
      scrollRef.current?.scrollTo({ y: recentered * ITEM_HEIGHT, animated: false });
    }
    lastAbsolute.current = recentered;

    if (logical !== selectedIndex) {
      void Haptics.selectionAsync();
      onChange(logical);
    }
  };

  const selectAbsolute = (i: number) => {
    dragging.current = false;
    const logical = i % base.length;
    const recentered = MIDDLE_COPY * base.length + logical;
    lastAbsolute.current = recentered;
    scrollY.value = recentered * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: recentered * ITEM_HEIGHT, animated: true });
    if (logical !== selectedIndex) {
      void Haptics.selectionAsync();
      onChange(logical);
    }
  };

  return (
    <View style={{ width, height: VIEWPORT_HEIGHT }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate={0.993}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="always"
        contentOffset={{ x: 0, y: (MIDDLE_COPY * base.length + selectedIndex) * ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        onScroll={e => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onMomentumScrollEnd={settle}
      >
        {repeated.map((label, i) => (
          <WheelCell
            key={i}
            index={i}
            label={label}
            scrollY={scrollY}
            onPress={() => selectAbsolute(i)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** A single row — its size/color/opacity track the scroll position continuously
 * on the UI thread, for a smooth (not snap-cut) wheel feel. Tappable to jump to it. */
function WheelCell({
  index,
  label,
  scrollY,
  onPress,
}: {
  index: number;
  label: string;
  scrollY: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(index * ITEM_HEIGHT - scrollY.value);
    return {
      fontSize: interpolate(distance, [0, ITEM_HEIGHT], [36, 22], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, ITEM_HEIGHT, ITEM_HEIGHT * 2], [1, 0.45, 0.18], Extrapolation.CLAMP),
      color: interpolateColor(distance, [0, ITEM_HEIGHT], ['#FFFFFF', 'rgba(255,255,255,0.3)']),
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <Animated.Text style={[styles.cellText, style]}>{label}</Animated.Text>
    </Pressable>
  );
}

// ─── Combined Hour : Minute  AM/PM picker ────────────────────────────────────────

type Props = {
  /** "HH:MM" 24h string. */
  value: string;
  onChange: (time: string) => void;
};

export function WheelTimePicker({ value, onChange }: Props) {
  const [h, m] = value.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const hourIndex = hour12 - 1;
  const minuteIndex = m;
  const meridiemIndex = h < 12 ? 0 : 1;

  const commit = (nextHourIndex: number, nextMinuteIndex: number, nextMeridiemIndex: number) => {
    const hour24Base = (nextHourIndex + 1) % 12;
    const hour24 = nextMeridiemIndex === 1 ? hour24Base + 12 : hour24Base;
    onChange(`${String(hour24).padStart(2, '0')}:${String(nextMinuteIndex).padStart(2, '0')}`);
  };

  return (
    <View style={styles.row}>
      <View pointerEvents="none" style={styles.highlight} />
      <WheelColumn
        base={HOURS}
        selectedIndex={hourIndex}
        onChange={i => commit(i, minuteIndex, meridiemIndex)}
        width={64}
      />
      <View style={styles.colonCell}>
        <Animated.Text style={styles.colon}>:</Animated.Text>
      </View>
      <WheelColumn
        base={MINUTES}
        selectedIndex={minuteIndex}
        onChange={i => commit(hourIndex, i, meridiemIndex)}
        width={64}
      />
      <WheelColumn
        base={MERIDIEMS}
        selectedIndex={meridiemIndex}
        onChange={i => commit(hourIndex, minuteIndex, i)}
        width={64}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: VIEWPORT_HEIGHT,
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 16,
    right: 16,
    height: ITEM_HEIGHT,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  colonCell: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colon: {
    fontSize: 32,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  cell: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
