import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Flame, Rocket, Sparkles, Target, Trophy, X, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, PRO_GOLD } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface GameEndStats {
  headline: string;
  subline: string;
  rating: 1 | 2 | 3;
  stats: { label: string; value: string }[];
  survived: boolean;
  disclaimer?: string;
}

interface Props {
  stats: GameEndStats;
  onReplay: () => void;
  replayLabel?: string;
  onDismiss?: () => void;
  /**
   * Overrides the default "TIME'S UP" / "GAME OVER" eyebrow with a
   * game-specific completion line (e.g. "FOCUS SWITCH COMPLETE").
   */
  title?: string;
  /** Real, verified personal-best flag — from an actual record check, never guessed. */
  isNewRecord?: boolean;
  /** Optional override for the celebratory message text. Falls back to a
   * message derived from score/rating/isNewRecord when omitted. */
  celebration?: string;
  progressReward?: {
    xpAwarded: number;
    level: number;
    leveledUp: boolean;
    /** 0..1 fraction into the current level, if already computed upstream.
     * Omit to fall back to a compact text-only XP row — never invented here. */
    progress?: number;
  } | null;
  /** The player's existing personal best going into this round — real,
   * already-fetched data (never recomputed here). Shown as a comparison
   * line when this round didn't beat it. */
  personalBest?: number | null;
  /** Optional "what's next" suggestion — a single compact row, not a card.
   * Purely a navigation hint; the parent owns where it points. */
  recommendedNext?: { label: string; onPress: () => void };
}

const EYE = PILLAR_COLORS.eye;

// ─── Timing — total reveal lands around 1.1-1.2s ───────────────────────────
const CARD_DELAY    = 60;   // small stagger after the dim starts
const HEADER_DELAY  = CARD_DELAY + 100;
const ICON_DELAY    = CARD_DELAY + 180;
const SCORE_DELAY   = CARD_DELAY + 250;
const SCORE_DURATION = 650;
const XP_DELAY       = CARD_DELAY + 500;
const XP_BAR_DURATION = 550;
const METRICS_DELAY  = CARD_DELAY + 650;
const METRICS_STAGGER = 60;
const ACTIONS_DELAY  = CARD_DELAY + 900;
const SECONDARY_EXTRA = 100;

/** Pulls the score number back out of already-computed data — never recomputes it. */
function extractScore(stats: GameEndStats): number {
  const fromList = stats.stats.find(s => s.label === 'Your Score');
  if (fromList) {
    const n = parseInt(fromList.value.replace(/[^\d-]/g, ''), 10);
    if (!Number.isNaN(n)) return n;
  }
  const n = parseInt(stats.headline.replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

type Tone = 'calm' | 'good' | 'great' | 'best';

function resolveResult(score: number, rating: 1 | 2 | 3, isNewRecord: boolean, celebration?: string) {
  if (isNewRecord && score > 0) {
    return {
      tone: 'best' as Tone,
      message: celebration ?? 'New Personal Best',
      supporting: undefined as string | undefined,
    };
  }
  if (score === 0) {
    return {
      tone: 'calm' as Tone,
      message: 'Keep Going',
      supporting: 'Try a slower mode or stop if your eyes feel uncomfortable.',
    };
  }
  if (rating === 3) return { tone: 'great' as Tone, message: 'Strong Session', supporting: undefined };
  if (rating === 2) return { tone: 'good' as Tone, message: 'Nice Focus', supporting: undefined };
  return { tone: 'calm' as Tone, message: 'Keep Going', supporting: 'Try a slower mode or stop if your eyes feel uncomfortable.' };
}

const TONE_COLOR: Record<Tone, string> = {
  calm: 'rgba(148,197,255,0.75)',
  good: EYE,
  great: '#FFB74D',
  best: EYE,
};

const TONE_ICON: Record<Tone, typeof Target> = {
  calm: Target,
  good: Sparkles,
  great: Flame,
  best: Trophy,
};

// ─── Result icon — glowing badge with a restrained idle pulse. ─────────────
function ResultIcon({ tone, delay, reducedMotion }: { tone: Tone; delay: number; reducedMotion: boolean }) {
  const scale  = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const pulse  = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = withTiming(1, { duration: 220 });
      scale.value = 1;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 220 }));
    pulse.value = withDelay(
      delay + 260,
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(pulse);
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * (1 + pulse.value * 0.04) }],
  }));

  const color = TONE_COLOR[tone];
  const Icon = TONE_ICON[tone];

  return (
    <Animated.View
      style={[
        styles.resultIcon,
        { borderColor: color + '55', shadowColor: color },
        tone === 'best' && styles.resultIconBest,
        style,
      ]}
    >
      <Icon size={30} color={color} strokeWidth={2} />
    </Animated.View>
  );
}

