// ──────────────────────────────────────────────────────────────────────────────
// HomeScreen — Two-state dashboard: first-time vs returning user
// Designed to render inside ScreenShell (which handles ScrollView, safe area,
// animated background, and gradient).
// ──────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MPText } from '@/components/atoms/MPText';
import { MPCard } from '@/components/atoms/MPCard';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPProgressRing } from '@/components/molecules/MPProgressRing';
import { MPFeatureCard } from '@/components/molecules/MPFeatureCard';
import { MPSectionHeader } from '@/components/molecules/MPSectionHeader';
import { MPStreakBanner } from '@/components/organisms/MPStreakBanner';
import { MPDailyChallenge } from '@/components/organisms/MPDailyChallenge';
import { HomeTipCard } from '@/components/home/HomeTipCard';
import { useUserStore } from '@/stores/useUserStore';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { useProgressStore, type FeatureId } from '@/stores/useProgressStore';
import { COLORS, SPACING } from '@/theme';
import { getGreeting } from '@/utils/formatTime';
import { SCREENS } from '@/navigation/types';

// ── Constants ───────────────────────────────────────────────────────────────

const WEEKLY_DOTS_MAX = 4;

const FEATURES: {
  id: FeatureId;
  iconName: string;
  label: string;
  iconBgColor: string;
  tabRoute: string;
}[] = [
  { id: 'eye-exercise', iconName: 'Eye', label: 'Eye Exercise', iconBgColor: COLORS.cyan, tabRoute: SCREENS.TAB_EYE },
  { id: 'eye-game', iconName: 'Gamepad2', label: 'Eye Games', iconBgColor: COLORS.blue, tabRoute: SCREENS.TAB_EYE },
  { id: 'relax', iconName: 'Wind', label: 'Relax', iconBgColor: COLORS.purple, tabRoute: SCREENS.TAB_RELAX },
  { id: 'mind', iconName: 'Brain', label: 'Mind', iconBgColor: COLORS.purpleLight, tabRoute: SCREENS.TAB_RELAX },
  { id: 'sleep', iconName: 'Moon', label: 'Sleep', iconBgColor: COLORS.blue, tabRoute: SCREENS.TAB_SLEEP },
];

/** Map feature ID → weekly session count from the progress store. */
function getWeeklyCount(
  featureId: FeatureId,
  weekly: ReturnType<typeof useProgressStore.getState>['weeklySessions'],
): number {
  switch (featureId) {
    case 'eye-exercise': return weekly.eye;
    case 'eye-game': return weekly.eyeGames;
    case 'relax': return weekly.relax;
    case 'mind': return weekly.mind;
    case 'sleep': return weekly.sleep;
  }
}

const TIPS = [
  { text: 'Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.', focusArea: 'Eyes' },
  { text: 'Consistent bedtimes help your body\'s internal clock. Try to sleep at the same time every night.', focusArea: 'Sleep' },
  { text: 'Deep belly breathing for 2 minutes can reduce stress hormones by up to 30%.', focusArea: 'Mind' },
  { text: 'Blue light filters help, but taking actual breaks from screens is even better for your eyes.', focusArea: 'Eyes' },
  { text: 'A cool bedroom (65–68°F / 18–20°C) promotes deeper, more restorative sleep.', focusArea: 'Sleep' },
];

// ── First-Time User ─────────────────────────────────────────────────────────

