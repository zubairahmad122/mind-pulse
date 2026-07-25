import { Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

// Same indigo accent + icon-container language as the Sleep tab's AI Insight
// card, so the two "AI" surfaces in the app read as one design language.
const INDIGO = PILLAR_COLORS.sleep;

type Props = {
  message: string;
  loading?: boolean;
};

// ─── Pulsing dot ──────────────────────────────────────────────────────────────

function PulsingDot() {
  const pulse = useSharedValue(0.2);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        anim,
      ]}
    />
  );
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────

function SkeletonLine({ width, height = 14 }: { width: number | string; height?: number }) {
  const pulse = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          // Reanimated animated width comes back as a number from the shared
          // value; `as any` avoids the RN Web style type mismatch.
          width: width as any,
          height,
          borderRadius: 7,
          backgroundColor: 'rgba(255,255,255,0.07)',
        },
        anim,
      ]}
    />
  );
}

function Shimmer() {
  return (
    <View style={styles.shimmerWrap}>
      <SkeletonLine width="100%" height={14} />
      <SkeletonLine width="85%" height={14} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIRecommendation({ message, loading }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Sparkles size={16} color={INDIGO} strokeWidth={2} />
        </View>
        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>
              {loading ? 'GENERATING…' : 'AI RECOMMENDATION'}
            </Text>
            {loading && <PulsingDot />}
          </View>
          {loading ? (
            <Shimmer />
          ) : (
            <Text style={styles.body} numberOfLines={2}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: INDIGO + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { fontSize: 13, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: INDIGO },
  body: { ...typography.bodyLarge, color: colors.text.secondary, lineHeight: 22 },
  // Shimmer
  shimmerWrap: { gap: 8 },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: INDIGO,
    marginLeft: 'auto',
  },
});
