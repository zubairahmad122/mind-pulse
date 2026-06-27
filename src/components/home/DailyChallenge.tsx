import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useProgressStore } from '@/stores/useProgressStore';
import { useRouter } from 'expo-router';
import { CheckCircle, ChevronRight, Eye, Moon, Wind } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { worstArea: string };

/** Map challenge area keys to daily session store keys. */
const CHALLENGE_FEATURE_KEY: Record<string, 'eye' | 'sleep' | 'mind'> = {
  Eyes: 'eye',
  Sleep: 'sleep',
  Mind: 'mind',
};

const CHALLENGES: Record<string, { title: string; subtitle: string; icon: typeof Eye; route: string; color: string; duration: string }> = {
  Eyes:  { title: 'Eye Break', subtitle: 'Follow the guided protocol', icon: Eye,   route: '/(app)/cvs-protocol',            color: '#06B6D4', duration: '3 min' },
  Sleep: { title: 'Sleep Session', subtitle: 'Track tonight\'s sleep',  icon: Moon,  route: '/(app)/(tabs)/sleep?tab=tonight', color: '#8B5CF6', duration: '1 min' },
  Mind:  { title: 'Box Breathing', subtitle: 'Calm your nervous system', icon: Wind,  route: '/(app)/stress/box-breathing',     color: '#8B5CF6', duration: '5 min' },
};

export function DailyChallenge({ worstArea }: Props) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const challenge = CHALLENGES[worstArea] ?? CHALLENGES.Mind;
  const ChallengeIcon = challenge.icon;

  const featureKey = CHALLENGE_FEATURE_KEY[worstArea] ?? 'mind';
  const today = new Date().toISOString().slice(0, 10);
  const done = useProgressStore((s) => {
    const hasAnySession = s.eyeExercisesCompleted > 0 || s.eyeGamesPlayed > 0 ||
      s.relaxSessionsCompleted > 0 || s.mindSessionsCompleted > 0 || s.sleepSessionsTracked > 0;
    return hasAnySession && s.todayDate === today && s.todaySessions[featureKey];
  });

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
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>DAILY CHALLENGE</Text>
      <TouchableOpacity onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <GlassCard style={[styles.card, done && styles.cardDone]}>
            {/* Accent left border stripe */}
            <View style={[styles.accentStripe, { backgroundColor: challenge.color }]} />

            <View style={[styles.iconWrap, { backgroundColor: challenge.color + '18', borderColor: challenge.color + '28' }]}>
              <ChallengeIcon size={22} color={challenge.color} strokeWidth={2} />
            </View>

            <View style={styles.info}>
              <Text style={[styles.title, done && styles.titleDone]}>{challenge.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.sub}>{challenge.subtitle}</Text>
                <Text style={styles.duration}>· {challenge.duration}</Text>
              </View>
            </View>

            {done ? (
              <View style={styles.donePill}>
                <CheckCircle size={14} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.donePillText}>DONE</Text>
              </View>
            ) : (
              <View style={styles.arrowWrap}>
                <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.5} />
              </View>
            )}
          </GlassCard>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  cardDone: { opacity: 0.65 },
  accentStripe: {
    width: 3,
    height: '70%',
    borderRadius: 2,
    marginLeft: 2,
    marginRight: -4,
    opacity: 0.7,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  info: { flex: 1, gap: 3 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sub: {
    fontSize: 12,
    color: colors.text.secondary,
    letterSpacing: 0.1,
  },
  duration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  donePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#10B981',
  },
});
