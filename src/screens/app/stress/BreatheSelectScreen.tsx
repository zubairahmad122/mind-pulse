import { X, Clock, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BREATH_MODES, type BreathMode } from '@/constants/breathingModes';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const INTENSITY_LABELS = ['Softest', 'Gentle', 'Active'];

function ModeCard({ mode, index, onPress }: { mode: BreathMode; index: number; onPress: () => void }) {
  const opacity = useSharedValue(0);
  const transY  = useSharedValue(28);
  const scale   = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(index * 90, withTiming(1, { duration: 400 }));
    transY.value  = withDelay(index * 90, withSpring(0, { damping: 18, stiffness: 180 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }, { scale: scale.value }],
  }));

  const isDefault = index === 0;

  return (
    <Animated.View style={cardStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1.0, { damping: 15, stiffness: 300 }); }}
        activeOpacity={1}
        style={[
          styles.card,
          { borderColor: isDefault ? mode.color + '55' : 'rgba(255,255,255,0.08)' },
          isDefault && { backgroundColor: mode.color + '10' },
        ]}
      >
        {/* Left: icon + intensity */}
        <View style={[styles.iconBox, { backgroundColor: mode.color + '18', borderColor: mode.color + '35' }]}>
          {(() => { const ModeIcon = mode.icon; return <ModeIcon size={26} color={mode.color} />; })()}
        </View>

        {/* Center: text */}
        <View style={styles.cardText}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{mode.title}</Text>
            {isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: mode.color + '22' }]}>
                <Text style={[styles.defaultBadgeText, { color: mode.color }]}>default</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTagline}>{mode.tagline}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{mode.description}</Text>

          {/* Intensity + duration row */}
          <View style={styles.metaRow}>
            {/* Intensity dots */}
            <View style={styles.intensityDots}>
              {[1, 2, 3].map(n => (
                <View
                  key={n}
                  style={[
                    styles.dot,
                    { backgroundColor: n <= mode.intensity ? mode.color : 'rgba(255,255,255,0.12)' },
                  ]}
                />
              ))}
              <Text style={styles.intensityLabel}>{INTENSITY_LABELS[mode.intensity - 1]}</Text>
            </View>
            {/* Duration */}
            <View style={styles.durationChip}>
              <Clock size={10} color={colors.text.tertiary} />
              <Text style={styles.durationText}>{mode.durationMin} min</Text>
            </View>
          </View>
        </View>

        {/* Right: enter arrow */}
        <ChevronRight size={16} color={mode.color + '80'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BreatheSelectScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
        >
          <X size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter} />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.heading}>Find your pace.</Text>
          <Text style={styles.subheading}>
            Every session is a gentle invitation.{'\n'}
            Follow as much or as little as you wish.
          </Text>
        </View>

        {/* ── Mode cards ── */}
        {BREATH_MODES.map((mode, i) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            index={i}
            onPress={() =>
              router.push({
                pathname: '/(app)/stress/breathe-session',
                params: { modeId: mode.id },
              } as never)
            }
          />
        ))}

        {/* ── Bottom note ── */}
        <Text style={styles.bottomNote}>
          You can leave any session at any time by swiping down.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },

  // Title block
  titleBlock: { marginBottom: spacing.xl, gap: spacing.sm },
  heading: {
    fontSize: 32, fontWeight: '700', color: colors.text.primary,
    letterSpacing: -0.5, lineHeight: 38,
  },
  subheading: {
    ...typography.body, color: colors.text.secondary,
    lineHeight: 22,
  },

  // Mode card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20, borderWidth: 1,
    padding: spacing.md, gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 54, height: 54, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardText:    { flex: 1, gap: 4 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: colors.text.primary },
  defaultBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  defaultBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cardTagline: { fontSize: 12, color: colors.text.secondary, fontStyle: 'italic', lineHeight: 17 },
  cardDesc:    { fontSize: 11, color: colors.text.tertiary, lineHeight: 15 },

  // Meta row
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  intensityDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  intensityLabel: { fontSize: 10, color: colors.text.tertiary, fontWeight: '600', marginLeft: 2 },
  durationChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationText: { fontSize: 10, color: colors.text.tertiary, fontWeight: '600' },

  // Bottom note
  bottomNote: {
    ...typography.caption, color: colors.text.tertiary,
    textAlign: 'center', marginTop: spacing.lg, lineHeight: 18,
  },
});
