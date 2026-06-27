import { GlassCard } from '@/components/ui/GlassCard';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import { Brain, Eye, Gamepad2, Leaf, Moon } from 'lucide-react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Pillar = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
  route: string;
};

const PILLARS: Pillar[] = [
  { id: 'eye-exercise', label: 'Eye Exercise', icon: Eye, color: '#06B6D4', route: ROUTES.appEyeRelax },
  { id: 'eye-games',    label: 'Eye Games',    icon: Gamepad2, color: '#F59E0B', route: ROUTES.appEyeRelax },
  { id: 'relax',        label: 'Relax',        icon: Leaf, color: '#10B981', route: ROUTES.appRelax },
  { id: 'mind',         label: 'Mind',         icon: Brain, color: '#8B5CF6', route: ROUTES.appBoxBreathing },
  { id: 'sleep',        label: 'Sleep',        icon: Moon, color: '#6366F1', route: ROUTES.appSleep },
];

const CARD_WIDTH = 72;
const CARD_GAP = 10;

interface Props {
  weeklySessions?: Record<string, number>;
  showStartHere?: boolean;
}

const TOTAL_DOTS = 7;

function WeeklyDots({ count, color }: { count: number; color: string }) {
  const filled = Math.min(count, TOTAL_DOTS);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_DOTS }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i < filled ? color : 'rgba(255,255,255,0.12)' }]}
        />
      ))}
    </View>
  );
}

function PillarCard({
  pillar,
  Icon,
  sessions,
  showPulse,
  showStartBadge,
  showDots,
}: {
  pillar: Pillar;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  sessions: number;
  showPulse: boolean;
  showStartBadge?: boolean;
  showDots?: boolean;
}) {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showPulse) return;
    // One-time gentle pulse on mount — draws attention without looping
    const pulse = Animated.sequence([
      Animated.delay(600), // wait for stagger entrance to finish
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]);
    pulse.start();
    return () => pulse.stop();
  }, [showPulse, pulseAnim]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.92, tension: 200, friction: 12, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 0.85, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(pillar.route as never)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cell}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassCard simple noPadding style={styles.card}>
          <View style={styles.cardInner}>
            <Animated.View
              style={[
                styles.iconWrap,
                { backgroundColor: pillar.color + '20', borderColor: pillar.color + '30' },
                showPulse && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Animated.View style={{ opacity: iconOpacity }}>
                <Icon size={22} color={pillar.color} strokeWidth={2} />
              </Animated.View>
            </Animated.View>
            <Text style={styles.label} numberOfLines={2}>{pillar.label}</Text>
            {showDots && <WeeklyDots count={sessions} color={pillar.color} />}
          </View>
        </GlassCard>
      </Animated.View>

      {/* Subtle "first step" dot indicator — replaces the ugly floating badge */}
      {showStartBadge && (
        <View style={styles.startDotRow}>
          <View style={styles.startDot} />
          <Text style={styles.startDotLabel}>FIRST STEP</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const FeatureGrid = memo(function FeatureGrid({ weeklySessions = {}, showStartHere = false }: Props) {
  const [showFade, setShowFade] = useState(true);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const atEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 16;
      setShowFade(!atEnd);
    },
    [],
  );

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {PILLARS.map((p) => {
          const Icon = p.icon;
          const sessions = weeklySessions[p.id] ?? 0;
          return (
            <PillarCard
              key={p.id}
              pillar={p}
              Icon={Icon}
              sessions={sessions}
              showPulse={showStartHere && p.id === 'eye-exercise'}
              showStartBadge={showStartHere && p.id === 'eye-exercise'}
              showDots={!showStartHere}
            />
          );
        })}
      </ScrollView>

      {/* Right-edge fade gradient — visual cue that more cards are off-screen */}
      {showFade && (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', colors.background.primary]}
          start={{ x: 0.7, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeEdge}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    gap: CARD_GAP,
    paddingVertical: 4,
    paddingRight: 40,
  },
  cell: {
    width: CARD_WIDTH,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  cardInner: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  // ── "First step" dot indicator (replaces floating badge) ───────────────────
  startDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  startDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
  },
  startDotLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: 'rgba(245,158,11,0.75)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  fadeEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 56,
  },
});
