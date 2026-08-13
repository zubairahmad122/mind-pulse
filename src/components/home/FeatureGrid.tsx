import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { DURATION, ICON_CONTAINERS, ICON_SIZES, PILLAR_COLORS } from '@/constants/designSystem';
import { useRouter } from 'expo-router';
import { Brain, Eye, Leaf, Moon, RefreshCw } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Pillar = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
  /** Navigates to a route. Mutually exclusive with `onPress` — a pillar has exactly one of the two. */
  route?: string;
  /** Runs an in-place action (e.g. opening a sheet) instead of navigating. */
  onPress?: () => void;
};

function buildPillars(onResetPress?: () => void): Pillar[] {
  return [
    { id: 'eye-exercise', label: 'Eye Care', icon: Eye, color: PILLAR_COLORS.eye, route: ROUTES.appEyeRelax },
    { id: 'mind',         label: 'Mind',     icon: Brain, color: PILLAR_COLORS.mind, route: ROUTES.appMind },
    { id: 'reset',        label: 'Reset',    icon: RefreshCw, color: PILLAR_COLORS.reset, onPress: onResetPress },
    { id: 'relax',        label: 'Relax',    icon: Leaf, color: PILLAR_COLORS.relax, route: ROUTES.appRelax },
    { id: 'sleep',        label: 'Sleep',    icon: Moon, color: PILLAR_COLORS.sleep, route: ROUTES.appSleep },
  ];
}

const CARD_WIDTH = ICON_CONTAINERS.quickAction + 12;
const CARD_GAP = 0;

interface Props {
  weeklySessions?: Record<string, number>;
  showStartHere?: boolean;
  /** Opens the (shared) reset-picker sheet — Reset is an in-place action, not a route. */
  onResetPress?: () => void;
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
  index,
  showPulse,
  showStartBadge,
  showDots,
}: {
  pillar: Pillar;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  sessions: number;
  index: number;
  showPulse: boolean;
  showStartBadge?: boolean;
  showDots?: boolean;
}) {
  const router = useRouter();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [iconOpacity] = useState(() => new Animated.Value(1));
  const [entryAnim] = useState(() => new Animated.Value(0));

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

  useEffect(() => {
    // Pop in one after another rather than all at once.
    Animated.timing(entryAnim, { toValue: 1, duration: DURATION.normal, delay: index * 60, useNativeDriver: true }).start();
  }, [entryAnim, index]);

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
      onPress={() => { if (pillar.onPress) pillar.onPress(); else if (pillar.route) router.push(pillar.route as never); }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cell}
    >
      <Animated.View
        style={[
          styles.cardInner,
          {
            opacity: entryAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            {
              backgroundColor: pillar.color + '1F',
              borderColor: pillar.color + '59',
              borderTopColor: 'rgba(255,255,255,0.28)',
              shadowColor: pillar.color,
            },
            showPulse && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Animated.View style={{ opacity: iconOpacity }}>
            <Icon size={ICON_SIZES.quickAction} color={pillar.color} strokeWidth={2} />
          </Animated.View>
        </Animated.View>
        <Text style={styles.label} numberOfLines={2}>{pillar.label}</Text>
        {showDots && <WeeklyDots count={sessions} color={pillar.color} />}
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

export const FeatureGrid = memo(function FeatureGrid({ weeklySessions = {}, showStartHere = false, onResetPress }: Props) {
  const pillars = buildPillars(onResetPress);
  return (
    <View>
      {/* No edge-fade overlay here on purpose — every attempt at a color-matched
          fade ended up reading as a mismatched dark box, since the real
          background behind this row isn't flat (ambient glow/gradient). The
          ScrollView's own natural clip on the last icon (a partially-visible
          circle) is a standard, self-explanatory "swipe for more" affordance
          on its own — no overlay needed. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {pillars.map((p, index) => {
          const Icon = p.icon;
          const sessions = weeklySessions[p.id] ?? 0;
          return (
            <PillarCard
              key={p.id}
              pillar={p}
              Icon={Icon}
              sessions={sessions}
              index={index}
              showPulse={showStartHere && p.id === 'eye-exercise'}
              showStartBadge={showStartHere && p.id === 'eye-exercise'}
              showDots={!showStartHere && p.id !== 'reset'}
            />
          );
        })}
      </ScrollView>
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
  cardInner: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: ICON_CONTAINERS.quickAction,
    height: ICON_CONTAINERS.quickAction,
    borderRadius: ICON_CONTAINERS.quickAction / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  label: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 11,
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
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
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
});