// ─── Celebration burst — a handful of one-shot particles, cheap and UI-thread
// driven (one shared progress value fans every dot out). Skipped entirely
// for the calm/zero-score state — no confetti when there's nothing to
// celebrate. ─────────────────────────────────────────────────────────────
function CelebrationBurst({ big }: { big: boolean }) {
  const progress = useSharedValue(0);
  const count = big ? 14 : 7;
  const angles = useMemo(
    () => Array.from({ length: count }, (_, i) => (360 / count) * i),
    [count],
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: big ? 700 : 500, easing: Easing.out(Easing.cubic) });
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, big ? 2.4 : 1.7]) }],
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, big ? 0.55 : 0.35, 0]),
  }));

  return (
    <View pointerEvents="none" style={styles.burstWrap}>
      {big && (
        <Animated.View style={[styles.burstRing, { borderColor: EYE }, ringStyle]} />
      )}
      {angles.map((deg, i) => (
        <BurstDot key={i} angleDeg={deg} progress={progress} big={big} />
      ))}
    </View>
  );
}

function BurstDot({ angleDeg, progress, big }: { angleDeg: number; progress: SharedValue<number>; big: boolean }) {
  const rad = (angleDeg * Math.PI) / 180;
  const dist = big ? 64 : 40;
  const style = useAnimatedStyle(() => {
    const d = interpolate(progress.value, [0, 1], [0, dist]);
    return {
      transform: [
        { translateX: Math.cos(rad) * d },
        { translateY: Math.sin(rad) * d },
        { scale: interpolate(progress.value, [0, 1], [1, 0.2]) },
      ],
      opacity: interpolate(progress.value, [0, 0.15, 1], [0, 1, 0]),
    };
  });
  return (
    <Animated.View
      style={[
        styles.burstDot,
        { backgroundColor: big ? PRO_GOLD : EYE, shadowColor: big ? PRO_GOLD : EYE },
        style,
      ]}
    />
  );
}

