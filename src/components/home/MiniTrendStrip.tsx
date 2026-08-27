import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { BUTTON, FONTS } from '@/constants/designSystem';

const CHART_HEIGHT = 36;
/** Shorter bars for space-constrained call sites (e.g. Screen Balance
 * Details' Today hero / This Week / Focus Today) — drops the selected-day
 * readout line too. Purely additive: omitting `compact` keeps every
 * existing call site (Home's Featured card) pixel-identical. */
const CHART_HEIGHT_COMPACT = 24;

/** Fixed illustrative wave for the ghost/preview variant — never real data. Taller/more varied than a live chart's low points so it still reads as a deliberate shape, not a row of dashes. */
const GHOST_HEIGHTS = [0.32, 0.58, 0.42, 0.82, 0.5, 0.68, 0.4];

/** Muted indigo/slate — every historical bar's base tone, regardless of mode
 * accent. Each is a top→bottom two-stop gradient (lighter over darker) for a
 * subtle dimensional look instead of a flat fill. */
const HISTORICAL_FILL: readonly [string, string] = ['rgba(147,150,255,0.30)', 'rgba(99,102,241,0.14)'];
const HISTORICAL_FILL_STRONG: readonly [string, string] = ['rgba(165,157,255,0.55)', 'rgba(109,102,241,0.26)'];
const HISTORICAL_FILL_SELECTED: readonly [string, string] = ['rgba(180,172,255,0.72)', 'rgba(124,116,255,0.38)'];
const UNAVAILABLE_FILL: readonly [string, string] = ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)'];
/** Today's bar never collapses to a sliver, even on a very low-value day — it's the chart's one guaranteed focal point. */
const TODAY_MIN_HEIGHT = 14;

export type TrendPoint = {
  key: string;
  /** 'Mon' / 'Tue' / … — ignored for the point flagged `isToday` (renders "Today"). */
  dayLabel: string;
  /** `null` = no data for this point, distinct from a real zero. Unit is caller-defined (ms, minutes, …) — see `formatValue`. */
  value: number | null;
  isToday?: boolean;
};

type LiveProps = {
  variant: 'live';
  /** Oldest → newest, exactly one flagged `isToday`. */
  points: TrendPoint[];
  accent: string;
  formatValue: (value: number) => string;
  label?: string;
  /** Today's bar fill — defaults to the app's cyan→blue primary gradient. */
  todayGradient?: readonly [string, string, ...string[]];
  /** Shorter bars, tighter margins, no selected-day readout line. Default `false` — every existing call site is unaffected unless it opts in. */
  compact?: boolean;
};
type GhostProps = { variant: 'ghost'; label?: string; overlayText?: string };
type Props = LiveProps | GhostProps;

