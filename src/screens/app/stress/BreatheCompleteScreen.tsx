import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type BreathModeId, getBreathMode } from '@/constants/breathingModes';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

// Per-mode completion copy
const COMPLETE_COPY: Record<BreathModeId, { headline: string; body: string }> = {
  'calm-flow': {
    headline: 'Something shifted.',
    body: 'You gave yourself a few minutes of quiet. In a noisy world, that is more than most people do for themselves.',
  },
  'box-release': {
    headline: 'Your rhythm held.',
    body: 'Cycles of letting go. That\'s your nervous system learning it\'s okay to rest.',
  },
  'sleep-drop': {
    headline: 'Rest well.',
    body: 'Everything you were carrying has been set down. Your body knows what to do from here.',
  },
  'reset-wave': {
    headline: 'You just reset.',
    body: 'The wave brought you back. Notice how different your shoulders feel right now.',
  },
};

// Suggested next session per mode
const NEXT_SESSION: Record<BreathModeId, { label: string; route: string }> = {
  'calm-flow':   { label: 'Try Body Scan',     route: ROUTES.appBodyScan },
  'box-release': { label: 'Sleep Story →',     route: ROUTES.appRelax },
  'sleep-drop':  { label: 'Sleep tracker →',   route: ROUTES.appSleep },
  'reset-wave':  { label: 'Try Body Scan',     route: ROUTES.appBodyScan },
};

function IconSpark({ color }: { color: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.iconWrap, { backgroundColor: color + '18', borderColor: color + '35' }, style]}>
      <Ionicons name="leaf-outline" size={40} color={color} />
    </Animated.View>
  );
}

export default function BreatheCompleteScreen() {
  const router = useRouter();
  const { modeId, durationSec } = useLocalSearchParams<{ modeId: BreathModeId; durationSec: string }>();
  const mode = getBreathMode(modeId ?? 'calm-flow');
  const copy = COMPLETE_COPY[mode.id];
  const next = NEXT_SESSION[mode.id];

  const rawSec  = parseInt(durationSec ?? '0', 10);
  const minutes = Math.floor(rawSec / 60);
  const seconds = rawSec % 60;
  const durationLabel = minutes > 0
    ? `${minutes} min${seconds > 0 ? ` ${seconds}s` : ''}`
    : `${rawSec}s`;

  // Staggered entrance animations
  const headOp  = useSharedValue(0);
  const headY   = useSharedValue(16);
  const bodyOp  = useSharedValue(0);
  const cardOp  = useSharedValue(0);
  const cardY   = useSharedValue(20);
  const btnOp   = useSharedValue(0);

  useEffect(() => {
    headOp.value  = withDelay(300,  withTiming(1, { duration: 500 }));
    headY.value   = withDelay(300,  withSpring(0, { damping: 18, stiffness: 160 }));
    bodyOp.value  = withDelay(600,  withTiming(1, { duration: 500 }));
    cardOp.value  = withDelay(900,  withTiming(1, { duration: 500 }));
    cardY.value   = withDelay(900,  withSpring(0, { damping: 18, stiffness: 160 }));
    btnOp.value   = withDelay(1300, withTiming(1, { duration: 500 }));
  }, []);

  const headStyle = useAnimatedStyle(() => ({ opacity: headOp.value, transform: [{ translateY: headY.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOp.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOp.value, transform: [{ translateY: cardY.value }] }));
  const btnStyle  = useAnimatedStyle(() => ({ opacity: btnOp.value }));

  // Sleep drop — no completion card, just the minimal experience
  if (mode.id === 'sleep-drop') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#050412' }]}>
        <View style={styles.sleepDoneWrap}>
          <Animated.Text style={[styles.sleepWord, { color: mode.color }]}>
            rest well
          </Animated.Text>
        </View>
        <TouchableOpacity
          style={styles.sleepDismiss}
          onPress={() => router.replace(ROUTES.appRelax as never)}
        >
          <Text style={styles.sleepDismissText}>done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {/* ── Icon ── */}
        <IconSpark color={mode.color} />

        {/* ── Headline ── */}
        <Animated.View style={headStyle}>
          <Text style={styles.headline}>{copy.headline}</Text>
        </Animated.View>

        {/* ── Body copy ── */}
        <Animated.View style={bodyStyle}>
          <Text style={styles.body}>"{copy.body}"</Text>
        </Animated.View>

        {/* ── Stats card ── */}
        <Animated.View style={[styles.statCard, { borderColor: mode.color + '30' }, cardStyle]}>
          <View style={styles.statRow}>
            <Ionicons name="time-outline" size={14} color={mode.color} />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={[styles.statValue, { color: mode.color }]}>{durationLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Ionicons name={mode.icon} size={14} color={mode.color} />
            <Text style={styles.statLabel}>Session</Text>
            <Text style={[styles.statValue, { color: mode.color }]}>{mode.title}</Text>
          </View>
        </Animated.View>

        {/* ── Mood check ── */}
        <Animated.View style={[styles.moodWrap, bodyStyle]}>
          <Text style={styles.moodQuestion}>How do you feel now?</Text>
          <View style={styles.moodRow}>
            {['😌', '🌊', '😐', '😤', '😴'].map((e, i) => (
              <TouchableOpacity
                key={i}
                style={styles.moodBtn}
                onPress={() => router.replace(ROUTES.appRelax as never)}
              >
                <Text style={styles.moodEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* ── Action buttons ── */}
      <Animated.View style={[styles.btnArea, btnStyle]}>
        <TouchableOpacity
          style={[styles.nextBtn, { borderColor: mode.color + '55' }]}
          onPress={() => router.replace(next.route as never)}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextBtnText, { color: mode.color }]}>{next.label}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace(ROUTES.appRelax as never)}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Done for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.lg,
  },

  // Icon
  iconWrap: {
    width: 88, height: 88, borderRadius: 28, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  // Copy
  headline: {
    fontSize: 28, fontWeight: '700', color: colors.text.primary,
    textAlign: 'center', letterSpacing: -0.3,
  },
  body: {
    ...typography.body, color: colors.text.secondary,
    textAlign: 'center', lineHeight: 24,
    fontStyle: 'italic',
  },

  // Stats card
  statCard: {
    width: '100%', backgroundColor: colors.background.secondary,
    borderRadius: 18, borderWidth: 1, padding: spacing.md, gap: spacing.sm,
  },
  statRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statLabel: { ...typography.body, color: colors.text.secondary, flex: 1 },
  statValue: { fontSize: 14, fontWeight: '700' },
  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Mood
  moodWrap:     { alignItems: 'center', gap: spacing.sm },
  moodQuestion: { ...typography.body, color: colors.text.tertiary },
  moodRow:      { flexDirection: 'row', gap: spacing.md },
  moodBtn:      { padding: 8 },
  moodEmoji:    { fontSize: 28 },

  // Buttons
  btnArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.sm },
  nextBtn: {
    paddingVertical: spacing.md, borderRadius: 100, borderWidth: 1.5,
    alignItems: 'center',
  },
  nextBtnText: { ...typography.bodyLarge, fontWeight: '700' },
  doneBtn: {
    paddingVertical: spacing.md, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  doneBtnText: { ...typography.bodyLarge, color: colors.text.secondary },

  // Sleep done (minimal)
  sleepDoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sleepWord: {
    fontSize: 22, fontWeight: '300', letterSpacing: 4, fontStyle: 'italic',
  },
  sleepDismiss: { paddingBottom: spacing.xl, alignItems: 'center' },
  sleepDismissText: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5,
  },
});
