import { DailyTip } from '@/components/home/DailyTip';
import { DailyChallenge } from '@/components/home/DailyChallenge';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { ContinueJourney } from '@/components/home/ContinueJourney';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground, GlassCard, SectionLabel } from '@/components/ui';
import { SoftPaywallModal } from '@/components/ui/SoftPaywallModal';
import { StaggerItem } from '@/components/ui/StaggerItem';
import { MPProgressRing } from '@/components/molecules/MPProgressRing';

import { ROUTES } from '@/constants';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useProgressStore } from '@/stores/useProgressStore';
import { useDailyTip } from '@/hooks/useDailyTip';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useGreeting } from '@/hooks/useGreeting';
import { useHomeInsight } from '@/hooks/useHomeInsight';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { getYesterdayScore, saveDailyScore } from '@/services/dailyScorePersistence';
import {
    calculateMindPulseScore,
    getFocusArea,
    pulseScoreTheme,
} from '@/utils/scoring';
import { calculateStreak } from '@/utils/sleepUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { User, Sparkles, ArrowRight } from 'lucide-react-native';

const ONBOARDING_PAYWALL_KEY = '@mindpulse/onboarding-paywall-shown';
const STREAK_PAYWALL_KEY     = '@mindpulse/streak-paywall-shown';



