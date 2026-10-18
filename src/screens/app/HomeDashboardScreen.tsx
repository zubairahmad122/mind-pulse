import { DailyChallenge } from '@/components/home/DailyChallenge';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { HomeFeatureGuideSheet } from '@/components/home/HomeFeatureGuideSheet';
import { ResetPickerSheet } from '@/components/home/ResetPickerSheet';
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
import { useWeeklyActivity } from '@/hooks/useActivity';
import { useTodayProgress } from '@/hooks/useTodayProgress';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useGreeting } from '@/hooks/useGreeting';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { saveDailyScore } from '@/services/dailyScorePersistence';
import {
  ensureEveningReminderScheduled,
  getEveningReminderEnabled,
  hasOfferedEveningReminder,
  markEveningReminderOffered,
  requestEveningReminderPermission,
  setEveningReminderEnabled,
} from '@/services/eveningReminder';
import { hasSeenHomeFeatureGuide, markHomeFeatureGuideSeen } from '@/services/homeFeatureGuidePersistence';
import type { ResetType } from '@/services/screenBalancePersistence';
import {
    calculateMindPulseScore,
    getFocusArea,
    pulseScoreTheme,
} from '@/utils/scoring';
import {
  recommendedResetFromParam,
  smartResetNotificationKey,
} from '@/utils/smartResetNotificationRoute';
import { useWellnessStore } from '@/stores/useWellnessStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { User, Flame } from 'lucide-react-native';