function FirstTimeHome() {
  const router = useRouter();
  const streak = useUserStore((s) => s.streak);

  const tip = TIPS[0];

  return (
    <>
      {/* ── Greeting ─────────────────────────────────────── */}
      <MPText variant="h1" color="primary">
        {getGreeting()} 👋
      </MPText>

      {/* ── Streak Banner (only if > 0) ─────────────────── */}
      <MPStreakBanner streak={streak} message="Start your journey — build your first streak." />

      {/* ── Start Journey Hero ───────────────────────────── */}
      <MPCard>
        <MPText variant="h2" color="primary">
          Start your journey
        </MPText>
        <MPText variant="body-sm" color="secondary" style={{ marginTop: 6 }}>
          Your first step to better health
        </MPText>
        <TouchableOpacity
          onPress={() => router.navigate(SCREENS.TAB_EYE as never)}
          activeOpacity={0.8}
          style={{
            marginTop: SPACING.lg,
            backgroundColor: COLORS.purple,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <MPText variant="body" color="primary" style={{ fontWeight: '700' }}>
            Start First Exercise →
          </MPText>
        </TouchableOpacity>
      </MPCard>

      {/* ── Feature Grid ─────────────────────────────────── */}
      <View>
        <MPSectionHeader title="Explore" first />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: SPACING.md,
            marginTop: SPACING.sm,
          }}
        >
          {FEATURES.map((feat) => (
            <MPFeatureCard
              key={feat.id}
              iconName={feat.iconName}
              label={feat.label}
              iconBgColor={feat.iconBgColor}
              showStartBadge={feat.id === 'eye-exercise'}
              pulse={feat.id === 'eye-exercise'}
              weeklyCompleted={0}
              onPress={() => router.navigate(feat.tabRoute as never)}
            />
          ))}
        </View>
      </View>

      {/* ── Daily Challenge ───────────────────────────────── */}
      <MPDailyChallenge
        category="Beginner"
        duration="3 min"
        description="Complete Your First Eye Break"
      />

      {/* ── Today's Tip ──────────────────────────────────── */}
      <HomeTipCard tip={tip.text} focusArea={tip.focusArea} />
    </>
  );
}

// ── Returning User ──────────────────────────────────────────────────────────

