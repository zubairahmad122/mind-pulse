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
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

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
      <View style={styles.shimmerBadge}>
        <SkeletonLine width={16} height={16} />
        <SkeletonLine width={120} height={12} />
      </View>
      <SkeletonLine width="100%" height={14} />
      <SkeletonLine width="85%" height={14} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIRecommendation({ message, loading }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.badgeRow}>
        <Sparkles size={14} color={colors.accent.purple} strokeWidth={2} />
        <Text style={styles.badge}>
          {loading ? 'Generating your recommendation…' : 'AI Recommendation'}
        </Text>
        {loading && <PulsingDot />}
      </View>
      {loading ? <Shimmer /> : <Text style={styles.body}>{message}</Text>}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { ...typography.label, color: colors.accent.purple },
  body: { ...typography.bodyLarge, color: colors.text.secondary, lineHeight: 22 },
  // Shimmer
  shimmerWrap: { gap: 8 },
  shimmerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent.purple,
    marginLeft: 'auto',
  },
});