// ── MiniStat — compact score-card breakdown row ───────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color }}>{value}</Text>
      <Text style={{ fontSize: 10.5, color: 'rgba(245,247,251,0.5)', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const router        = useRouter();
  const { user }      = useAuth();
  const { isPremium } = useSubscription();
  const { sessions }  = useSleep();
  const displayName   = user?.displayName ?? user?.email?.split('@')[0] ?? null;
  const rawGreeting   = useGreeting(displayName || '');
  const greeting      = displayName ? rawGreeting : 'Welcome to MindPulse';

  // ── First-time detection (computed inline for efficient re-renders) ───
  const hasCompletedAnySession = useProgressStore((s) =>
    s.eyeExercisesCompleted > 0 ||
    s.eyeGamesPlayed > 0 ||
    s.relaxSessionsCompleted > 0 ||
    s.mindSessionsCompleted > 0 ||
    s.sleepSessionsTracked > 0
  );
  const weeklySessions = useProgressStore((s) => s.weeklySessions);

  const eyeResult   = useEyeScore(user?.uid ?? undefined);
  const mindResult  = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(user?.uid ?? undefined, user?.isAnonymous ?? true);

  const anyLoading     = eyeResult.loading || mindResult.loading || sleepResult.loading;
  const eyes           = eyeResult.loading   ? 0 : eyeResult.score;
  const sleepScore     = sleepResult.loading  ? 0 : sleepResult.score;
  const mind           = mindResult.loading   ? 0 : mindResult.score;
  const mindPulseScore = anyLoading ? 0 : calculateMindPulseScore({ eyeScore: eyes, sleepScore, mindScore: mind });
  const theme          = pulseScoreTheme(mindPulseScore);
  const focusArea      = getFocusArea(eyes, sleepScore, mind);

  const { insight: homeInsight } = useHomeInsight({
    eye: eyeResult, sleep: sleepResult, mind: mindResult,
    focusArea, mindPulseScore, anyLoading,
  });

  const { tip: dailyTip } = useDailyTip({
    mindPulseScore, eyeScore: eyes, sleepScore, mindScore: mind, focusArea, anyLoading,
  });

  const savedRef = useRef(false);
  useEffect(() => {
    if (anyLoading || !user?.uid || savedRef.current) return;
    savedRef.current = true;
    void saveDailyScore(user.uid, {
      mindPulseScore, eyesScore: eyes, sleepScore, mindScore: mind, savedAt: Date.now(),
    });
  }, [anyLoading, user?.uid, mindPulseScore, eyes, sleepScore, mind]);

  const [yesterdayScore, setYesterdayScore] = useState<number | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    void getYesterdayScore(user.uid).then((data) => {
      if (!cancelled) setYesterdayScore(data?.mindPulseScore ?? null);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const scoreDelta = !anyLoading && yesterdayScore !== null ? mindPulseScore - yesterdayScore : null;

  const streak = calculateStreak(sessions);
  const [showOnboardingPaywall, setShowOnboardingPaywall] = useState(false);
  const [showStreakPaywall, setShowStreakPaywall]         = useState(false);

  useEffect(() => {
    if (isPremium || !user?.uid) return;
    let cancelled = false;
    void (async () => {
      const onboardingKey   = `${ONBOARDING_PAYWALL_KEY}:${user.uid}`;
      const onboardingShown = await AsyncStorage.getItem(onboardingKey);
      if (cancelled) return;
      if (!onboardingShown) { setShowOnboardingPaywall(true); return; }
      if (streak < 3) return;
      const streakKey   = `${STREAK_PAYWALL_KEY}:${user.uid}`;
      const streakShown = await AsyncStorage.getItem(streakKey);
      if (cancelled) return;
      if (!streakShown) setShowStreakPaywall(true);
    })();
    return () => { cancelled = true; };
  }, [isPremium, user?.uid, streak]);

  const dismissOnboardingPaywall = () => {
    setShowOnboardingPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${ONBOARDING_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const dismissStreakPaywall = () => {
    setShowStreakPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${STREAK_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const goToPremium = () => router.push(ROUTES.appPremium as never);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase();

  // ── CTA subtle scale pulse (first-time users only) ──────────────────
  const ctaPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (hasCompletedAnySession) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(ctaPulse, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [hasCompletedAnySession, ctaPulse]);

  return (
    <ScreenShell scroll={true} ambient={<AmbientBackground subtle />}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <StaggerItem index={0}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 6, marginBottom: 4,
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{
              fontSize: 11, color: 'rgba(245,247,251,0.45)',
              letterSpacing: 0.5,
            }}>
              {dateLabel}
            </Text>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 21, color: '#f6f8fc', marginTop: 3,
              }}
            >
              {greeting}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push(ROUTES.appProfile as never)}
            activeOpacity={0.7}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}>
              <User size={18} color="rgba(245,247,251,0.7)" strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>
      </StaggerItem>

      {/* ── Hero: Wellness Score Card (returning users only) ────────── */}
      {hasCompletedAnySession && (
      <StaggerItem index={1}>
        <View style={{ marginTop: spacing.sm }}>
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <MPProgressRing
                size={92}
                strokeWidth={8}
                progress={anyLoading ? 0 : mindPulseScore}
                color="#60a5fa"
                value={anyLoading ? '–' : mindPulseScore}
                valueSuffix="SCORE"
                gradient={{
                  id: 'scoreG',
                  stops: [
                    { offset: '0%', color: '#60a5fa' },
                    { offset: '100%', color: '#a78bfa' },
                  ],
                }}
              />

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 2, color: 'rgba(245,247,251,0.45)' }}>
                  OVERALL WELLNESS SCORE
                </Text>
                <Text style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 15, color: '#f6f8fc', marginTop: 4,
                }}>
                  {anyLoading ? 'Loading…' : theme.label}
                </Text>
                {/* Contextual message — encouraging for low scores, not scolding */}
                {!anyLoading && (
                  <Text style={{
                    fontSize: 12, lineHeight: 17,
                    color: 'rgba(245,247,251,0.6)',
                    marginTop: 6, flexShrink: 1,
                  }} numberOfLines={2}>
                    {mindPulseScore >= 80
                      ? (homeInsight ?? "You're thriving! Keep up the amazing work.")
                      : mindPulseScore >= 50
                      ? (homeInsight ?? 'Good progress! Try a session to boost your score.')
                      : "You're building habits — keep going!"}
                  </Text>
                )}
              </View>
            </View>

            {/* Mind Health / Sleep Quality / Focus Level breakdown — only with real data */}
            {(mind > 0 || sleepScore > 0 || eyes > 0) && (
            <View style={{
              flexDirection: 'row', marginTop: 18, paddingTop: 16,
              borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
            }}>
              <MiniStat label="Mind Health" value={anyLoading ? '–' : mind > 0 ? `${mind}%` : '—'} color="#60a5fa" />
              <MiniStat label="Sleep Quality" value={anyLoading ? '–' : sleepScore > 0 ? `${sleepScore}%` : '—'} color="#a78bfa" />
              <MiniStat label="Focus Level" value={anyLoading ? '–' : eyes > 0 ? `${eyes}%` : '—'} color="#22d3ee" />
            </View>
            )}
          </GlassCard>
        </View>
      </StaggerItem>
      )}

      {/* ── Continue Your Journey (returning users only) ──────────── */}
      {hasCompletedAnySession && (
      <StaggerItem index={2}>
        <View style={{ marginTop: spacing.md }}>
          <ContinueJourney />
        </View>
      </StaggerItem>
      )}

      {/* ── Start Journey CTA (first-time users only) ──────────────── */}
      {!hasCompletedAnySession && (
      <StaggerItem index={1}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(ROUTES.appEyeRelax as never)}
          style={{ marginTop: spacing.sm }}
        >
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={18} color="#F59E0B" strokeWidth={2.5} />
              <Text style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 17, color: '#f6f8fc',
              }}>
                Welcome to MindPulse
              </Text>
            </View>
            <Text style={{
              fontSize: 13, color: 'rgba(245,247,251,0.6)',
              marginBottom: 14, lineHeight: 18,
            }}>
              Your wellness journey starts with your first 2-minute eye exercise.
            </Text>
            <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingVertical: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={18} color="#fff" strokeWidth={2.5} />
                <Text style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 14, color: '#fff', letterSpacing: 0.3,
                }}>
                  Start First Exercise
                </Text>
                <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </Animated.View>
          </GlassCard>
        </TouchableOpacity>
      </StaggerItem>
      )}

      {/* ── Feature Grid (Your 5 Pillars) ────────────────────────── */}
      <StaggerItem index={3}>
        <View style={{ marginTop: 24 }}>
          <SectionLabel first>EXPLORE</SectionLabel>
          <FeatureGrid
            showStartHere={!hasCompletedAnySession}
            weeklySessions={{
              'eye-exercise': weeklySessions.eye,
              'eye-games': weeklySessions.eyeGames,
              relax: weeklySessions.relax,
              mind: weeklySessions.mind,
              sleep: weeklySessions.sleep,
            }}
          />
        </View>
      </StaggerItem>

      {/* ── Daily Challenge ───────────────────────────────────────── */}
      <StaggerItem index={4}>
        <View style={{ marginTop: spacing.md }}>
          <DailyChallenge worstArea={focusArea} />
        </View>
      </StaggerItem>

      {/* ── Daily Tip ────────────────────────────────────────────── */}
      <StaggerItem index={5}>
        <View style={{ marginTop: spacing.md }}>
          <SectionLabel first>TODAY'S TIP</SectionLabel>
          <DailyTip tip={dailyTip} focusArea={focusArea} />
        </View>
      </StaggerItem>

      <SoftPaywallModal
        visible={showOnboardingPaywall}
        emoji="✨"
        title="Welcome to MindPulse"
        subtitle="Unlock the full toolkit — guided sessions, eye training, and deeper insights — anytime you're ready."
        onUpgrade={() => { dismissOnboardingPaywall(); goToPremium(); }}
        onDismiss={dismissOnboardingPaywall}
      />
      <SoftPaywallModal
        visible={showStreakPaywall}
        emoji="🔥"
        title="You're building momentum"
        subtitle="3 days in a row — unlock the full toolkit to keep your progress going."
        onUpgrade={() => { dismissStreakPaywall(); goToPremium(); }}
        onDismiss={dismissStreakPaywall}
      />
    </ScreenShell>
  );
}