function ReturningHome() {
  const router = useRouter();
  const streak = useUserStore((s) => s.streak);
  const wellnessScore = useWellnessStore((s) => s.wellnessScore);
  const eyeScore = useWellnessStore((s) => s.eyeScore);
  const sleepScore = useWellnessStore((s) => s.sleepScore);
  const relaxScore = useWellnessStore((s) => s.relaxScore);
  const mindScore = useWellnessStore((s) => s.mindScore);
  const dailyChallenge = useWellnessStore((s) => s.dailyChallenge);
  const challengeCompleted = useWellnessStore((s) => s.challengeCompleted);
  const lastFeatureId = useProgressStore((s) => s.lastFeatureId);
  const weeklySessions = useProgressStore((s) => s.weeklySessions);

  /** Pick the weakest feature for the tip rotation. */
  const weakestTip = useMemo(() => {
    const scores = { Eyes: eyeScore, Sleep: sleepScore, Relax: relaxScore, Mind: mindScore };
    const weakest = (Object.entries(scores) as [string, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[1] - b[1])[0];
    const area = weakest?.[0] ?? 'Eyes';
    return TIPS.find((t) => t.focusArea === area) ?? TIPS[0];
  }, [eyeScore, sleepScore, relaxScore, mindScore]);

  /** Find the last feature metadata for Continue Journey. */
  const lastFeature = FEATURES.find((f) => f.id === lastFeatureId);

  const hasRealScoreData = eyeScore > 0 || sleepScore > 0 || relaxScore > 0 || mindScore > 0;

  return (
    <>
      {/* ── Greeting ─────────────────────────────────────── */}
      <MPText variant="h1" color="primary">
        {getGreeting()} 👋
      </MPText>

      {/* ── Streak Banner ────────────────────────────────── */}
      <MPStreakBanner streak={streak} message="Keep building — you're doing great." />

      {/* ── Wellness Score Hero ───────────────────────────── */}
      <MPCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
          <MPProgressRing
            percentage={wellnessScore}
            size="lg"
            label={`${wellnessScore}`}
            sublabel="Score"
          />
          <View style={{ flex: 1, gap: 6 }}>
            <MPText variant="h3" color="primary">
              Your Wellness Score
            </MPText>
            <MPText variant="body-sm" color="secondary" numberOfLines={3}>
              {wellnessScore >= 80
                ? "You're thriving! Keep up the amazing work."
                : wellnessScore >= 50
                ? 'Good progress! Try a session to boost your score.'
                : "You're building habits — keep going!"}
            </MPText>
            <TouchableOpacity
              onPress={() => router.push(SCREENS.FULL_REPORT as never)}
              activeOpacity={0.6}
              style={{ marginTop: 4 }}
            >
              <MPText variant="body-sm" color="purple-light">
                View Full Report →
              </MPText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category breakdowns — only if real data exists */}
        {hasRealScoreData && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginTop: SPACING.lg,
              paddingTop: SPACING.md,
              borderTopWidth: 1,
              borderTopColor: COLORS.borderSubtle,
            }}
          >
            {[
              { label: 'Eye', value: eyeScore },
              { label: 'Sleep', value: sleepScore },
              { label: 'Relax', value: relaxScore },
              { label: 'Mind', value: mindScore },
            ].map(({ label, value }) => (
              <View key={label} style={{ alignItems: 'center', gap: 2 }}>
                <MPText variant="body-sm" color={value > 0 ? 'primary' : 'muted'}>
                  {value > 0 ? `${value}%` : '—'}
                </MPText>
                <MPText variant="caption-xs" color="muted">
                  {label}
                </MPText>
              </View>
            ))}
          </View>
        )}
      </MPCard>

      {/* ── Continue Your Journey ─────────────────────────── */}
      {lastFeature && (() => {
        const isCompleted = getWeeklyCount(lastFeature.id, weeklySessions) > 0;
        const ctaLabel = isCompleted ? 'Start Next Session' : 'Resume';
        const description = isCompleted
          ? 'Ready for your next one?'
          : lastFeature.id === 'relax'
          ? 'Unwind and breathe'
          : 'Keep up the good work';
        return (
          <MPCard onPress={() => router.navigate(lastFeature.tabRoute as never)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              {/* Left accent bar */}
              <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: COLORS.blue }} />
              <View style={{ flex: 1, gap: 4 }}>
                <MPText variant="caption" color="muted" style={{ letterSpacing: 1.5 }}>
                  CONTINUE YOUR JOURNEY
                </MPText>
                <MPText variant="h3" color="primary">
                  {lastFeature.label}
                </MPText>
                <MPText variant="body-sm" color="secondary">
                  {description}
                </MPText>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(59,130,246,0.3)',
                  backgroundColor: 'rgba(59,130,246,0.08)',
                }}
              >
                <MPText variant="body-sm" color="blue" style={{ fontWeight: '700' }}>
                  {ctaLabel} →
                </MPText>
              </View>
            </View>
          </MPCard>
        );
      })()}

      {/* ── Feature Grid ─────────────────────────────────── */}
      <View>
        <MPSectionHeader title="Explore" first />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: SPACING.md,
            marginTop: SPACING.sm,
          }}
        >
          {FEATURES.map((feat) => (
            <MPFeatureCard
              key={feat.id}
              iconName={feat.iconName}
              label={feat.label}
              iconBgColor={feat.iconBgColor}
              weeklyCompleted={Math.min(WEEKLY_DOTS_MAX, getWeeklyCount(feat.id, weeklySessions))}
              onPress={() => router.navigate(feat.tabRoute as never)}
            />
          ))}
        </View>
      </View>

      {/* ── Daily Challenge ───────────────────────────────── */}
      {dailyChallenge ? (
        <MPDailyChallenge
          category={"Today\u2019s Goal"}
          duration={dailyChallenge.description.includes('min') ? undefined : '3 min'}
          description={dailyChallenge.description}
          completed={challengeCompleted}
        />
      ) : (
        <MPDailyChallenge
          category="Today\u2019s Goal"
          duration="3 min"
          description="Complete Your First Eye Break"
        />
      )}

      {/* ── Today's Tip ──────────────────────────────────── */}
      <HomeTipCard tip={weakestTip.text} focusArea={weakestTip.focusArea} />
    </>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────
// ScreenShell handles ScrollView, safe area, background gradient, and padding.
// We just render the section content with vertical gaps.

export default function HomeScreen() {
  const hasCompletedAnySession = useProgressStore((s) => s.hasCompletedAnySession());

  return (
    <View style={{ gap: SPACING.lg }}>
      {hasCompletedAnySession ? <ReturningHome /> : <FirstTimeHome />}
    </View>
  );
}
