import { DailyChallenge } from '@/components/home/DailyChallenge';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { DailyWellnessProgress } from '@/components/home/DailyWellnessProgress';
import { FirstBreakOnboarding } from '@/components/home/FirstBreakOnboarding';
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
import { useActivityHistory, useWeeklyActivity } from '@/hooks/useActivity';
import { useTodayProgress } from '@/hooks/useTodayProgress';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useGreeting } from '@/hooks/useGreeting';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { saveDailyScore } from '@/services/dailyScorePersistence';
import {
  ensureEveningReminderScheduled,
  formatReminderTime,
  getEveningReminderEnabled,
  getEveningReminderPreference,
  hasOfferedEveningReminder,
  markEveningReminderOffered,
  requestEveningReminderPermission,
  setEveningReminderEnabled,
  setEveningReminderPreference,
} from '@/services/eveningReminder';
import { trackEvent, trackOnboardingCompleted } from '@/services/analytics';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { User, Flame } from 'lucide-react-native';

const ONBOARDING_PAYWALL_KEY = '@mindpulse/onboarding-paywall-shown';
const STREAK_PAYWALL_KEY     = '@mindpulse/streak-paywall-shown';
const FIRST_BREAK_KEY        = '@mindpulse/first-break-onboarding-seen';

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
  const { text: greeting, icon: GreetingIcon } = useGreeting(firstName);

  // ── First-time detection (computed inline for efficient re-renders) ───
  // Unified activity log (+ pre-log legacy counters, read-only) — real completions only.
  const { everCompletedAny: hasCompletedAnySession } = useTodayProgress();
  const { ready: activityReady } = useActivityHistory();
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
  const [offerHour, setOfferHour] = useState(19);
  const [offerMinute, setOfferMinute] = useState(30);

  // ── First-break onboarding: offer one simple eye break after the feature
  // guide and before reminder/paywall sheets. ──────────────────────────────
  const [showFirstBreakOnboarding, setShowFirstBreakOnboarding] = useState(false);
  const [firstBreakChecked, setFirstBreakChecked] = useState(false);

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

  useEffect(() => {
    // Wait for the activity log, or returning users look brand new while it loads.
    if (!featureGuideChecked || showFeatureGuide || !activityReady) return;
    let cancelled = false;
    void (async () => {
      try {
        const seen = await AsyncStorage.getItem(FIRST_BREAK_KEY);
        if (cancelled) return;
        if (seen === '1' || hasCompletedAnySession) {
          setFirstBreakChecked(true);
          return;
        }
        setShowFirstBreakOnboarding(true);
      } catch {
        if (!cancelled) setFirstBreakChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [featureGuideChecked, showFeatureGuide, activityReady, hasCompletedAnySession]);

  const markFirstBreakSeen = useCallback(async () => {
    setShowFirstBreakOnboarding(false);
    setFirstBreakChecked(true);
    try {
      await AsyncStorage.setItem(FIRST_BREAK_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const acceptFirstBreak = useCallback(() => {
    void markFirstBreakSeen();
    void trackEvent('first_break_started', { source: 'first_session_onboarding' });
    router.push(ROUTES.appEyeBreak as never);
  }, [markFirstBreakSeen, router]);

  const declineFirstBreak = useCallback(() => {
    void markFirstBreakSeen();
  }, [markFirstBreakSeen]);

  const dismissFeatureGuide = () => {
    setShowFeatureGuide(false);
    void markHomeFeatureGuideSeen();
  };

  useEffect(() => {
    if (
      isPremium || !user?.uid ||
      !featureGuideChecked || showFeatureGuide ||
      !firstBreakChecked || showFirstBreakOnboarding ||
      // The reminder offer only exists after a first session; it goes first.
      (hasCompletedAnySession && !reminderOfferChecked) || showReminderOffer
    ) return;
    let cancelled = false;
    void (async () => {
      const onboardingKey   = `${ONBOARDING_PAYWALL_KEY}:${user.uid}`;
      const onboardingShown = await AsyncStorage.getItem(onboardingKey);
      if (cancelled) return;
      // Delay soft paywall until the user has completed at least one session.
      if (!onboardingShown && hasCompletedAnySession) {
        setShowOnboardingPaywall(true);
        return;
      }
      if (streak < 3) return;
      const streakKey   = `${STREAK_PAYWALL_KEY}:${user.uid}`;
      const streakShown = await AsyncStorage.getItem(streakKey);
      if (cancelled) return;
      if (!streakShown) setShowStreakPaywall(true);
    })();
    return () => { cancelled = true; };
  }, [
    isPremium,
    user?.uid,
    streak,
    featureGuideChecked,
    showFeatureGuide,
    firstBreakChecked,
    showFirstBreakOnboarding,
    reminderOfferChecked,
    showReminderOffer,
    hasCompletedAnySession,
  ]);

  const dismissOnboardingPaywall = () => {
    setShowOnboardingPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${ONBOARDING_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const dismissStreakPaywall = () => {
    setShowStreakPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${STREAK_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const goToPremium = () => router.push(ROUTES.appPremium as never);

  // ── Daily reminder offer — after the user has experienced a real first
  // eye break (or any completed session). Permission is only requested from
  // the explicit "Enable Daily Reminder" tap, never on cold open. ──────────
  useEffect(() => {
    if (
      !featureGuideChecked || showFeatureGuide ||
      !firstBreakChecked || showFirstBreakOnboarding ||
      !hasCompletedAnySession ||
      !user?.uid
    ) return;
    let cancelled = false;
    void (async () => {
      const [offered, alreadyEnabled, pref] = await Promise.all([
        hasOfferedEveningReminder(user.uid),
        getEveningReminderEnabled(user.uid),
        getEveningReminderPreference(user.uid),
      ]);
      if (cancelled) return;
      setOfferHour(pref.preferredHour);
      setOfferMinute(pref.preferredMinute);
      if (!offered && !alreadyEnabled) setShowReminderOffer(true);
      setReminderOfferChecked(true);
    })();
    return () => { cancelled = true; };
  }, [
    featureGuideChecked,
    showFeatureGuide,
    firstBreakChecked,
    showFirstBreakOnboarding,
    hasCompletedAnySession,
    user?.uid,
  ]);

  const acceptReminderOffer = () => {
    setShowReminderOffer(false);
    void (async () => {
      await markEveningReminderOffered(user?.uid);
      await setEveningReminderPreference(user?.uid, offerHour, offerMinute, true);
      const granted = await requestEveningReminderPermission();
      if (!granted) return;
      await setEveningReminderEnabled(user?.uid, true);
      await ensureEveningReminderScheduled(user?.uid);
      trackOnboardingCompleted('daily_reminder_enabled');
    })();
  };
  const declineReminderOffer = () => {
    setShowReminderOffer(false);
    void markEveningReminderOffered(user?.uid);
    trackEvent('reminder_offer_declined');
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
      {/* ── Header: greeting + profile, then full-width Start Break ── */}
      <StaggerItem index={0}>
        <View style={{ paddingTop: SPACING.screenTop, marginBottom: SPACING.titleGap }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
              onPress={() => router.push(ROUTES.appProfile as never)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Profile"
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

          <TouchableOpacity
            onPress={() => router.push(ROUTES.appEyeBreak as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start Break"
            style={{
              marginTop: 14,
              backgroundColor: 'rgba(77, 225, 193, 0.14)',
              borderWidth: 1,
              borderColor: 'rgba(77, 225, 193, 0.35)',
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: FONTS.heading,
              fontSize: 17,
              fontWeight: '700',
              color: '#FFFFFF',
              letterSpacing: 0.2,
            }}>Start Break</Text>
          </TouchableOpacity>
        </View>
      </StaggerItem>

      {/* ── Today's Journey — the one hero: progress + the one next action ── */}
      <StaggerItem index={1}>
        <View style={{ marginTop: 8 }}>
          <TodaysJourneyCard />
        </View>
      </StaggerItem>

      {/* ── Daily wellness goals — real completions only ─────────────── */}
      <StaggerItem index={2}>
        <View style={{ marginTop: SPACING.section }}>
          <DailyWellnessProgress />
        </View>
      </StaggerItem>

      {/* ── FEATURED — compact Screen Balance + Focus shortcuts ─────── */}
      <StaggerItem index={3}>
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
      <StaggerItem index={4}>
        <View style={{ marginTop: SPACING.section }}>
          <DailyChallenge worstArea={focusArea} ready={!anyLoading} />
        </View>
      </StaggerItem>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <StaggerItem index={5}>
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
      <StaggerItem index={6}>
        <View style={{ marginTop: SPACING.section }}>
          <WeeklyProgressRow
            icon={<Flame size={13} color={PILLAR_COLORS.challenge} fill={PILLAR_COLORS.challenge} strokeWidth={1.5} />}
            label="Weekly Wellness"
            value={anyLoading ? '–' : `${mindPulseScore}/100`}
            percent={anyLoading ? 0 : mindPulseScore}
            accentColor={theme.color}
            onPress={() => {
              trackEvent('weekly_report_opened');
              router.push(ROUTES.appChallenges as never);
            }}
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
      <FirstBreakOnboarding
        visible={showFirstBreakOnboarding}
        onAccept={acceptFirstBreak}
        onDecline={declineFirstBreak}
      />
      <SoftPaywallModal
        visible={showReminderOffer}
        emoji="🔔"
        title="Stay on track"
        subtitle="A calm daily nudge helps you return. Pick a time, preview the reminder, then enable — we only ask the OS after you tap Enable."
        ctaLabel="Enable Daily Reminder"
        onUpgrade={acceptReminderOffer}
        onDismiss={declineReminderOffer}
      >
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              padding: 4,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            {[19, 20, 21].map(hour => {
              const selected = offerHour === hour && offerMinute === 30;
              return (
                <TouchableOpacity
                  key={hour}
                  onPress={() => {
                    setOfferHour(hour);
                    setOfferMinute(30);
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: selected ? '#6C63FF' : 'transparent',
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: selected ? '700' : '600',
                      color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {formatReminderTime(hour, 30)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View
            style={{
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
              PREVIEW · {formatReminderTime(offerHour, offerMinute)}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 }}>
              Your eyes deserve a little rest
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 18 }}>
              Take a quick 20-second eye break. Tap to start.
            </Text>
          </View>
        </View>
      </SoftPaywallModal>
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
