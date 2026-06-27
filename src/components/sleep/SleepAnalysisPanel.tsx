import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, FileText, Moon } from 'lucide-react-native';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { ActionCard } from '@/components/ui/ActionCard';
import { ROUTES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { useSleepScore } from '@/hooks/useSleepScore';
import { useSleepRecommendation } from '@/hooks/useSleepRecommendation';
import { formatDuration } from '@/utils/sleepUtils';
import { SleepSummaryCard, type SleepSummaryData, type SleepStageData } from './SleepSummaryCard';
import { estimateStages } from '@/utils/stageEstimator';

// ── GlassPanel — flat glass card, matches the Home dashboard's language ─────

function GlassPanel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{
      borderRadius: 22, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    }, style]}>
      <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(167,139,250,0.08)', 'rgba(10,14,28,0.5)']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        pointerEvents="none"
      />
      <View style={{ padding: 18 }}>{children}</View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{
      fontSize: 10, fontWeight: '600', letterSpacing: 2,
      color: 'rgba(245,247,251,0.42)',
      marginBottom: 11, marginLeft: 2,
    }}>
      {children}
    </Text>
  );
}

type Props = { onStartSession: () => void };

export function SleepAnalysisPanel({ onStartSession }: Props) {
  const router = useRouter();
  const { user, isGuestMode } = useAuth();
  const { sessions } = useSleep();
  useSleepSchedule(user?.uid, isGuestMode);
  const sleepResult = useSleepScore(user?.uid, isGuestMode);
  const rec = useSleepRecommendation();

  const lastSession = [...sessions].sort((a, b) => b.startTime - a.startTime)[0] ?? null;

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
    if (!lastSession) return 'No sessions logged yet — start tracking to get insights.';
    const deepPct = sleepStages.deepPct;
    const remPct = sleepStages.remPct;
    const score = sleepResult.score;

    if (score >= 80) {
      const tips = [
        'Excellent night — your sleep quality is in the top tier.',
        'You achieved a healthy balance of REM and deep sleep.',
        'Great restorative sleep — keep your current routine.',
      ];
      return tips[Math.floor(Math.random() * tips.length)];
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
  }, [sleepResult, lastSession, sleepStages]);

  const { last7Minutes, max7, avg7Min, avg30Min } = useMemo(() => {
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
    const daysWithData = days.filter(m => m > 0).length;
    const avg7 = daysWithData > 0 ? Math.round(days.reduce((s, m) => s + m, 0) / daysWithData) : 0;

    const cutoff30 = todayStart.getTime() - 30 * 86_400_000;
    const last30Sessions = sessions.filter(s => s.startTime >= cutoff30);
    const avg30 = last30Sessions.length > 0
      ? Math.round(last30Sessions.reduce((s, x) => s + x.durationMinutes, 0) / last30Sessions.length)
      : 0;

    return { last7Minutes: days, max7: Math.max(...days, 60), avg7Min: avg7, avg30Min: avg30 };
  }, [sessions]);

  return (
    <View style={{ gap: 20 }}>
      {/* Premium Sleep Summary Card — replaces the legacy score ring + stat row */}
      {sleepSummary ? (
        <SleepSummaryCard
          summary={sleepSummary}
          stages={sleepStages}
          insight={insightText}
          loading={sleepResult.loading}
        />
      ) : (
        <SleepSummaryCard
          summary={{
            durationLabel: '--',
            bedtime: '--:--',
            wakeTime: '--:--',
          }}
          stages={{ totalMinutes: 0, lightPct: 0, remPct: 0, deepPct: 0 }}
          insight="Your sleep data will appear here after your first tracking session."
        />
      )}

      {/* Insights & Recommendations — the app's real data drives one combined,
          rule-based/AI message rather than two separately-fabricated sections. */}
      <View>
        <SectionLabel>INSIGHTS & RECOMMENDATIONS</SectionLabel>
        <GlassPanel>
          <Text style={{ fontSize: 13, lineHeight: 20, color: 'rgba(245,247,251,0.75)' }}>
            {rec.loading ? 'Analysing your sleep data…' : rec.message}
          </Text>
        </GlassPanel>
      </View>

      {/* Trends */}
      <View>
        <SectionLabel>SLEEP TRENDS</SectionLabel>
        <GlassPanel>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#f6f8fc' }}>
                {avg7Min > 0 ? formatDuration(avg7Min) : '–'}
              </Text>
              <Text style={{ fontSize: 10.5, color: 'rgba(245,247,251,0.5)', marginTop: 2 }}>7-day avg</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#f6f8fc' }}>
                {avg30Min > 0 ? formatDuration(avg30Min) : '–'}
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
                  backgroundColor: '#a78bfa', borderRadius: 5,
                  opacity: min > 0 ? 0.9 : 0.15,
                }}
              />
            ))}
          </View>
        </GlassPanel>
      </View>

      {/* Quick Actions */}
      <View>
        <SectionLabel>QUICK ACTIONS</SectionLabel>
        <ActionCard icon={Moon} title="Start Sleep Session" description="Track tonight's rest" accent="#a78bfa" onPress={onStartSession} />
        <ActionCard icon={Bell} title="Tracking Settings" description="Alarm & smart wake" accent="#60a5fa" onPress={() => router.push(ROUTES.appAlarmSettings)} />
        <ActionCard icon={FileText} title="View Full Report" description="Your sleep history" accent="#4FC3F7" onPress={() => router.push(ROUTES.appHistory as never)} />
      </View>
    </View>
  );
}
