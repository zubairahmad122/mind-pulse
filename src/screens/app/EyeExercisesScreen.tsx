import { ChevronRight, Clock3, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  EYE_BREAK_ACTIVITY,
  formatActivityDuration,
  getRecoverySession,
} from '@/constants/eyeRelax';
import { colors } from '@/constants/colors';
import {
  PILLAR_COLORS,
  RADIUS,
  SURFACE_TINT,
} from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useRouter } from 'expo-router';

const EYE_COLOR = PILLAR_COLORS.eye;

type ExerciseKind = 'session';

type ExerciseItem = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  emoji: string;
  kind: ExerciseKind;
  route: string;
};

type ExerciseCategory = {
  id: string;
  title: string;
  items: ExerciseItem[];
};

// Static seed data — these ids are always present in eyeRelax.ts, so the
// non-null assertions below can't actually fail at runtime.
const eyeReset = getRecoverySession('cvs-protocol')!;

/**
 * The Eye exercise library, grouped by purpose.
 *
 * Every title/subtitle/duration/emoji/route below is read from the single
 * eye-activity metadata source (`@/constants/eyeRelax`) — never hardcode a
 * duplicate here.
 */
const CATEGORIES: ExerciseCategory[] = [
  {
    id: 'quick',
    title: 'Quick Relief',
    items: [
      {
        id: EYE_BREAK_ACTIVITY.id,
        title: EYE_BREAK_ACTIVITY.title,
        subtitle: EYE_BREAK_ACTIVITY.subtitle,
        duration: formatActivityDuration(EYE_BREAK_ACTIVITY.durationSeconds),
        emoji: EYE_BREAK_ACTIVITY.emoji,
        kind: 'session',
        route: EYE_BREAK_ACTIVITY.route,
      },
    ],
  },
  {
    id: 'recovery',
    title: 'Recovery',
    items: [
      {
        id: eyeReset.id,
        title: eyeReset.title,
        subtitle: eyeReset.subtitle,
        duration: formatActivityDuration(eyeReset.durationSeconds),
        emoji: eyeReset.emoji,
        kind: 'session',
        route: eyeReset.route,
      },
    ],
  },
];

function ExerciseRow({
  item,
  onPress,
}: {
  item: ExerciseItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.rowCard}>
        <View style={styles.rowInner}>
          <View style={styles.rowIcon}>
            <Text style={styles.rowEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
          </View>
          <View style={styles.rowMeta}>
            <View style={styles.durationPill}>
              <Clock3 size={10} color={EYE_COLOR} strokeWidth={2.4} />
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
            <ChevronRight size={15} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function EyeExercisesScreen() {
  const router = useRouter();

  return (
    <ScreenShell pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader
          title="Eye Exercises"
          subtitle="Relief, focus, movement & recovery"
          showBack
        />

        <GlassCard style={styles.introCard} tint={SURFACE_TINT.card}>
          <View style={styles.introRow}>
            <Sparkles size={16} color={EYE_COLOR} strokeWidth={2.2} />
            <Text style={styles.introText}>
              Short activities for tired eyes — stop if you notice pain, blur,
              or double vision.
            </Text>
          </View>
        </GlassCard>

        {CATEGORIES.map(category => (
          <View key={category.id}>
            <SectionLabel first={category.id === CATEGORIES[0].id}>
              {category.title.toUpperCase()}
            </SectionLabel>
            {category.items.map(item => (
              <ExerciseRow
                key={item.id}
                item={item}
                onPress={() => router.push(item.route as never)}
              />
            ))}
          </View>
        ))}
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  introCard: {
    marginBottom: spacing.lg,
    padding: 13,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  introText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  rowCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    borderColor: EYE_COLOR + '22',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingLeft: 14,
    paddingRight: 14,
    minHeight: 70,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EYE_COLOR + '14',
    borderWidth: 1,
    borderColor: EYE_COLOR + '26',
    flexShrink: 0,
  },
  rowEmoji: { fontSize: 22 },
  rowInfo: { flex: 1, gap: 3, minWidth: 0 },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f6f8fc',
    flexShrink: 1,
  },
  rowSub: {
    fontSize: 12,
    color: 'rgba(245,247,251,0.5)',
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_COLOR + '10',
    borderWidth: 1,
    borderColor: EYE_COLOR + '28',
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: EYE_COLOR,
  },
});