const ONBOARDING_PAYWALL_KEY = '@mindpulse/onboarding-paywall-shown';
const STREAK_PAYWALL_KEY     = '@mindpulse/streak-paywall-shown';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const router        = useRouter();
  const params        = useLocalSearchParams<{
    smartReset?: string;
    recommendedReset?: string;
    notificationId?: string;
  }>();
  const { user }      = useAuth();
  const { isPremium } = useSubscription();
  const displayName   = user?.displayName ?? user?.email?.split('@')[0] ?? null;
  const firstName     = displayName?.split(' ')[0] ?? '';
  // No signup name yet (e.g. still hydrating, or no name on file) → the plain
  // time-of-day greeting, never the app's own brand name standing in for it.
  const { text: greeting, icon: GreetingIcon, period: greetingPeriod } = useGreeting(firstName);

  // ── First-time detection (computed inline for efficient re-renders) ───
  // Unified activity log (+ pre-log legacy counters, read-only) — real completions only.
  const { everCompletedAny: hasCompletedAnySession } = useTodayProgress();
  const { countsByType: weekCounts } = useWeeklyActivity();

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
  const [recommendedReset, setRecommendedReset]           = useState<ResetType | undefined>(undefined);
  const consumedSmartResetNotificationRef = useRef<string | null>(null);

  // ── First-run feature guide — one real benefit per slide (Focus, Screen
  // Break, Progress). Shown once, before any paywall sheet gets a chance to
  // compete for the same first impression. Global (not per-account): a
  // guest who later signs in shouldn't see the orientation twice. ──────────
  const [showFeatureGuide, setShowFeatureGuide]   = useState(false);
  const [featureGuideChecked, setFeatureGuideChecked] = useState(false);
  // Both set from within the reminder-offer effect further down — declared
  // here (before the paywall effect below) so the paywall effect can wait
  // on them too, keeping Feature Guide → Reminder Offer → Paywall strictly
  // sequential instead of racing two sheets onto the screen at once.
  const [showReminderOffer, setShowReminderOffer] = useState(false);
  const [reminderOfferChecked, setReminderOfferChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const seen = await hasSeenHomeFeatureGuide();
      if (cancelled) return;
      if (!seen) setShowFeatureGuide(true);
      setFeatureGuideChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismissFeatureGuide = () => {
    setShowFeatureGuide(false);
    void markHomeFeatureGuideSeen();
  };

  useEffect(() => {
    if (
      isPremium || !user?.uid ||
      !featureGuideChecked || showFeatureGuide ||
      !reminderOfferChecked || showReminderOffer
    ) return;
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
  }, [isPremium, user?.uid, streak, featureGuideChecked, showFeatureGuide, reminderOfferChecked, showReminderOffer]);

  const dismissOnboardingPaywall = () => {
    setShowOnboardingPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${ONBOARDING_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const dismissStreakPaywall = () => {
    setShowStreakPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${STREAK_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const goToPremium = () => router.push(ROUTES.appPremium as never);

  // ── Daily reminder offer — asked once, in-context, right after a user's
  // first-ever Home visit, right after the feature guide — matching the
  // standard pattern most apps use (ask for notification permission early,
  // default the daily reminder on once granted) rather than waiting for a
  // completed session. Still only ever requested from this explicit user
  // action (the "Enable Reminder" tap), never silently. Runs before the
  // paywall effect above (which waits on `reminderOfferChecked`), so this
  // one only needs to wait on the feature guide, not on paywall state. ────
  useEffect(() => {
    if (!featureGuideChecked || showFeatureGuide || !user?.uid) return;
    let cancelled = false;
    void (async () => {
      const [offered, alreadyEnabled] = await Promise.all([
        hasOfferedEveningReminder(user.uid),
        getEveningReminderEnabled(user.uid),
      ]);
      if (cancelled) return;
      if (!offered && !alreadyEnabled) setShowReminderOffer(true);
      setReminderOfferChecked(true);
    })();
    return () => { cancelled = true; };
  }, [featureGuideChecked, showFeatureGuide, user?.uid]);

  const acceptReminderOffer = () => {
    setShowReminderOffer(false);
    void (async () => {
      await markEveningReminderOffered(user?.uid);
      const granted = await requestEveningReminderPermission();
      if (!granted) return; // denied at the OS level — leave it off, already marked "offered"
      await setEveningReminderEnabled(user?.uid, true);
      await ensureEveningReminderScheduled(user?.uid);
    })();
  };
  const declineReminderOffer = () => {
    setShowReminderOffer(false);
    void markEveningReminderOffered(user?.uid);
  };

  useEffect(() => {
    if (params.smartReset !== '1') return;
    const notificationKey = smartResetNotificationKey(params.notificationId);
    if (consumedSmartResetNotificationRef.current === notificationKey) return;
    consumedSmartResetNotificationRef.current = notificationKey;
    setRecommendedReset(recommendedResetFromParam(params.recommendedReset));
    setShowResetPicker(true);
  }, [params.notificationId, params.recommendedReset, params.smartReset]);

  return (
    <ScreenShell scroll={true} ambient={<AmbientBackground subtle />} bannerAd>
      {/* ── Header — greeting (screen-title scale) + inline streak, avatar ── */}
      <StaggerItem index={0}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingTop: SPACING.screenTop, marginBottom: SPACING.titleGap,
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontFamily: FONTS.heading,
                  fontSize: TYPOGRAPHY.screenTitle.fontSize,
                  fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
                  color: TYPOGRAPHY.screenTitle.color,
                }}
              >
                {greeting}
              </Text>
              {displayName && (
                <GreetingIcon size={20} color="rgba(245,247,251,0.85)" strokeWidth={2.2} />
              )}
            </View>
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

      {/* ── FEATURED — compact Screen Balance + Focus shortcuts ─────── */}
      <StaggerItem index={2}>
        <View style={{ marginTop: SPACING.section }}>
          <FeaturedSection
            uid={user?.uid}
            onTakeReset={() => {
              setRecommendedReset(undefined);
              setShowResetPicker(true);
            }}
          />
        </View>
      </StaggerItem>

      {/* ── Today's Challenge ───────────────────────────────────────── */}
      <StaggerItem index={3}>
        <View style={{ marginTop: SPACING.section }}>
          <DailyChallenge worstArea={focusArea} ready={!anyLoading} />
        </View>
      </StaggerItem>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <StaggerItem index={4}>
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>QUICK ACTIONS</SectionLabel>
          <FeatureGrid
            showStartHere={!hasCompletedAnySession}
            onResetPress={() => { setRecommendedReset(undefined); setShowResetPicker(true); }}
            weeklySessions={{
              'eye-exercise': weekCounts.EYE_RESET_COMPLETED + weekCounts.EYE_BREAK_COMPLETED,
              'eye-games': weekCounts.EYE_GAME_COMPLETED,
              relax: weekCounts.RELAX_SESSION_COMPLETED,
              mind: weekCounts.MIND_GAME_COMPLETED,
              sleep: weekCounts.SLEEP_SESSION_COMPLETED,
            }}
          />
        </View>
      </StaggerItem>

      {/* ── Weekly Wellness — compact summary strip, no separate section
          title above it: the row's own "Weekly Wellness" label already
          carries that, so a second uppercase header would just repeat it
          and cost extra height for a strip that's meant to read as a
          quick teaser, not a major section. ── */}
      <StaggerItem index={5}>
        <View style={{ marginTop: SPACING.section }}>
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

      {/* Bottom runway so the card clears the floating tab bar */}
      <View style={{ height: SPACING.screenBottom }} />

      <HomeFeatureGuideSheet
        visible={showFeatureGuide}
        onClose={dismissFeatureGuide}
        onStartFocus={() => router.push(ROUTES.appFocusBlock as never)}
      />
      <SoftPaywallModal
        visible={showReminderOffer}
        emoji="🔔"
        title="Stay on track"
        subtitle="A single, calm reminder each evening to keep your routine going — easy to turn off anytime in Settings."
        ctaLabel="Enable Reminder"
        onUpgrade={acceptReminderOffer}
        onDismiss={declineReminderOffer}
      />
      <SoftPaywallModal
        visible={!isPremium && showOnboardingPaywall}
        emoji="✨"
        variant="welcome"
        title="Welcome to Well Mode"
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
      <ResetPickerSheet
        visible={showResetPicker}
        onClose={() => setShowResetPicker(false)}
        recommendedReset={recommendedReset}
      />
    </ScreenShell>
  );
}
