import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ROUTES } from '@/constants/routes';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS, RADIUS, SHADOWS, STATUS_COLORS, SURFACE_TINT, TYPOGRAPHY } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { ChallengeFeature, useWellnessStore } from '@/stores/useWellnessStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { todayISO } from '@/utils/dateUtils';
import { useRouter } from 'expo-router';
import { CheckCircle, Eye, Moon, Play, Wind } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/** `ready` should be false while the caller's own eye/sleep/mind scores are
 * still loading — otherwise a transient "all scores 0" render could get
 * pinned in as today's assigned challenge before real data arrives. */
type Props = { worstArea: string; ready?: boolean };

/** Map challenge area keys to daily session store keys. */
export const CHALLENGE_FEATURE_KEY: Record<string, ChallengeFeature> = {
  Eyes: 'eye',
  Sleep: 'sleep',
  Mind: 'mind',
};

const FEATURE_TO_AREA: Record<ChallengeFeature, string> = { eye: 'Eyes', sleep: 'Sleep', mind: 'Mind' };

export const CHALLENGES: Record<string, { title: string; subtitle: string; icon: typeof Eye; route: string; color: string; duration: string; difficulty: string; reward: string }> = {
  Eyes:  { title: 'Eye Reset', subtitle: 'Follow the guided protocol', icon: Eye,   route: '/(app)/cvs-protocol',            color: PILLAR_COLORS.eye,   duration: '3 min', difficulty: 'Beginner', reward: 'Eye Protector' },
  Sleep: { title: 'Sleep Session', subtitle: 'Track tonight\'s sleep',  icon: Moon,  route: '/(app)/(tabs)/sleep?tab=tonight', color: PILLAR_COLORS.sleep, duration: '1 min', difficulty: 'Beginner', reward: 'Sleep Guardian' },
  Mind:  { title: 'Box Breathing', subtitle: 'Calm your nervous system', icon: Wind,  route: ROUTES.appBoxBreathing,     color: PILLAR_COLORS.mind,  duration: '5 min', difficulty: 'Beginner', reward: 'Calm Mind' },
};

/** Real "is today's challenge for this focus area already done" — shared by
 * the DailyChallenge card and the Challenges-screen hero so they never
 * disagree about completion state.
 *
 * The challenge target is assigned ONCE per day (from whichever pillar is
 * weakest the first time this runs today) and pinned in useWellnessStore, so
 * completing a session that shifts the weakest pillar mid-day can't silently
 * swap the displayed challenge out from under the user. */
export function useDailyChallengeStatus(worstArea: string, ready = true) {
  const liveFeatureKey = CHALLENGE_FEATURE_KEY[worstArea] ?? 'mind';
  const today = todayISO();

  const assignedChallenge = useWellnessStore((s) => s.assignedChallenge);
  const assignDailyChallengeIfNeeded = useWellnessStore((s) => s.assignDailyChallengeIfNeeded);

  useEffect(() => {
    if (!ready) return;
    assignDailyChallengeIfNeeded(liveFeatureKey);
  }, [ready, liveFeatureKey, assignDailyChallengeIfNeeded]);

  const activeFeature: ChallengeFeature =
    assignedChallenge?.date === today ? assignedChallenge.feature : liveFeatureKey;
  const challenge = CHALLENGES[FEATURE_TO_AREA[activeFeature]] ?? CHALLENGES.Mind;

  const done = useProgressStore((s) => {
    const hasAnySession = s.eyeExercisesCompleted > 0 || s.eyeGamesPlayed > 0 ||
      s.relaxSessionsCompleted > 0 || s.mindSessionsCompleted > 0 || s.sleepSessionsTracked > 0;
    return hasAnySession && s.todayDate === today && s.todaySessions[activeFeature];
  });
  return { challenge, done };
}

export function DailyChallenge({ worstArea, ready = true }: Props) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { challenge, done } = useDailyChallengeStatus(worstArea, ready);
  const ChallengeIcon = challenge.icon;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 12, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }).start();
  };

  function handlePress() {
    router.push(challenge.route as never);
  }

  return (
    <View>
      <SectionLabel first>DAILY CHALLENGE</SectionLabel>
      <TouchableOpacity onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <GlassCard style={[styles.card, done && styles.cardDone]} tint={SURFACE_TINT.card}>
            <View style={[styles.iconWrap, { backgroundColor: challenge.color + '18', borderColor: challenge.color + '28', shadowColor: challenge.color }]}>
              <ChallengeIcon size={22} color={challenge.color} strokeWidth={2} />
            </View>

            <View style={styles.info}>
              <Text style={[styles.title, done && styles.titleDone]}>{challenge.title}</Text>
              <Text style={styles.meta}>{challenge.duration} • {challenge.difficulty}</Text>
              {!done && (
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardEmoji}>🏅</Text>
                  <Text style={styles.rewardText}>{challenge.reward}</Text>
                </View>
              )}
            </View>

            {done ? (
              <View style={styles.donePill}>
                <CheckCircle size={14} color={STATUS_COLORS.success} strokeWidth={2.5} />
                <Text style={styles.donePillText}>DONE</Text>
              </View>
            ) : (
              <View style={[styles.startPill, { backgroundColor: challenge.color + '1f', borderColor: challenge.color + '45' }]}>
                <Play size={11} color={challenge.color} fill={challenge.color} />
                <Text style={[styles.startPillText, { color: challenge.color }]}>Start</Text>
              </View>
            )}
          </GlassCard>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  cardDone: { opacity: 0.65 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
  },
  info: { flex: 1, gap: 3 },
  title: {
    fontSize: TYPOGRAPHY.cardTitle.fontSize,
    fontWeight: TYPOGRAPHY.cardTitle.fontWeight,
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    color: colors.text.secondary,
    letterSpacing: 0.1,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.35)',
  },
  rewardEmoji: {
    fontSize: 11,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB800',
  },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  startPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(50,213,131,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(50,213,131,0.3)',
    borderRadius: RADIUS.chip,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  donePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: STATUS_COLORS.success,
  },
});
