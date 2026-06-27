/**
 * SleepSummaryCard — premium glassmorphism sleep summary for the wellness app.
 *
 * Four-section layout:
 *   1. Sleep Summary: total duration, bedtime → wake-up
 *   2. Sleep Stages: horizontal segmented bar (Light / REM / Deep)
 *   3. Quick Insight: single-sentence, data-driven copy
 *   4. Action Button: "View Full Sleep Report"
 *
 * Uses existing GlassCard + sleep-pillar theme tokens for a cohesive look.
 */
import { GlassCard } from '@/components/ui/GlassCard';
import { ROUTES } from '@/constants';
import { FONTS } from '@/constants/theme';
import { usePillarTheme } from '@/context/PillarContext';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SleepStageData {
  /** Light sleep — e.g. 0.58 */
  lightPct: number;
  /** REM sleep — e.g. 0.25 */
  remPct: number;
  /** Deep sleep — e.g. 0.17 */
  deepPct: number;
  /** Total sleep time in minutes */
  totalMinutes: number;
}

export interface SleepSummaryData {
  /** e.g. "7h 22m" */
  durationLabel: string;
  /** e.g. "11:00 PM" */
  bedtime: string;
  /** e.g. "8:00 AM" */
  wakeTime: string;
  /** Optional sleep score (0–100) to render a mini ring */
  score?: number;
  /** Timestamp for the session date header */
  date?: Date;
}

export interface SleepSummaryCardProps {
  summary: SleepSummaryData;
  stages: SleepStageData;
  insight: string;
  /** Override the accent color (defaults to sleep pillar purple) */
  accent?: string;
  /** Show a loading skeleton instead of data */
  loading?: boolean;
  /** Called when the CTA is pressed — defaults to navigating to history */
  onViewReport?: () => void;
}

// ── Per-stage colour tokens (locked inside the card) ─────────────────────────

const STAGE_COLORS = {
  light: '#60a5fa',   // blue-400
  rem:   '#a78bfa',   // purple-400
  deep:  '#34d399',   // emerald-400
} as const;

const STAGE_LABELS = {
  light: 'Light Sleep',
  rem:   'REM Sleep',
  deep:  'Deep Sleep',
} as const;

// ── Stage helpers ─────────────────────────────────────────────────────────────

interface StageItem {
  key: keyof typeof STAGE_COLORS;
  pct: number;
}

function buildStages(s: SleepStageData): StageItem[] {
  return [
    { key: 'light', pct: s.lightPct },
    { key: 'rem',   pct: s.remPct },
    { key: 'deep',  pct: s.deepPct },
  ];
}