function average(points: TrendPoint[]): number | null {
  const values = points.map(p => p.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Premium compact 7-bar trend strip for the Featured card — no chrome of its
 * own (no card/blur/axes/grid) so it reads as part of the surrounding card
 * rather than a second, unrelated chart. Historical bars are always a muted
 * indigo/slate regardless of mode; only "today" and a tapped day stand out.
 *
 * `variant="ghost"` renders a fixed, very low-opacity illustrative wave with
 * a centered "preview" label — used before usage tracking is enabled, so
 * it's unmistakably not real data (spec: never fabricate values).
 */
export function MiniTrendStrip(props: Props) {
  // Hooks run unconditionally on every render (rules-of-hooks) — the ghost
  // variant just never reads `points`/`selectedKey` below.
  const points = props.variant === 'live' ? props.points : [];
  const pointsKey = points.map(p => p.key).join('|');
  const defaultKey = points.find(p => p.isToday)?.key ?? points[points.length - 1]?.key ?? '';

  // Resets the selection back to "today" whenever a fresh fetch swaps in a
  // new `points` array — adjusting state during render (React's documented
  // pattern for "state that depends on props changing") rather than an
  // effect, so there's no extra render/cascading setState.
  const [prevPointsKey, setPrevPointsKey] = useState(pointsKey);
  const [selectedKey, setSelectedKey] = useState(defaultKey);
  if (pointsKey !== prevPointsKey) {
    setPrevPointsKey(pointsKey);
    setSelectedKey(defaultKey);
  }

  if (props.variant === 'ghost') {
    const label = props.label ?? 'PREVIEW';
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.ghostBarsRow}>
          {GHOST_HEIGHTS.map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, styles.barGhost, { height: Math.round(h * CHART_HEIGHT) }]} />
            </View>
          ))}
          <View style={styles.ghostOverlay} pointerEvents="none">
            <View style={styles.ghostBadge}>
              <Lock size={10.5} color="rgba(245,247,251,0.55)" strokeWidth={2.2} />
              <Text style={styles.ghostOverlayText}>{props.overlayText ?? 'Your trends will appear here'}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const { accent, formatValue, label = '7-DAY TREND', todayGradient = BUTTON.primaryGradient, compact = false } = props;
  const chartHeight = compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT;
  const todayMinHeight = compact ? 10 : TODAY_MIN_HEIGHT;
  const max = points.reduce((acc, p) => Math.max(acc, p.value ?? 0), 0) || null;
  const avg = average(points);
  const selected = points.find(p => p.key === selectedKey) ?? null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.avgText}>{avg != null ? `Avg ${formatValue(avg)}` : 'Avg —'}</Text>
      </View>
      {!compact && (
        <Text style={styles.selectedText}>
          {selected ? (selected.isToday ? 'Today' : selected.dayLabel) : ''}
          {selected ? (selected.value != null ? ` · ${formatValue(selected.value)}` : ' · —') : ''}
        </Text>
      )}
      <View style={[styles.barsRow, { height: chartHeight }, compact && styles.barsRowCompact]}>
        {points.map(p => {
          const unavailable = p.value === null;
          const raw = unavailable || max === null ? 4 : Math.round(((p.value ?? 0) / max) * chartHeight);
          // Today always reads as a real bar, never a sliver, regardless of how small today's value is relative to the week's max.
          const h = p.isToday && !unavailable ? Math.max(todayMinHeight, raw) : Math.max(6, raw);
          const isSelected = p.key === selectedKey;
          const strong = !unavailable && !p.isToday && max != null && (p.value ?? 0) >= max * 0.7;
          const a11yLabel = `${p.isToday ? 'Today' : p.dayLabel}${p.value != null ? `, ${formatValue(p.value)}` : ', no data'}`;
          const fill = p.isToday && !unavailable
            ? todayGradient
            : unavailable
              ? UNAVAILABLE_FILL
              : isSelected
                ? HISTORICAL_FILL_SELECTED
                : strong
                  ? HISTORICAL_FILL_STRONG
                  : HISTORICAL_FILL;

          return (
            <Pressable
              key={p.key}
              onPress={() => setSelectedKey(p.key)}
              style={[styles.barCol, { height: chartHeight }]}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityState={{ selected: isSelected }}
              hitSlop={4}
            >
              {isSelected ? <View style={styles.selectedHighlight} /> : null}
              <LinearGradient
                colors={fill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.bar,
                  p.isToday && !unavailable ? styles.barToday : null,
                  { height: h },
                  p.isToday && !unavailable ? { shadowColor: todayGradient[0] } : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.dayLabelsRow, compact && styles.dayLabelsRowCompact]}>
        {points.map(p => (
          <Text
            key={p.key}
            style={[styles.dayLabel, p.isToday && { color: accent, fontWeight: '800' }]}
            numberOfLines={1}
          >
            {p.isToday ? 'Today' : p.dayLabel}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  wrapCompact: {
    marginTop: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(245,247,251,0.38)',
    textTransform: 'uppercase',
  },
  avgText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.42)',
  },
  selectedText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.72)',
    marginTop: 3,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 5,
    height: CHART_HEIGHT,
    marginTop: 6,
  },
  barsRowCompact: {
    marginTop: 4,
  },
  ghostBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 5,
    height: CHART_HEIGHT,
    marginTop: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_HEIGHT,
  },
  bar: {
    width: '62%',
    borderRadius: 4,
    minHeight: 4,
  },
  barToday: {
    width: '62%',
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  barGhost: {
    width: '62%',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  selectedHighlight: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    left: 1,
    right: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 5,
  },
  dayLabelsRowCompact: {
    marginTop: 3,
  },
  dayLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.32)',
    textAlign: 'center',
  },
  ghostOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Glass backdrop so the overlay text stays legible against the wave underneath it, instead of floating raw over the bars. */
  ghostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(8,11,26,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ghostOverlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.6)',
  },
});
