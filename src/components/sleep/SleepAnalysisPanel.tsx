import { useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Clock, Moon, MoonStar, TrendingUp } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { useSleepScore } from '@/hooks/useSleepScore';
import { AnalysisSkeleton } from '@/components/sleep/Skeletons';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { formatDuration } from '@/utils/sleepUtils';
import { SleepSummaryCard, type SleepSummaryData, type SleepStageData } from './SleepSummaryCard';
import { estimateStages } from '@/utils/stageEstimator';

// Same indigo as the rest of the Sleep tab (Tonight, Routine).
const INDIGO = PILLAR_COLORS.sleep;

// ── GlassPanel — flat glass card, matches the Home dashboard's language ─────

function GlassPanel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{
      borderRadius: 24, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    }, style]}>
      <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(108,99,255,0.08)', 'rgba(10,14,28,0.5)']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        pointerEvents="none"
      />
      <View style={{ padding: 18 }}>{children}</View>
    </View>
  );
}

type Props = { onStartSession: () => void };

export function SleepAnalysisPanel({ onStartSession }: Props) {
  const { user, isGuestMode } = useAuth();
  const { sessions } = useSleep();
  useSleepSchedule(user?.uid, isGuestMode);
  const sleepResult = useSleepScore(user?.uid, isGuestMode);

  const lastSession = [...sessions].sort((a, b) => b.startTime - a.startTime)[0] ?? null;
  const hasData = lastSession != null;

  // ── Build summary data for the SleepSummaryCard ──────────────────────
  const sleepSummary: SleepSummaryData | null = useMemo(() => {
    if (!lastSession) return null;
    const start = new Date(lastSession.startTime);
    const end = new Date(lastSession.endTime);
    const fmtTime = (d: Date) =>
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      durationLabel: formatDuration(lastSession.durationMinutes),
      bedtime: fmtTime(start),
      wakeTime: fmtTime(end),
      score: sleepResult.loading ? undefined : sleepResult.score,
      date: start,
    };
  }, [lastSession, sleepResult]);

  // ── Estimate sleep stages (deterministic from session id) ────────────
  const sleepStages: SleepStageData = useMemo(() => {
    const mins = lastSession?.durationMinutes ?? 420;
    const id = lastSession?.id ?? 'fallback';
    return estimateStages(id, mins);
  }, [lastSession]);

  // ── Insight text derived from real score + data ──────────────────────
  const insightText = useMemo(() => {
    if (sleepResult.loading) return 'Analysing your sleep data…';
    const deepPct = sleepStages.deepPct;
    const remPct = sleepStages.remPct;
    const score = sleepResult.score;

    if (score >= 80) {
      const tips = [
        'Excellent night — your sleep quality is in the top tier.',
        'You achieved a healthy balance of REM and deep sleep.',
        'Great restorative sleep — keep your current routine.',
      ];
      // Deterministic pick (stays stable across re-renders for the same night).
      return tips[sleepStages.totalMinutes % tips.length];
    }
    if (score >= 60) {
      return deepPct >= 0.2
        ? 'Good sleep quality — your deep sleep is solid. Try extending your window slightly for better REM.'
        : `Your deep sleep was ${deepPct < 0.15 ? 'below average' : 'moderate'} last night. Consider winding down 30 minutes earlier.`;
    }
    if (remPct < 0.2) {
      return 'Your REM sleep was limited — this affects memory and mood. Aim for a longer, uninterrupted sleep window.';
    }
    return 'Your sleep was fragmented. Try reducing screen time 1 hour before bed for deeper rest.';
  }, [sleepResult, sleepStages]);

  const { last7Minutes, max7, avg7Min, avg30Min, daysWithData } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    // 7-day trend — total minutes slept per calendar day, oldest to newest
    const days = Array.from({ length: 7 }, (_, i) => {
      const dayStart = todayStart.getTime() - (6 - i) * 86_400_000;
      const dayEnd = dayStart + 86_400_000;
      return sessions
        .filter(s => s.startTime >= dayStart && s.startTime < dayEnd)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
    });
    const withData = days.filter(m => m > 0).length;
    const avg7 = withData > 0 ? Math.round(days.reduce((s, m) => s + m, 0) / withData) : 0;

    const cutoff30 = todayStart.getTime() - 30 * 86_400_000;
    const last30Sessions = sessions.filter(s => s.startTime >= cutoff30);
    const avg30 = last30Sessions.length > 0
      ? Math.round(last30Sessions.reduce((s, x) => s + x.durationMinutes, 0) / last30Sessions.length)
      : 0;

    return { last7Minutes: days, max7: Math.max(...days, 60), avg7Min: avg7, avg30Min: avg30, daysWithData: withData };
  }, [sessions]);

  // ── Loading — show the layout settling in, not dashes/zeros ──────────
  if (sleepResult.loading) {
    return <AnalysisSkeleton />;
  }

  // ── Empty state — no fabricated charts, dashes, or zeros. Copy is
  // deliberately scoped to what this screen actually measures once data
  // exists (duration, bedtime/wake consistency, weekly sessions) — never
  // "sleep stages", which `estimateStages` only guesses at, not measures. ──
  if (!hasData) {
    return (
      <View style={{ gap: 14 }}>
        <GlassPanel style={{ paddingVertical: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.emptyIcon}>
              <MoonStar size={24} color={INDIGO} />
            </View>
            <Text style={styles.emptyTitle}>No sleep tracked yet</Text>
            <Text style={styles.emptyDesc}>
              Complete your first sleep session to unlock your duration, consistency, and weekly trends.
            </Text>
            <TouchableOpacity
              onPress={onStartSession}
              activeOpacity={0.85}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Go to Tonight</Text>
              <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </GlassPanel>

        <View>
          <SectionLabel first>AFTER YOUR FIRST NIGHT</SectionLabel>
          <GlassPanel style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
            {[
              { icon: TrendingUp, title: 'Duration trend', desc: 'See how long you sleep across the week' },
              { icon: Clock, title: 'Bedtime consistency', desc: 'See how steady your schedule becomes' },
              { icon: Moon, title: 'Weekly progress', desc: 'Review completed sleep sessions' },
            ].map((row, i, arr) => (
              <View
                key={row.title}
                style={[styles.previewRow, i < arr.length - 1 && styles.previewRowDivider]}
              >
                <View style={styles.previewIcon}>
                  <row.icon size={15} color={INDIGO} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{row.title}</Text>
                  <Text style={styles.previewDesc}>{row.desc}</Text>
                </View>
              </View>
            ))}
          </GlassPanel>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {/* Premium Sleep Summary Card — real data only */}
      {sleepSummary && (
        <SleepSummaryCard
          summary={sleepSummary}
          stages={sleepStages}
          insight={insightText}
          loading={sleepResult.loading}
        />
      )}

      {/* Trends — only once there's enough history to be meaningful */}
      <View>
        <SectionLabel first>SLEEP TRENDS</SectionLabel>
        {daysWithData >= 3 ? (
          <GlassPanel>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: '#f6f8fc' }}>
                  {formatDuration(avg7Min)}
                </Text>
                <Text style={{ fontSize: 10.5, color: 'rgba(245,247,251,0.5)', marginTop: 2 }}>7-day avg</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: '#f6f8fc' }}>
                  {avg30Min > 0 ? formatDuration(avg30Min) : formatDuration(avg7Min)}
                </Text>
                <Text style={{ fontSize: 10.5, color: 'rgba(245,247,251,0.5)', marginTop: 2 }}>30-day avg</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 56 }}>
              {last7Minutes.map((min, i) => (
                <View
                  key={i}
                  style={{
                    width: 22, height: Math.max(4, (min / max7) * 56),
                    backgroundColor: INDIGO, borderRadius: 5,
                    opacity: min > 0 ? 0.9 : 0.15,
                  }}
                />
              ))}
            </View>
          </GlassPanel>
        ) : (
          <GlassPanel>
            <Text style={{ fontSize: 13, lineHeight: 20, color: 'rgba(245,247,251,0.6)' }}>
              Track 3 nights to see your sleep trends.
            </Text>
          </GlassPanel>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(108,99,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    color: '#f6f8fc',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(245,247,251,0.55)',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  // Secondary action, not the primary CTA — outline + glass fill, no gradient.
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 16,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  previewRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108,99,255,0.14)',
  },
  previewTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.9)',
  },
  previewDesc: {
    fontSize: 11.5,
    color: 'rgba(245,247,251,0.5)',
    marginTop: 1,
  },
});