function durationForPct(totalMinutes: number, pct: number): string {
  const mins = Math.round(totalMinutes * pct);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

// ── Mini score ring (optional) ────────────────────────────────────────────────

function MiniScoreRing({ score, accent }: { score: number; accent: string }) {
  const size = 52;
  const strokeWidth = 4;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;

  return (
    <View style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={accent}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{
        position: 'absolute', inset: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{
          fontFamily: FONTS.headingSemi,
          fontSize: 13, color: '#f6f8fc',
        }}>
          {score}
        </Text>
      </View>
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  // Skeleton blocks receive either a pixel number or a percentage string —
  // `as any` lets both coexist without littering the call sites with casts.
  return (
    <View style={{
      width: w as any, height: h, borderRadius: r,
      backgroundColor: 'rgba(255,255,255,0.06)',
    }} />
  );
}

function SleepSummarySkeleton() {
  return (
    <GlassCard noPadding style={{ padding: 20, gap: 22 }}>
      {/* Header */}
      <View style={{ gap: 6 }}>
        <SkeletonBlock w={100} h={13} />
        <SkeletonBlock w={120} h={36} r={6} />
        <SkeletonBlock w={160} h={14} />
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />

      {/* Stages bar */}
      <View style={{ gap: 12 }}>
        <SkeletonBlock w={80} h={13} />
        <SkeletonBlock w="100%" h={10} r={5} />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <SkeletonBlock w={100} h={12} />
          <SkeletonBlock w={100} h={12} />
          <SkeletonBlock w={100} h={12} />
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />

      {/* Insight */}
      <View style={{ gap: 6 }}>
        <SkeletonBlock w={60} h={13} />
        <SkeletonBlock w="100%" h={14} />
        <SkeletonBlock w="70%" h={14} />
      </View>

      {/* Button */}
      <SkeletonBlock w="100%" h={48} r={14} />
    </GlassCard>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SleepSummaryCard({
  summary,
  stages,
  insight,
  accent: accentOverride,
  loading = false,
  onViewReport,
}: SleepSummaryCardProps) {
  const router = useRouter();
  const pillar = usePillarTheme();
  const accent = accentOverride ?? pillar.accent;

  const stageItems = buildStages(stages);

  const handleViewReport = onViewReport ?? (() => {
    router.push(ROUTES.appHistory as never);
  });

  if (loading) return <SleepSummarySkeleton />;

  // ── Safe guard for realistic stage totals near 100% ──────────────────────
  const totalPct = stages.lightPct + stages.remPct + stages.deepPct;
  const normalised = totalPct > 0
    ? stageItems.map(s => ({ ...s, pct: s.pct / totalPct }))
    : stageItems.map((s, i) => ({
        ...s,
        pct: i === 0 ? 0.6 : i === 1 ? 0.25 : 0.15,
      }));

  return (
    <GlassCard noPadding>
      {/* ── Section 1: Sleep Summary ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>LAST NIGHT</Text>
          {summary.score != null && (
            <MiniScoreRing score={summary.score} accent={accent} />
          )}
        </View>

        <Text style={[styles.duration, { color: accent }]}>
          {summary.durationLabel}
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Bedtime</Text>
            <Text style={styles.timeValue}>{summary.bedtime}</Text>
          </View>
          <View style={styles.timeDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerArrow}>→</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Wake-up</Text>
            <Text style={styles.timeValue}>{summary.wakeTime}</Text>
          </View>
        </View>
      </View>

      {/* ── Thin separator ─────────────────────────────────────────────── */}
      <View style={styles.separator} />

      {/* ── Section 2: Sleep Stages Breakdown ─────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SLEEP STAGES</Text>

        {/* Horizontal segmented bar */}
        <View style={styles.segmentedBar}>
          {normalised.map(s => {
            const widthPct = `${Math.round(s.pct * 100)}%` as `${number}%`;
            return (
              <View
                key={s.key}
                style={[
                  styles.segment,
                  {
                    width: widthPct,
                    backgroundColor: STAGE_COLORS[s.key],
                  },
                  s.key === 'light' && styles.segmentFirst,
                  s.key === 'deep'  && styles.segmentLast,
                ]}
              />
            );
          })}
        </View>

        {/* Legend row */}
        <View style={styles.legendRow}>
          {normalised.map(s => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STAGE_COLORS[s.key] }]} />
              <Text style={styles.legendLabel}>{STAGE_LABELS[s.key]}</Text>
              <Text style={[styles.legendValue, { color: STAGE_COLORS[s.key] }]}>
                {Math.round(s.pct * 100)}%
              </Text>
              <Text style={styles.legendDur}>
                {durationForPct(stages.totalMinutes, s.pct)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Thin separator ─────────────────────────────────────────────── */}
      <View style={styles.separator} />

      {/* ── Section 3: Quick Insight ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INSIGHT</Text>
        <View style={styles.insightRow}>
          <View style={[styles.insightAccent, { backgroundColor: accent }]} />
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      </View>

      {/* ── Section 4: Action Button ──────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleViewReport}
        activeOpacity={0.85}
        style={[styles.cta, { borderColor: accent + '40' }]}
      >
        <Text style={[styles.ctaText, { color: accent }]}>
          View Full Sleep Report
        </Text>
        <View style={[styles.ctaArrow, { backgroundColor: accent + '20' }]}>
          <Text style={[styles.ctaArrowText, { color: accent }]}>→</Text>
        </View>
      </TouchableOpacity>
    </GlassCard>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const PADDING_H = 18;

const styles = StyleSheet.create({
  /* Sections */
  section: {
    paddingHorizontal: PADDING_H,
    paddingVertical: 16,
    gap: 10,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 2.2,
    color: 'rgba(245,247,251,0.45)',
  },

  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: PADDING_H,
  },

  /* Section 1 – Summary */
  duration: {
    fontFamily: FONTS.heading,
    fontSize: 36,
    letterSpacing: -1.2,
    lineHeight: 40,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  timeItem: {
    gap: 2,
    flex: 1,
  },

  timeLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    color: 'rgba(245,247,251,0.4)',
    letterSpacing: 0.5,
  },

  timeValue: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
    color: '#f6f8fc',
  },

  timeDivider: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },

  dividerLine: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  dividerArrow: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    lineHeight: 12,
  },

  /* Section 2 – Stages */
  segmentedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },

  segment: {
    height: '100%',
  },

  segmentFirst: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },

  segmentLast: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  legendItem: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },

  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  legendLabel: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: 'rgba(245,247,251,0.55)',
    letterSpacing: 0.3,
  },

  legendValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },

  legendDur: {
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    color: 'rgba(245,247,251,0.3)',
    marginLeft: 4,
  },

  /* Section 3 – Insight */
  insightRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  insightAccent: {
    width: 3,
    height: '100%',
    minHeight: 24,
    borderRadius: 2,
    flexShrink: 0,
    marginTop: 2,
  },

  insightText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(245,247,251,0.75)',
  },

  /* Section 4 – CTA */
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: PADDING_H,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  ctaText: {
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
    letterSpacing: 0.3,
  },

  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaArrowText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