function AnimatedBlock({
  delay, style, reducedMotion, children,
}: { delay: number; style?: object; reducedMotion: boolean; children: ReactNode }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(10);

  useEffect(() => {
    if (reducedMotion) { opacity.value = withTiming(1, { duration: 200 }); ty.value = 0; return; }
    opacity.value = withDelay(delay, withTiming(1, { duration: 260 }));
    ty.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 200 }));
  }, [reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function MetricBlock({ label, value, delay, reducedMotion }: { label: string; value: string; delay: number; reducedMotion: boolean }) {
  return (
    <AnimatedBlock delay={delay} style={styles.metricBlock} reducedMotion={reducedMotion}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
    </AnimatedBlock>
  );
}

export function GameOverScreen({
  stats,
  onReplay,
  replayLabel = 'Beat Your Best',
  onDismiss,
  title,
  isNewRecord,
  celebration,
  progressReward,
  personalBest,
  recommendedNext,
}: Props) {
  const reducedMotion = useReducedMotion();
  const { height: winH } = useWindowDimensions();

  const overlayOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale   = useSharedValue(0.94);
  const cardTy      = useSharedValue(28);
  const closeScale  = useSharedValue(1);
  const closeOpacity = useSharedValue(1);

  const score  = useMemo(() => extractScore(stats), [stats]);
  const newRecord = isNewRecord ?? !!celebration;
  const result = useMemo(
    () => resolveResult(score, stats.rating, newRecord, celebration),
    [score, stats.rating, newRecord, celebration],
  );
  const metrics = useMemo(() => stats.stats.filter(s => s.label !== 'Your Score'), [stats.stats]);

  const [displayScore, setDisplayScore] = useState(reducedMotion || score === 0 ? score : 0);
  const scoreCountTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const xpBarProgress = useSharedValue(0);
  // Reduced motion shows the bar already filled, so the glow is "ready"
  // immediately; the animated path only flips this once the fill completes.
  const [xpBarReady, setXpBarReady] = useState(reducedMotion);

  useEffect(() => {
    void Haptics.notificationAsync(
      stats.survived ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );

    if (reducedMotion) {
      overlayOpacity.value = withTiming(1, { duration: 180 });
      cardOpacity.value = withTiming(1, { duration: 200 });
      cardScale.value = 1;
      cardTy.value = 0;
    } else {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      cardOpacity.value = withDelay(CARD_DELAY, withTiming(1, { duration: 380 }));
      cardScale.value = withDelay(CARD_DELAY, withSpring(1, { damping: 20, stiffness: 180, mass: 0.9 }));
      cardTy.value = withDelay(CARD_DELAY, withSpring(0, { damping: 20, stiffness: 180, mass: 0.9 }));
    }

    // Score count-up — a handful of discrete steps (not a per-frame tween),
    // easing computed in JS. Skipped for reduced motion or a zero score.
    if (!reducedMotion && score > 0) {
      scoreStartTimer.current = setTimeout(() => {
        const steps = 24;
        let i = 0;
        scoreCountTimer.current = setInterval(() => {
          i += 1;
          const t = Math.min(1, i / steps);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplayScore(Math.round(eased * score));
          if (i >= steps) {
            if (scoreCountTimer.current) clearInterval(scoreCountTimer.current);
          }
        }, SCORE_DURATION / steps);
      }, SCORE_DELAY);
    }

    // XP progress bar fill
    if (progressReward?.progress != null) {
      if (reducedMotion) {
        xpBarProgress.value = progressReward.progress;
      } else {
        xpBarProgress.value = withDelay(
          XP_DELAY,
          withTiming(progressReward.progress, { duration: XP_BAR_DURATION, easing: Easing.out(Easing.cubic) }, (f) => {
            if (f) runOnJS(setXpBarReady)(true);
          }),
        );
      }
    }

    // Restrained haptic for a personal best, timed to when its visuals land.
    let bestHapticTimer: ReturnType<typeof setTimeout> | null = null;
    if (newRecord && score > 0) {
      bestHapticTimer = setTimeout(
        () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        reducedMotion ? 0 : ICON_DELAY,
      );
    }

    return () => {
      if (scoreStartTimer.current) clearTimeout(scoreStartTimer.current);
      if (scoreCountTimer.current) clearInterval(scoreCountTimer.current);
      if (bestHapticTimer) clearTimeout(bestHapticTimer);
    };
  }, []);

  useEffect(() => {
    if (progressReward?.leveledUp) {
      const t = setTimeout(
        () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        reducedMotion ? 0 : XP_DELAY + XP_BAR_DURATION,
      );
      return () => clearTimeout(t);
    }
  }, [progressReward?.leveledUp, reducedMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTy.value }, { scale: cardScale.value }],
  }));
  const closeStyle = useAnimatedStyle(() => ({
    opacity: closeOpacity.value,
    transform: [{ scale: closeScale.value }],
  }));
  const xpBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(xpBarProgress.value * 100)}%` as `${number}%`,
  }));

  // Close: a fast fade + slight shrink before the same onDismiss the caller
  // always used — the dismissal target never changes, only its polish.
  const handleClose = () => {
    if (!onDismiss) return;
    if (reducedMotion) { onDismiss(); return; }
    closeOpacity.value = withTiming(0, { duration: 120 });
    cardOpacity.value = withTiming(0, { duration: 190 });
    cardScale.value = withTiming(0.98, { duration: 190 }, (f) => {
      if (f) runOnJS(onDismiss)();
    });
  };

  const primaryLabel = score === 0 && replayLabel === 'Beat Your Best' ? 'Try Again' : replayLabel;
  const cardMaxHeight = Math.min(winH * 0.86, 660);

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.card, { maxHeight: cardMaxHeight }, cardStyle]}>

          {onDismiss && (
            <Animated.View style={[styles.closeBtnWrap, closeStyle]}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
                <X size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.4} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* 1 — Completion label */}
            <AnimatedBlock delay={HEADER_DELAY} style={styles.headerBlock} reducedMotion={reducedMotion}>
              <Text style={styles.eyebrow}>{title ?? (stats.survived ? "TIME'S UP" : 'GAME OVER')}</Text>
            </AnimatedBlock>

            {/* 2 — Result state icon + message */}
            <View style={styles.iconStage}>
              {result.tone !== 'calm' && (
                reducedMotion ? null : <CelebrationBurst big={result.tone === 'best'} />
              )}
              <ResultIcon tone={result.tone} delay={ICON_DELAY} reducedMotion={reducedMotion} />
            </View>
            <AnimatedBlock delay={ICON_DELAY + 40} style={styles.messageBlock} reducedMotion={reducedMotion}>
              <Text style={[styles.message, { color: TONE_COLOR[result.tone] }]}>{result.message}</Text>
              {result.tone === 'best' && (
                <View style={styles.newBestBadge}>
                  <Text style={styles.newBestText}>NEW BEST</Text>
                </View>
              )}
              {(result.supporting ?? stats.subline) ? (
                <Text style={styles.supporting}>{result.supporting ?? stats.subline}</Text>
              ) : null}
            </AnimatedBlock>

            {/* 3 — Large score */}
            <AnimatedBlock delay={SCORE_DELAY} style={styles.scoreBlock} reducedMotion={reducedMotion}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNumber}>{displayScore.toLocaleString()}</Text>
                <Text style={styles.scoreUnit}>PTS</Text>
              </View>
              {/* Personal-best comparison — only when this round didn't set
                  a new one (that's what the NEW BEST badge above is for). */}
              {!(result.tone === 'best') && personalBest != null && personalBest > 0 && (
                <Text style={styles.pbCompare}>Personal Best: {personalBest.toLocaleString()} pts</Text>
              )}
            </AnimatedBlock>

            {/* 4 — XP / level reward */}
            {progressReward && (
              <AnimatedBlock delay={XP_DELAY} style={styles.xpRow} reducedMotion={reducedMotion}>
                <View style={styles.xpTop}>
                  <View style={styles.xpTopLeft}>
                    <Zap size={13} color={PRO_GOLD} strokeWidth={2.4} />
                    <Text style={styles.xpText}>+{progressReward.xpAwarded} XP</Text>
                  </View>
                  <Text style={styles.xpLevel}>
                    Level {progressReward.level}{progressReward.leveledUp ? ' reached!' : ''}
                  </Text>
                </View>
                {progressReward.progress != null && (
                  <View style={styles.xpBarRow}>
                    {/* Bar shows progress within the current (post-round) level,
                        toward the next one — left/right edges label those two levels. */}
                    <Text style={styles.xpBarEdge}>{progressReward.level}</Text>
                    <View style={styles.xpBarTrack}>
                      <Animated.View style={[styles.xpBarFill, xpBarReady && styles.xpBarFillGlow, xpBarStyle]} />
                    </View>
                    <Text style={styles.xpBarEdge}>{progressReward.level + 1}</Text>
                  </View>
                )}
              </AnimatedBlock>
            )}

            {/* 5 — Compact performance summary */}
            {metrics.length > 0 && (
              <View style={styles.grid}>
                {metrics.map((m, i) => (
                  <MetricBlock
                    key={m.label}
                    label={m.label}
                    value={m.value}
                    delay={METRICS_DELAY + i * METRICS_STAGGER}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </View>
            )}

            {stats.disclaimer ? (
              <Text style={styles.disclaimer}>{stats.disclaimer}</Text>
            ) : null}
          </ScrollView>

          {/* 6/7 — Primary + secondary actions */}
          <AnimatedBlock delay={ACTIONS_DELAY} style={styles.actions} reducedMotion={reducedMotion}>
            <GradientCTA
              label={primaryLabel}
              icon={<Rocket size={18} color="#03212C" strokeWidth={2.4} />}
              onPress={onReplay}
              textColor="#03212C"
              height={62}
            />
          </AnimatedBlock>
          {onDismiss && (
            <AnimatedBlock delay={ACTIONS_DELAY + SECONDARY_EXTRA} style={styles.secondaryWrap} reducedMotion={reducedMotion}>
              <GradientCTA
                label="Back to Eye"
                variant="secondary"
                onPress={onDismiss}
                textColor="rgba(255,255,255,0.85)"
                letterSpacing={0.5}
              />
            </AnimatedBlock>
          )}

          {/* Recommended next activity — a single tappable line, not a card */}
          {recommendedNext && (
            <AnimatedBlock delay={ACTIONS_DELAY + SECONDARY_EXTRA + 80} style={styles.recommendedWrap} reducedMotion={reducedMotion}>
              <TouchableOpacity onPress={recommendedNext.onPress} activeOpacity={0.7} style={styles.recommendedRow}>
                <Text style={styles.recommendedText}>Next: {recommendedNext.label}</Text>
              </TouchableOpacity>
            </AnimatedBlock>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 8, 11, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 99,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#081720',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(0,224,255,0.35)',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    shadowColor: EYE,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.4,
    elevation: 20,
  },
  scrollArea: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: spacing.sm },

  closeBtnWrap: { position: 'absolute', top: 14, right: 14, zIndex: 2 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  headerBlock: { alignItems: 'center', marginBottom: spacing.sm, paddingRight: 32 },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 3,
    color: PRO_GOLD,
    textAlign: 'center',
  },

  iconStage: {
    width: 92, height: 92,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xs,
  },
  resultIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18, shadowOpacity: 0.6, elevation: 6,
  },
  resultIconBest: { shadowRadius: 26, shadowOpacity: 0.85 },

  burstWrap: {
    position: 'absolute', top: '50%', left: '50%',
    width: 1, height: 1,
  },
  burstRing: {
    position: 'absolute', left: -40, top: -40,
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
  },
  burstDot: {
    position: 'absolute', left: -3, top: -3,
    width: 6, height: 6, borderRadius: 3,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 5, shadowOpacity: 0.9,
  },

  messageBlock: { alignItems: 'center', gap: 4, marginTop: 2 },
  message: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  newBestBadge: {
    backgroundColor: 'rgba(255,215,0,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 3,
    marginTop: 2,
  },
  newBestText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#FFD700' },
  supporting: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: spacing.md,
  },

  scoreBlock: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  pbCompare: { fontSize: 11.5, fontWeight: '600', color: colors.text.tertiary, marginTop: 2 },
  scoreNumber: {
    fontFamily: FONTS.heading,
    fontSize: 56,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  scoreUnit: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: 8,
  },

  xpRow: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 12,
    marginBottom: spacing.sm,
    gap: 8,
  },
  xpTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  xpText: { fontSize: 13, fontWeight: '800', color: PRO_GOLD },
  xpLevel: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
  xpBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpBarEdge: { fontSize: 10, fontWeight: '800', color: colors.text.tertiary, width: 16, textAlign: 'center' },
  xpBarTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden',
  },
  xpBarFill: { height: 6, borderRadius: 3, backgroundColor: EYE },
  xpBarFillGlow: { shadowColor: EYE, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 0.8 },

  grid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBlock: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 2,
  },
  metricLabel: { fontSize: 10.5, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.3 },
  metricValue: { fontSize: 17, fontWeight: '800', color: colors.text.primary, fontVariant: ['tabular-nums'] },

  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },

  actions: { alignSelf: 'stretch', marginTop: spacing.md },
  secondaryWrap: { alignSelf: 'stretch', marginTop: spacing.sm },
  recommendedWrap: { alignSelf: 'stretch', marginTop: spacing.sm, alignItems: 'center' },
  recommendedRow: { paddingVertical: 6, paddingHorizontal: 10 },
  recommendedText: { fontSize: 12.5, fontWeight: '600', color: colors.text.tertiary, textAlign: 'center' },
});
