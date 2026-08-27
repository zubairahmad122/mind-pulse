import { HeroCard } from '@/components/ui/HeroCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLastFeature } from '@/components/home/ContinueJourney';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { FONTS, SPACING, TYPOGRAPHY } from '@/constants/designSystem';
import { useTodayProgress } from '@/hooks/useTodayProgress';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

const MESSAGES: Record<number, string> = {
  0: 'Check in to start today\'s journey.',
  1: "You're already moving — one session keeps it going.",
  2: 'Nice pace — halfway to a perfect day.',
  3: 'Almost there — one more for a perfect day.',
  4: 'Perfect day — you’ve done it all. \u{1F389}',
};

/**
 * The Home hero — one card, one action. Replaces the old separate "welcome",
 * "wellness score ring", and "continue your journey" cards with a single
 * always-current view of today's progress and the one next thing to do.
 */
export function TodaysJourneyCard() {
  const router = useRouter();
  const { percent, doneCount, everCompletedAny } = useTodayProgress();
  const { last, isCompleted } = useLastFeature();

  const ctaLabel = !everCompletedAny ? 'Start First Exercise' : isCompleted ? 'Start Next Session' : 'Continue';
  const ctaRoute = !everCompletedAny ? ROUTES.appEyeRelax : (last?.route ?? ROUTES.appEyeRelax);

  return (
    <HeroCard style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>TODAY&apos;S JOURNEY</Text>
          <Text style={styles.percent}>{percent}%</Text>
        </View>

        <Text style={styles.message}>{MESSAGES[doneCount]}</Text>

        {/* A lighter tint than the raw pillar purple — the hero card itself is
            already a deep violet, so the saturated accent would blend into it
            instead of reading as a distinct progress fill. */}
        <ProgressBar progress={Math.max(percent / 100, 0.04)} fill="#B79CFF" style={styles.track} />

        <View style={styles.ctaWrap}>
          <GradientCTA
            label={ctaLabel}
            icon={<ArrowRight size={17} color="#03212C" strokeWidth={2.5} />}
            textColor="#03212C"
            onPress={() => router.push(ctaRoute as never)}
          />
        </View>
      </View>
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  card: {},
  inner: {
    padding: SPACING.cardPadding,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: 'rgba(255,255,255,0.5)',
  },
  percent: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: '#fff',
  },
  message: {
    fontSize: TYPOGRAPHY.body.fontSize,
    lineHeight: 20,
    color: colors.text.primary,
    fontWeight: TYPOGRAPHY.body.fontWeight,
    marginTop: 6,
  },
  track: {
    marginTop: 16,
  },
  ctaWrap: {
    marginTop: SPACING.titleGap + 10,
  },
});
