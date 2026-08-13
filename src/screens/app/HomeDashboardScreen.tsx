import { DailyChallenge } from '@/components/home/DailyChallenge';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { ResetPickerSheet } from '@/components/home/ResetPickerSheet';
import { ScreenBalanceCard } from '@/components/home/ScreenBalanceCard';
import { TodaysJourneyCard } from '@/components/home/TodaysJourneyCard';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground, SectionLabel } from '@/components/ui';
import { SoftPaywallModal } from '@/components/ui/SoftPaywallModal';
import { StaggerItem } from '@/components/ui/StaggerItem';
import { WeeklyProgressRow } from '@/components/ui/WeeklyProgressRow';

import { ROUTES } from '@/constants';
import { FONTS, PILLAR_COLORS, SPACING, TYPOGRAPHY } from '@/constants/designSystem';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useProgressStore } from '@/stores/useProgressStore';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useGreeting } from '@/hooks/useGreeting';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { saveDailyScore } from '@/services/dailyScorePersistence';
import {
    calculateMindPulseScore,
    getFocusArea,
    pulseScoreTheme,
} from '@/utils/scoring';
import { useWellnessStore } from '@/stores/useWellnessStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { User, Flame } from 'lucide-react-native';

const ONBOARDING_PAYWALL_KEY = '@mindpulse/onboarding-paywall-shown';
const STREAK_PAYWALL_KEY     = '@mindpulse/streak-paywall-shown';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const router        = useRouter();
  const { user }      = useAuth();
  const { isPremium } = useSubscription();
  const displayName   = user?.displayName ?? user?.email?.split('@')[0] ?? null;
  const firstName     = displayName?.split(' ')[0] ?? '';
  const { text: rawGreeting, emoji: greetingEmoji, period: greetingPeriod } = useGreeting(firstName);
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

  const savedRef = useRef(false);
  useEffect(() => {
    if (anyLoading || !user?.uid || savedRef.current) return;
    savedRef.current = true;
    void saveDailyScore(user.uid, {
      mindPulseScore, eyesScore: eyes, sleepScore, mindScore: mind, savedAt: Date.now(),
    });
  }, [anyLoading, user?.uid, mindPulseScore, eyes, sleepScore, mind]);


  const streak = useWellnessStore((s) => s.streak);
  const [showOnboardingPaywall, setShowOnboardingPaywall] = useState(false);
  const [showStreakPaywall, setShowStreakPaywall]         = useState(false);
  const [showResetPicker, setShowResetPicker]             = useState(false);

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

  return (
    <ScreenShell scroll={true} ambient={<AmbientBackground subtle />}>
      {/* ── Header — greeting (screen-title scale) + inline streak, avatar ── */}
      <StaggerItem index={0}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingTop: SPACING.screenTop, marginBottom: SPACING.titleGap,
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text numberOfLines={1}>
              <Text
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: TYPOGRAPHY.screenTitle.fontSize,
                  fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
                  color: TYPOGRAPHY.screenTitle.color,
                }}
              >
                {greeting}
              </Text>
              {displayName && (
                <Text style={{ fontSize: 24 }}> {greetingEmoji}</Text>
              )}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(ROUTES.appChallenges as never)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
            >
              <Flame
                size={13}
                color={streak > 0 ? PILLAR_COLORS.challenge : 'rgba(245,247,251,0.4)'}
                fill={streak > 0 ? PILLAR_COLORS.challenge : 'transparent'}
                strokeWidth={1.5}
              />
              <Text style={{ fontSize: TYPOGRAPHY.subtitle.fontSize, fontWeight: TYPOGRAPHY.subtitle.fontWeight, color: TYPOGRAPHY.subtitle.color }}>
                {streak > 0
                  ? `${streak} Day Streak`
                  : greetingPeriod === 'Night'
                    ? 'Wind down before bed'
                    : 'Start your streak today'}
              </Text>
            </TouchableOpacity>
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

      {/* ── Today's Journey — the one hero: progress + the one next action ── */}
      <StaggerItem index={1}>
        <View style={{ marginTop: 8 }}>
          <TodaysJourneyCard />
        </View>
      </StaggerItem>

      {/* ── Today's Challenge ───────────────────────────────────────── */}
      <StaggerItem index={2}>
        <View style={{ marginTop: SPACING.section }}>
          <DailyChallenge worstArea={focusArea} ready={!anyLoading} />
        </View>
      </StaggerItem>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <StaggerItem index={3}>
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>QUICK ACTIONS</SectionLabel>
          <FeatureGrid
            showStartHere={!hasCompletedAnySession}
            onResetPress={() => setShowResetPicker(true)}
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

      {/* ── Weekly Wellness — score teaser, links to Challenges ── */}
      <StaggerItem index={4}>
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>WEEKLY WELLNESS</SectionLabel>
          <WeeklyProgressRow
            icon={<Flame size={13} color={PILLAR_COLORS.challenge} fill={PILLAR_COLORS.challenge} strokeWidth={1.5} />}
            label="Weekly Wellness"
            value={anyLoading ? '–' : `${mindPulseScore}/100`}
            percent={anyLoading ? 0 : mindPulseScore}
            accentColor={theme.color}
            onPress={() => router.push(ROUTES.appChallenges as never)}
          />
        </View>
      </StaggerItem>

      {/* ── Screen Balance ──────────────────────────────────────────── */}
      <StaggerItem index={5}>
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>SCREEN BALANCE</SectionLabel>
          <ScreenBalanceCard uid={user?.uid} onTakeReset={() => setShowResetPicker(true)} />
        </View>
      </StaggerItem>

      {/* Bottom runway so the card clears the floating tab bar */}
      <View style={{ height: SPACING.screenBottom }} />

      <SoftPaywallModal
        visible={!isPremium && showOnboardingPaywall}
        emoji="✨"
        variant="welcome"
        title="Welcome to MindPulse"
        subtitle="Unlock guided wellness, focused eye training, and deeper insights whenever you're ready."
        onUpgrade={() => { dismissOnboardingPaywall(); goToPremium(); }}
        onDismiss={dismissOnboardingPaywall}
      />
      <SoftPaywallModal
        visible={!isPremium && showStreakPaywall}
        emoji="🔥"
        title="You're building momentum"
        subtitle="3 days in a row — unlock the full toolkit to keep your progress going."
        onUpgrade={() => { dismissStreakPaywall(); goToPremium(); }}
        onDismiss={dismissStreakPaywall}
      />
      <ResetPickerSheet visible={showResetPicker} onClose={() => setShowResetPicker(false)} />
    </ScreenShell>
  );
}
