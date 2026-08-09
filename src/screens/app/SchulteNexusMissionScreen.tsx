import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Clock, Crown, Lock, Pause, Play, RotateCcw, Trophy, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  type SharedValue,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { HeroCard } from '@/components/ui/HeroCard';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import {
  BUTTON,
  FONTS,
  PILLAR_COLORS,
  RADIUS,
  STATUS_COLORS,
  SURFACE_TINT,
} from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useGameFeedbackPrefs } from '@/hooks/useGameFeedbackPrefs';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import {
  createResultPresentation,
  getCleanStreakMessage,
  getCompletionCtaLabel,
  pickPositiveMessage,
  type SchulteResultPresentation,
  shouldShowPositiveMessage,
} from './schulteNexusFeedback';
import {
  type SchulteChallenge,
} from '@/engine/core/games/schulteNexus';
import type { SchulteMissionAttempt } from '@/engine/core/games/schulteNexus/director';
import {
  loadSchulteState,
  recordPersistedLevelAttempt,
  selectPersistedNextLevelMission,
  type SchultePersistedState,
} from '@/services/schultePersistence';

/**
 * Schulte Nexus — wired to the persisted Level Mission system.
 * Mission strip, HUD and grid all read straight off one generated
 * `SchulteChallenge` — nothing here invents a board, an order or a rule of
 * its own. Layout is deliberately tight: the goal is the full board visible
 * on a normal phone screen without scrolling.
 *
 * Flow:
 * LOAD PERSISTED STATE → RESOLVE LEVEL MISSION → PRE-START → START → PLAY
 * → COMPLETE/FAIL/TIMEOUT → SAVE RESULT → UPDATE LEVEL PROGRESS → NEXT/RETRY
 */

const EYE_COLOR = PILLAR_COLORS.eye;
const GLOW_BRIGHT = '#B8F6FF';
const MAX_BOARD_WIDTH = 480;
const GRID_GAP = 10;
const CARD_PADDING = 18;
const CELL_SPARKS = [
  { x: -24, y: -17 },
  { x: 22, y: -20 },
  { x: -20, y: 22 },
  { x: 25, y: 17 },
] as const;
const LEVEL_UP_PARTICLES = Array.from({ length: 10 }, (_, index) => ({
  angle: (Math.PI * 2 * index) / 10,
  distance: 34 + (index % 3) * 7,
  color: index % 3 === 0 ? '#8B5CF6' : index % 2 === 0 ? '#38BDF8' : EYE_COLOR,
}));
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ─── Helpers ────────────────────────────────────────────────────────────────

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const totalCentis = Math.max(0, Math.round(ms / 10));
  const seconds = Math.floor(totalCentis / 100);
  const centis = totalCentis % 100;
  return `${seconds}.${String(centis).padStart(2, '0')}s`;
}

function formatTimeLimit(ms: number): string {
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

function formatTimeLimitLong(ms: number): string {
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds} sec` : `${seconds.toFixed(1)} sec`;
}

function describeFamily(family: SchulteChallenge['family']): string {
  const map: Record<string, string> = {
    ascending: 'Ascending order',
    descending: 'Descending order',
    'alternating-ends': 'Alternating ends',
    'odd-then-even': 'Odd then even',
    'even-then-odd': 'Even then odd',
    'fixed-step': 'Fixed step',
    'reverse-blocks': 'Reverse blocks',
    'custom-target-queue': 'Custom queue',
    'rule-switch': 'Rule switch',
  };
  return map[family] ?? capitalize(family);
}

// ─── Mission reminder (compact, shown once gameplay is live) ───────────────

function CompactMissionReminder({ challenge, level }: { challenge: SchulteChallenge; level: number }) {
  const first = challenge.targetSequence[0];
  const last = challenge.targetSequence[challenge.targetSequence.length - 1];
  const familyLabel = describeFamily(challenge.family);
  return (
    <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.reminderOuter}>
      <View style={styles.reminderInner}>
        <Text style={styles.reminderText}>
          L{level} · {first} → {last} · {familyLabel}
        </Text>
      </View>
    </GlassCard>
  );
}

// ─── Pre-start mission card ─────────────────────────────────────────────────

function MissionBriefingCard({
  challenge,
  level,
  levelProgress,
}: {
  challenge: SchulteChallenge;
  level: number;
  levelProgress: number;
}) {
  const first = challenge.targetSequence[0];
  const last = challenge.targetSequence[challenge.targetSequence.length - 1];
  const familyLabel = describeFamily(challenge.family);
  const columns = challenge.columns ?? challenge.boardSize;
  return (
    <HeroCard style={styles.missionCardOuter}>
      <View style={styles.missionCardInner}>
        <Text style={styles.missionCardLevel}>LEVEL {level}</Text>
        <Text style={styles.missionCardEyebrow}>TODAY&apos;S MISSION</Text>
        <Text style={styles.missionCardSequence}>
          {first} → {last}
        </Text>
        <Text style={styles.missionCardDirection}>{familyLabel}</Text>
      <View style={styles.missionCardMetaRow}>
          <Text style={styles.missionCardMeta} numberOfLines={2}>
            {capitalize(challenge.difficultyBand)} · {challenge.boardSize}×{columns} ·{' '}
            {formatTimeLimit(challenge.timeLimitMs)}
          </Text>
          <Text style={styles.missionCardMistakes} numberOfLines={2}>
            {challenge.maximumErrors} mistakes max
          </Text>
        </View>
        {levelProgress > 0 && (
          <View style={styles.levelProgressMini}>
            <View style={styles.levelProgressTrack}>
              <View style={[styles.levelProgressFill, { width: `${Math.min(100, levelProgress)}%` }]} />
            </View>
            <Text style={styles.levelProgressLabel}>{levelProgress}/100</Text>
          </View>
        )}
      </View>
    </HeroCard>
  );
}

// ─── Board lock overlay ─────────────────────────────────────────────────────

function BoardLockOverlay({
  active,
  challenge,
  reducedMotion,
}: {
  active: boolean;
  challenge: SchulteChallenge;
  reducedMotion: boolean;
}) {
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    opacity.value = reducedMotion
      ? (active ? 1 : 0)
      : withTiming(active ? 1 : 0, { duration: active ? 0 : 150 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `opacity` intentionally excluded, shared values are ref-stable.
  }, [active, reducedMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View pointerEvents="none" style={[styles.boardLockOverlay, overlayStyle]}>
      <View style={styles.boardLockScrim} />

      <View style={styles.boardLockCenter}>
        <View style={styles.boardLockIconWrap}>
          <Lock size={18} color={EYE_COLOR} strokeWidth={2.2} />
        </View>
        <Text style={styles.boardLockTitle}>Ready?</Text>
        <Text style={styles.boardLockSubtitle}>Start the challenge to unlock the board</Text>
        <Text style={styles.boardLockMeta}>
          {formatTimeLimitLong(challenge.timeLimitMs)} · {challenge.maximumErrors} mistakes max
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Premium lock screen ────────────────────────────────────────────────────

function PremiumRequiredCard({ level, onBack }: { level: number; onBack: () => void }) {
  return (
    <GlassCard tint={SURFACE_TINT.card} style={styles.completeCard}>
      <View style={[styles.completeBadge, styles.completeBadgePremium]}>
        <Crown size={20} color="#FFD700" strokeWidth={2.2} />
      </View>
      <Text style={styles.completeTitle}>LEVEL {level}</Text>
      <Text style={styles.completeSubtitle}>Adaptive Sequence Missions</Text>
      <Text style={styles.completeSubtitle}>Premium required to continue.</Text>
      <GradientCTA label="Explore Premium" onPress={onBack} style={styles.completeCtaGap} />
      <GradientCTA label="Back to Games" variant="secondary" onPress={onBack} />
    </GlassCard>
  );
}

// ─── Error state ────────────────────────────────────────────────────────────

function ErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <GlassCard tint={SURFACE_TINT.card} style={styles.completeCard}>
      <Text style={styles.completeTitle}>Challenge unavailable</Text>
      <Text style={styles.completeSubtitle}>Something went wrong loading the mission.</Text>
      <GradientCTA label="Try Again" onPress={onRetry} style={styles.completeCtaGap} />
      <GradientCTA label="Back" variant="secondary" onPress={onBack} />
    </GlassCard>
  );
}

// ─── Micro feedback text ────────────────────────────────────────────────────

function MicroMessage({
  text,
  strong,
  tone = 'success',
  reducedMotion,
  onDone,
}: {
  text: string;
  strong: boolean;
  tone?: 'success' | 'warning';
  reducedMotion: boolean;
  onDone: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 140 }, finished => {
          if (finished) runOnJS(onDone)();
        });
      }, 400);
      return () => clearTimeout(timer);
    }
    opacity.value = withTiming(1, { duration: 90 });
    translateY.value = withTiming(0, { duration: 120 });
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 160 });
      translateY.value = withTiming(-8, { duration: 160 }, finished => {
        if (finished) runOnJS(onDone)();
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, shared values are ref-stable.
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.microMessageWrap, style]}>
      <Text
        style={[
          styles.microMessageText,
          tone === 'warning' && styles.microMessageTextWarning,
          strong && styles.microMessageTextStrong,
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

// ─── HUD ────────────────────────────────────────────────────────────────────

function TargetValue({ value, reducedMotion }: { value: number | null; reducedMotion: boolean }) {
  const [display, setDisplay] = useState(value);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (value === display) return;
    if (reducedMotion) {
      progress.value = withTiming(0, { duration: 80 }, finished => {
        if (!finished) return;
        runOnJS(setDisplay)(value);
        progress.value = withTiming(1, { duration: 100 });
      });
      return;
    }
    progress.value = withTiming(0, { duration: 90 }, finished => {
      if (!finished) return;
      runOnJS(setDisplay)(value);
      progress.value = withTiming(1, { duration: 110 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `display`/`progress`/`reducedMotion` intentionally excluded, this only reacts to a new `value`.
  }, [value]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reducedMotion ? 1 : interpolate(progress.value, [0, 1], [0.9, 1]) }],
  }));

  return (
    <Animated.Text style={[styles.hudValue, styles.hudValueTarget, style]}>
      {display ?? '—'}
    </Animated.Text>
  );
}

function TimeValue({ remainingMs, reducedMotion }: { remainingMs: number; reducedMotion: boolean }) {
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const pressureTime = secondsLeft <= 10 && secondsLeft > 0;
  const strongTime = secondsLeft <= 5 && secondsLeft > 0;
  const criticalTime = secondsLeft <= 3 && secondsLeft > 0;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!pressureTime) {
      pulse.value = withTiming(1, { duration: 150 });
      return;
    }
    const peak = criticalTime ? 1.14 : strongTime ? 1.08 : 1.03;
    const dip = criticalTime ? 0.55 : strongTime ? 0.7 : 0.85;
    const upMs = criticalTime ? 260 : strongTime ? 320 : 420;
    const downMs = criticalTime ? 740 : strongTime ? 900 : 1080;
    pulse.value = reducedMotion
      ? withRepeat(withSequence(withTiming(dip, { duration: upMs }), withTiming(1, { duration: downMs })), -1, false)
      : withRepeat(withSequence(withTiming(peak, { duration: upMs }), withTiming(1, { duration: downMs })), -1, false);
  }, [pressureTime, strongTime, criticalTime, reducedMotion, pulse]);

  const style = useAnimatedStyle(() =>
    reducedMotion ? { opacity: pulse.value } : { transform: [{ scale: pulse.value }] },
  );

  return (
    <Animated.Text style={[styles.hudValue, pressureTime && styles.hudValueWarning, style]}>
      {formatCountdown(remainingMs)}
    </Animated.Text>
  );
}

function MissionHud({
  nextTarget,
  remainingMs,
  errors,
  maxErrors,
  reducedMotion,
}: {
  nextTarget: number | null;
  remainingMs: number;
  errors: number;
  maxErrors: number;
  reducedMotion: boolean;
}) {
  return (
    <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.hudCardOuter}>
      <View style={styles.hudRow}>
        <View style={[styles.hudItem, styles.hudItemLeft]} accessibilityLabel={`Target ${nextTarget ?? 'none'}`}>
          <Text style={styles.hudLabel}>TARGET</Text>
          <View style={styles.hudTargetSlot} accessibilityLiveRegion="polite">
          <TargetValue value={nextTarget} reducedMotion={reducedMotion} />
          </View>
        </View>
        <View style={[styles.hudItem, styles.hudItemCenter]} accessibilityLabel={`${formatCountdown(remainingMs)} remaining`}>
          <Text style={styles.hudLabel}>TIME</Text>
          <View style={styles.hudTimeSlot}>
          <TimeValue remainingMs={remainingMs} reducedMotion={reducedMotion} />
          </View>
        </View>
        <View style={[styles.hudItem, styles.hudItemRight]} accessibilityLabel={`${errors} of ${maxErrors} mistakes`}>
          <Text style={styles.hudLabel}>MISTAKES</Text>
          <Text style={[styles.hudValue, errors > 0 && styles.hudValueError]}>
            {errors}/{maxErrors}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Board ──────────────────────────────────────────────────────────────────

function SchulteCell({
  value,
  size,
  locked,
  flashToken,
  glowToken,
  glowStrong,
  reducedMotion,
  disabled,
  isNeutral,
  onPress,
}: {
  value: number;
  size: number;
  locked: boolean;
  flashToken: number;
  glowToken: number;
  glowStrong: boolean;
  reducedMotion: boolean;
  disabled: boolean;
  isNeutral: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0);
  const pulse = useSharedValue(0);

  function handlePressIn() {
    if (disabled || locked || reducedMotion) return;
    scale.value = withTiming(0.96, { duration: 70 });
  }

  const prevGlowToken = useRef(glowToken);
  const prevFlashToken = useRef(flashToken);
  useEffect(() => {
    const glowFired = glowToken !== prevGlowToken.current && glowToken !== 0;
    const flashFired = flashToken !== prevFlashToken.current && flashToken !== 0;
    prevGlowToken.current = glowToken;
    prevFlashToken.current = flashToken;

    if (glowFired) {
      if (reducedMotion) {
        glow.value = 1;
        scale.value = 1;
        const timer = setTimeout(() => { glow.value = 0; }, 400);
        return () => clearTimeout(timer);
      }
      scale.value = withSequence(
        withTiming(1.035, { duration: 90 }),
        withTiming(1, { duration: 140 }),
      );
      glow.value = withTiming(1, { duration: 40 }, finished => {
        if (finished) glow.value = withTiming(0, { duration: 360 });
      });
      pulse.value = 0;
      pulse.value = withTiming(1, { duration: 340 });
    } else if (flashFired) {
      if (reducedMotion) {
        flash.value = 1;
        const timer = setTimeout(() => { flash.value = 0; }, 220);
        return () => clearTimeout(timer);
      }
      flash.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 260 }));
      scale.value = withTiming(1, { duration: 60 });
      shakeX.value = withSequence(
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 55 }),
        withTiming(-3, { duration: 55 }),
        withTiming(0, { duration: 50 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are ref-stable, only the tokens should retrigger this.
  }, [glowToken, flashToken]);

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: reducedMotion ? 0 : shakeX.value }],
    borderColor: flash.value > 0.01
      ? STATUS_COLORS.error
      : glow.value > 0.01
        ? interpolateColor(glow.value, [0, 1], [locked ? EYE_COLOR : 'rgba(255,255,255,0.12)', GLOW_BRIGHT])
        : locked
          ? EYE_COLOR
          : isNeutral
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.12)',
  }));

  const glowRingStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? 0
      : interpolate(pulse.value, [0, 0.18, 1], [0, glowStrong ? 0.55 : 0.4, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.9, glowStrong ? 1.3 : 1.18]) }],
  }));

  const flashOverlayStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const successOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, glowStrong ? 0.2 : 0.13]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(glow.value, [0, 1], [locked ? EYE_COLOR : isNeutral ? 'rgba(245,247,251,0.35)' : '#f6f8fc', '#FFFFFF']),
  }));

  const backgroundColor = locked
    ? 'rgba(0,224,255,0.16)'
    : isNeutral
      ? 'rgba(255,255,255,0.03)'
      : 'rgba(255,255,255,0.05)';

  return (
    <TouchableOpacity
      disabled={locked || disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${value}, locked` : isNeutral ? `${value}, neutral` : `Tap ${value}`}
      accessibilityState={{ disabled: locked || disabled, selected: locked }}
    >
      <View style={{ width: size, height: size }}>
        <Animated.View pointerEvents="none" style={[styles.cellGlowRing, glowRingStyle]} />
        <Animated.View style={[styles.cell, { width: size, height: size, backgroundColor }, cellStyle]}>
          <View pointerEvents="none" style={styles.cellHighlight} />
          <Animated.View pointerEvents="none" style={[styles.cellFlashOverlay, flashOverlayStyle]} />
          <Animated.View pointerEvents="none" style={[styles.cellSuccessOverlay, successOverlayStyle]} />
          <Animated.Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.cellText, { fontSize: Math.max(15, Math.min(20, size * 0.36)) }, textStyle]}
          >
            {value}
          </Animated.Text>
          {locked && (
            <Lock
              size={Math.min(14, Math.round(size * 0.2))}
              color={EYE_COLOR}
              strokeWidth={2.4}
              style={styles.cellLockIcon}
            />
          )}
        </Animated.View>
        {!reducedMotion && CELL_SPARKS.map((spark, index) => (
          <CellSpark key={index} progress={pulse} x={spark.x} y={spark.y} />
        ))}
      </View>
    </TouchableOpacity>
  );
}

function CellSpark({
  progress,
  x,
  y,
}: {
  progress: SharedValue<number>;
  x: number;
  y: number;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0, 0.75, 0]),
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { scale: interpolate(progress.value, [0, 1], [0.7, 0.25]) },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.cellSpark, style]} />;
}

function MissionBoard({
  challenge,
  lockedValues,
  wrongTokens,
  justLockedValue,
  justLockedToken,
  justLockedStrong,
  reducedMotion,
  disabled,
  onTap,
  celebrationToken,
}: {
  challenge: SchulteChallenge;
  lockedValues: ReadonlySet<number>;
  wrongTokens: ReadonlyMap<number, number>;
  justLockedValue: number | null;
  justLockedToken: number;
  justLockedStrong: boolean;
  reducedMotion: boolean;
  disabled: boolean;
  onTap: (value: number) => void;
  celebrationToken: number;
}) {
  const { width: winW } = useWindowDimensions();
  const columns = challenge.columns ?? challenge.boardSize;
  const available = Math.min(winW - spacing.lg * 2 - CARD_PADDING * 2, MAX_BOARD_WIDTH);
  // Width always wins over a minimum size so 5-column boards cannot overflow
  // narrow Android screens. Typography scales independently below.
  const cellSize = Math.max(1, Math.floor((available - GRID_GAP * (columns - 1)) / columns));
  const gridWidth = cellSize * columns + GRID_GAP * (columns - 1);

  // Build a set of target values for neutral cell detection
  const targetSet = new Set(challenge.targetSequence);

  return (
    <GlassCard tint={SURFACE_TINT.card} style={styles.boardCard}>
      <View style={[styles.grid, { width: gridWidth }]}>
        {challenge.boardPositions.map(cell => (
          <SchulteCell
            key={`${cell.row}-${cell.column}`}
            value={cell.value}
            size={cellSize}
            locked={lockedValues.has(cell.value)}
            flashToken={wrongTokens.get(cell.value) ?? 0}
            glowToken={celebrationToken || (cell.value === justLockedValue ? justLockedToken : 0)}
            glowStrong={celebrationToken > 0 || justLockedStrong}
            reducedMotion={reducedMotion}
            disabled={disabled}
            isNeutral={!targetSet.has(cell.value)}
            onPress={() => onTap(cell.value)}
          />
        ))}
      </View>
    </GlassCard>
  );
}

function SuccessTransition({ reducedMotion }: { reducedMotion: boolean }) {
  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, { duration: reducedMotion ? 140 : 260 });
  }, [entrance, reducedMotion]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: reducedMotion ? 1 : interpolate(entrance.value, [0, 1], [0.92, 1]) }],
  }));

  return (
    <View style={styles.successTransition} pointerEvents="none">
      <Animated.View style={[styles.successTransitionContent, contentStyle]}>
        <View style={styles.successTrophyGlow}>
          <Trophy size={34} color={GLOW_BRIGHT} strokeWidth={2.1} />
        </View>
        <Text style={styles.successTransitionTitle}>CHALLENGE COMPLETE</Text>
        <Text style={styles.successTransitionSubtitle}>Great run.</Text>
      </Animated.View>
    </View>
  );
}

function LevelUpParticle({
  progress,
  angle,
  distance,
  color,
}: {
  progress: SharedValue<number>;
  angle: number;
  distance: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.85, 0]),
    backgroundColor: color,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: interpolate(progress.value, [0, 1], [1, 0.25]) },
    ],
  }));
  return <Animated.View style={[styles.levelUpParticle, style]} />;
}

// ─── Completion ─────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.completeStat}>
      <Text style={styles.completeStatValue}>{value}</Text>
      <Text style={styles.completeStatLabel}>{label}</Text>
    </View>
  );
}

function Completion({
  status,
  durationMs,
  correctTaps,
  totalTargets,
  errors,
  maxErrors,
  level,
  resultPresentation,
  reducedMotion,
  soundEnabled,
  hapticsEnabled,
  playSchulteLevelUp,
  playPersonalBest,
  onNextChallenge,
  onRetry,
  onBack,
}: {
  status: 'completed' | 'timeout' | 'failed';
  durationMs: number;
  correctTaps: number;
  totalTargets: number;
  errors: number;
  maxErrors: number;
  level: number;
  resultPresentation: SchulteResultPresentation | null;
  reducedMotion: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  playSchulteLevelUp: () => void;
  playPersonalBest: () => void;
  onNextChallenge: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const progress = useSharedValue(resultPresentation?.previousProgress ?? 0);
  const trophyScale = useSharedValue(1);
  const particleProgress = useSharedValue(0);
  const [progressFinished, setProgressFinished] = useState(false);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [personalBestVisible, setPersonalBestVisible] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishProgress = useCallback(() => {
    setProgressFinished(true);
    if (!resultPresentation) return;
    if (resultPresentation.wasLevelUp) {
      revealTimerRef.current = setTimeout(() => {
        setLevelUpVisible(true);
        setPersonalBestVisible(resultPresentation.wasPersonalBest);
        if (!reducedMotion) {
          trophyScale.value = withSequence(
            withTiming(1.1, { duration: 150 }),
            withTiming(1, { duration: 190 }),
          );
          particleProgress.value = 0;
          particleProgress.value = withTiming(1, { duration: 760 });
        }
        if (soundEnabled) playSchulteLevelUp();
        if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }, reducedMotion ? 120 : 320);
    } else if (resultPresentation.wasPersonalBest) {
      setPersonalBestVisible(true);
      if (soundEnabled) playPersonalBest();
    }
  }, [hapticsEnabled, particleProgress, playPersonalBest, playSchulteLevelUp, reducedMotion, resultPresentation, soundEnabled, trophyScale]);

  useEffect(() => {
    if (status !== 'completed' || !resultPresentation) return;
    progress.value = resultPresentation.previousProgress;
    const target = resultPresentation.wasLevelUp ? 100 : resultPresentation.newProgress;
    const timer = setTimeout(() => {
      progress.value = withTiming(
        target,
        { duration: reducedMotion ? 240 : 880 },
        finished => {
          if (finished) runOnJS(finishProgress)();
        },
      );
    }, reducedMotion ? 80 : 240);
    return () => {
      clearTimeout(timer);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [finishProgress, progress, reducedMotion, resultPresentation, status]);

  const progressFillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  const progressGlowStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : interpolate(progress.value, [0, 100], [0.35, 0.75]),
  }));
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : trophyScale.value }],
  }));
  const progressAnimatedProps = useAnimatedProps(() => ({
    text: `${Math.round(progress.value)} / 100`,
    defaultValue: `${Math.round(progress.value)} / 100`,
  }));

  if (status === 'failed') {
    return (
      <GlassCard tint={SURFACE_TINT.card} style={styles.completeCard}>
        <View style={[styles.completeBadge, styles.completeBadgeFailed]}>
          <XCircle size={20} color={STATUS_COLORS.error} strokeWidth={2.2} />
        </View>
        <Text style={styles.completeTitle}>CHALLENGE ENDED</Text>
        <Text style={styles.completeSubtitle}>Mistake limit reached.</Text>

        <GradientCTA
          label="Retry"
          icon={<RotateCcw size={16} color="#FFFFFF" strokeWidth={2.4} />}
          onPress={onRetry}
          height={54}
          style={styles.completeCtaGap}
        />
        <GradientCTA label="Back to Games" variant="secondary" onPress={onBack} height={54} />
      </GlassCard>
    );
  }

  const completed = status === 'completed';
  const attempts = correctTaps + errors;
  const accuracy = attempts > 0 ? Math.round((correctTaps / attempts) * 100) : 100;

  return (
    <GlassCard tint={SURFACE_TINT.card} style={styles.completeCard}>
      <View style={[styles.completeBadge, !completed && styles.completeBadgeMuted]}>
        {completed ? (
          <Animated.View style={trophyStyle}>
            <Trophy size={23} color={GLOW_BRIGHT} strokeWidth={2.1} />
            {!reducedMotion && levelUpVisible && LEVEL_UP_PARTICLES.map((particle, index) => (
              <LevelUpParticle key={index} progress={particleProgress} {...particle} />
            ))}
          </Animated.View>
        ) : (
          <Clock size={20} color="rgba(255,255,255,0.6)" strokeWidth={2.2} />
        )}
      </View>
      <Text style={styles.completeTitle}>{completed ? 'CHALLENGE COMPLETE' : "TIME'S UP"}</Text>
      <Text style={styles.completeLevel}>Level {level}</Text>
      <Text style={styles.completeSubtitle}>
        {completed
          ? `Tapped all ${totalTargets} targets in order.`
          : `${correctTaps} of ${totalTargets} targets tapped before time ran out.`}
      </Text>

      <View style={styles.completeStatsGrid}>
        <Stat label="Time" value={formatDuration(durationMs)} />
        <Stat label="Mistakes" value={`${errors}/${maxErrors}`} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Level" value={`${level}`} />
      </View>

      {personalBestVisible && (
        <View style={styles.personalBestBadge}>
          <Text style={styles.personalBestText}>★ NEW PERSONAL BEST</Text>
          <Text style={styles.personalBestTime}>{formatDuration(durationMs)}</Text>
        </View>
      )}

      {completed && resultPresentation && (
        <View style={styles.levelProgressSection}>
          <Text style={styles.levelProgressTitle}>LEVEL PROGRESS</Text>
          <Text style={styles.progressGain}>+{resultPresentation.progressGain} Progress</Text>
          <View style={styles.levelProgressTrack}>
            <Animated.View style={[styles.levelProgressFill, progressFillStyle]}>
              <Animated.View style={[styles.progressGlow, progressGlowStyle]} />
            </Animated.View>
          </View>
          <AnimatedTextInput
            editable={false}
            underlineColorAndroid="transparent"
            animatedProps={progressAnimatedProps}
            style={styles.levelProgressValue}
          />
          {progressFinished && !resultPresentation.wasLevelUp && (
            <Text style={styles.progressRemaining}>
              {Math.max(0, 100 - resultPresentation.newProgress)} points to Level {resultPresentation.newLevel + 1}
            </Text>
          )}
        </View>
      )}

      {levelUpVisible && resultPresentation && (
        <View style={styles.levelUpBadge}>
          <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
          <Text style={styles.levelUpText}>Level {resultPresentation.newLevel} Unlocked</Text>
        </View>
      )}

      {completed ? (
        <GradientCTA
          label={resultPresentation ? getCompletionCtaLabel(resultPresentation) : 'Next Challenge'}
          onPress={onNextChallenge}
          height={54}
          style={styles.completeCtaGap}
        />
      ) : (
        <GradientCTA
          label="Retry"
          icon={<RotateCcw size={16} color="#FFFFFF" strokeWidth={2.4} />}
          onPress={onRetry}
          height={54}
          style={styles.completeCtaGap}
        />
      )}
      <GradientCTA label="Back to Games" variant="secondary" onPress={onBack} height={54} />
    </GlassCard>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'ready' | 'playing' | 'celebrating' | 'complete' | 'premium' | 'error';

interface Outcome {
  readonly status: 'completed' | 'timeout' | 'failed';
  readonly durationMs: number;
}

interface JustLocked {
  readonly value: number;
  readonly token: number;
  readonly strong: boolean;
}

interface MicroMessageState {
  readonly text: string;
  readonly id: number;
  readonly strong: boolean;
  readonly tone: 'success' | 'warning';
}

export default function SchulteNexusMissionScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { hapticsEnabled, soundEnabled } = useGameFeedbackPrefs();
  const {
    playHit,
    playWrong,
    playChallengeComplete,
    playSchulteLevelUp,
    playPersonalBest,
    playFailure,
    playTimeout,
    playCountdownPulse,
    playSoftTick,
    playLaunchWhoosh,
    stopTransientSounds,
  } = useGameSounds({
    shortTapSounds: true,
  });
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const uid = user?.uid;

  // Persisted state
  const [persistedState, setPersistedState] = useState<SchultePersistedState | null>(null);
  const [challenge, setChallenge] = useState<SchulteChallenge | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [lockedValues, setLockedValues] = useState<ReadonlySet<number>>(() => new Set());
  const [targetIndex, setTargetIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [paused, setPaused] = useState(false);
  const [wrongTokens, setWrongTokens] = useState<ReadonlyMap<number, number>>(() => new Map());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [justLocked, setJustLocked] = useState<JustLocked | null>(null);
  const [microMessage, setMicroMessage] = useState<MicroMessageState | null>(null);
  const [celebrationToken, setCelebrationToken] = useState(0);
  const [resultPresentation, setResultPresentation] = useState<SchulteResultPresentation | null>(null);
  const [runId, setRunId] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const completionGuardRef = useRef(false);
  const phaseRef = useRef<Phase>('loading');
  const streakRef = useRef(0);
  const lastWordRef = useRef<string | null>(null);
  const targetIndexRef = useRef(0);
  const errorsRef = useRef(0);
  const lockedValuesRef = useRef<ReadonlySet<number>>(new Set());
  const correctTokenRef = useRef(0);
  const microIdRef = useRef(0);
  const saveStartedRef = useRef(false);
  const celebrationDoneRef = useRef(false);
  const resultReadyRef = useRef(false);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startCtaGlow = useSharedValue(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Pause the moment the app backgrounds
  useSessionLifecycle({
    onPause: () => {
      if (phaseRef.current === 'playing') setPaused(true);
    },
  });

  // ─── Load persisted state and resolve first mission ─────────────────────

  const resolveMission = useCallback(
    async (state: SchultePersistedState) => {
      try {
        const result = await selectPersistedNextLevelMission(uid, {
          userStableId: uid ?? 'guest',
          level: state.levelState.currentLevel,
          isPremium,
          mode: 'next',
        });

        if (!result.access.canPlay) {
          setChallenge(null);
          setPhase('premium');
          return;
        }

        if (!result.challenge) {
          setChallenge(null);
          setPhase('error');
          return;
        }

        setPersistedState(state);
        setChallenge(result.challenge);
        setPhase('ready');
      } catch {
        setChallenge(null);
        setPhase('error');
      }
    },
    [uid, isPremium],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await loadSchulteState(uid);
        if (!cancelled) {
          setPersistedState(state);
          await resolveMission(state);
        }
      } catch {
        if (!cancelled) {
          setChallenge(null);
          setPhase('error');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  // ─── Clock ──────────────────────────────────────────────────────────────

  function finishMission(status: Outcome['status']) {
    if (completionGuardRef.current) return;
    completionGuardRef.current = true;
    stopTransientSounds();
    streakRef.current = 0;
    setMicroMessage(null);
    setJustLocked(null);
    setWrongTokens(new Map());
    const durationMs = startedAtRef.current != null
      ? Date.now() - startedAtRef.current
      : (challenge?.timeLimitMs ?? 0);
    setOutcome({ status, durationMs });
    if (status === 'completed') {
      setCelebrationToken(token => token + 1);
      setPhase('celebrating');
      if (soundEnabled) playChallengeComplete();
      if (hapticsEnabled) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      celebrationTimerRef.current = setTimeout(() => {
        celebrationDoneRef.current = true;
        if (resultReadyRef.current) setPhase('complete');
      }, reducedMotion ? 900 : 1150);
    } else {
      if (soundEnabled) {
        if (status === 'timeout') playTimeout();
        else playFailure();
      }
      if (hapticsEnabled) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      setPhase('complete');
    }
  }

  const { secondsLeft } = useSessionClock({
    totalSeconds: (challenge?.timeLimitMs ?? 30_000) / 1000,
    running: phase === 'playing',
    paused,
    resetKey: runId,
    onComplete: () => finishMission('timeout'),
  });

  // Last-10-seconds pressure cue
  const lastTickedSecondRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    if (secondsLeft === lastTickedSecondRef.current) return;
    lastTickedSecondRef.current = secondsLeft;

    if (secondsLeft === 10 && hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (secondsLeft <= 10 && secondsLeft >= 1) {
      if (secondsLeft <= 3) {
        if (soundEnabled) playCountdownPulse(secondsLeft as 3 | 2 | 1);
        if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (soundEnabled) {
        playSoftTick();
      }
    }
  }, [secondsLeft, phase, paused, hapticsEnabled, soundEnabled, playCountdownPulse, playSoftTick]);

  // ─── Actions ────────────────────────────────────────────────────────────

  function handleStart() {
    startCtaGlow.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 260 }));
    if (soundEnabled) playLaunchWhoosh();
    startedAtRef.current = Date.now();
    setPhase('playing');
  }

  function handleTap(value: number) {
    if (phase !== 'playing' || paused || !challenge || completionGuardRef.current) return;
    if (lockedValuesRef.current.has(value)) return;

    const currentTargetIndex = targetIndexRef.current;
    const target = challenge.targetSequence[currentTargetIndex];
    if (value === target) {
      const nextIndex = currentTargetIndex + 1;
      const isFinalTarget = nextIndex >= challenge.targetSequence.length;
      const next = new Set(lockedValuesRef.current);
      next.add(value);
      lockedValuesRef.current = next;
      setLockedValues(next);
      if (!isFinalTarget) {
        if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (soundEnabled) playHit();
      }

      const newStreak = streakRef.current + 1;
      streakRef.current = newStreak;
      const milestone = newStreak === 3 || newStreak === 5;
      correctTokenRef.current += 1;
      setJustLocked({ value, token: correctTokenRef.current, strong: milestone });

      const milestoneText = getCleanStreakMessage(newStreak);
      if (shouldShowPositiveMessage(newStreak)) {
        const text = milestoneText ?? pickPositiveMessage(lastWordRef.current);
        if (!milestoneText) lastWordRef.current = text;
        microIdRef.current += 1;
        setMicroMessage({ text, id: microIdRef.current, strong: milestone, tone: 'success' });
      }

      targetIndexRef.current = nextIndex;
      setTargetIndex(nextIndex);
      if (isFinalTarget) finishMission('completed');
    } else {
      streakRef.current = 0;
      setWrongTokens(prev => {
        const next = new Map(prev);
        next.set(value, (next.get(value) ?? 0) + 1);
        return next;
      });

      const nextMistakes = errorsRef.current + 1;
      errorsRef.current = nextMistakes;
      setErrors(nextMistakes);
      if (nextMistakes >= challenge.maximumErrors) {
        finishMission('failed');
      } else {
        if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        if (soundEnabled) playWrong();
        microIdRef.current += 1;
        setMicroMessage({
          text: `${challenge.maximumErrors - nextMistakes} chance${challenge.maximumErrors - nextMistakes === 1 ? '' : 's'} left`,
          id: microIdRef.current,
          strong: false,
          tone: 'warning',
        });
      }
    }
  }

  function handleTogglePause() {
    if (phase !== 'playing') return;
    setPaused(p => !p);
  }

  function resetRunState() {
    stopTransientSounds();
    completionGuardRef.current = false;
    startedAtRef.current = null;
    streakRef.current = 0;
    lastWordRef.current = null;
    targetIndexRef.current = 0;
    errorsRef.current = 0;
    const emptyLockedValues = new Set<number>();
    lockedValuesRef.current = emptyLockedValues;
    setLockedValues(emptyLockedValues);
    setTargetIndex(0);
    setErrors(0);
    setPaused(false);
    setWrongTokens(new Map());
    setOutcome(null);
    setJustLocked(null);
    setMicroMessage(null);
    setCelebrationToken(0);
    setResultPresentation(null);
    saveStartedRef.current = false;
    celebrationDoneRef.current = false;
    resultReadyRef.current = false;
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }
    setRunId(id => id + 1);
  }

  async function handleNextChallenge() {
    resetRunState();
    setPhase('loading');
    try {
      const state = await loadSchulteState(uid);
      setPersistedState(state);
      await resolveMission(state);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SchulteNexus] handleNextChallenge failed:', err);
      setPhase('error');
    }
  }

  function handleRetry() {
    resetRunState();
    if (challenge) {
      setPhase('ready');
    } else {
      void handleRetryError();
    }
  }

  async function handleRetryError() {
    setPhase('loading');
    try {
      const state = await loadSchulteState(uid);
      setPersistedState(state);
      await resolveMission(state);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SchulteNexus] handleRetryError failed:', err);
      setPhase('error');
    }
  }

  // ─── Save result after completion ───────────────────────────────────────

  useEffect(() => {
    if (!outcome || !challenge || !persistedState || saveStartedRef.current) return;
    saveStartedRef.current = true;

    const durationMs = outcome.durationMs;
    const completionTimeMs = durationMs;
    const remainingTimeMs = Math.max(0, challenge.timeLimitMs - durationMs);

    const attemptInput: Omit<SchulteMissionAttempt, 'wasPersonalBest'> = {
      challengeId: challenge.id,
      challengeSignature: challenge.signature,
      generatorVersion: challenge.version,
      seed: challenge.seed,
      family: challenge.family,
      rows: challenge.boardSize,
      columns: challenge.columns ?? challenge.boardSize,
      targetCount: challenge.targetSequence.length,
      activeValueCount: challenge.activeValues.length,
      targetSequence: challenge.targetSequence,
      timeLimitMs: challenge.timeLimitMs,
      completionTimeMs,
      remainingTimeMs,
      mistakes: errors,
      allowedMistakes: challenge.maximumErrors,
      correctTaps: targetIndex,
      totalRequiredTaps: challenge.targetSequence.length,
      accuracy: challenge.targetSequence.length > 0 ? targetIndex / challenge.targetSequence.length : 0,
      result: outcome.status === 'completed' ? 'completed' : outcome.status === 'timeout' ? 'timedOut' : 'failedMistakes',
      difficulty: {
        searchSpeed: 0,
        targetCount: 0,
        gridComplexity: 0,
        sequenceComplexity: 0,
        ruleSwitching: 0,
        visualComplexity: 0,
        timePressure: 0,
      },
      startedAt: startedAtRef.current ?? Date.now(),
      completedAt: Date.now(),
    };

    void (async () => {
      try {
        const { state: newState, attempt } = await recordPersistedLevelAttempt(uid, attemptInput);
        const presentation = createResultPresentation({
          previousLevel: persistedState.levelState.currentLevel,
          newLevel: newState.levelState.currentLevel,
          previousProgress: persistedState.levelState.levelProgress,
          newProgress: newState.levelState.levelProgress,
          wasPersonalBest: attempt.wasPersonalBest,
        });
        setPersistedState(newState);
        setResultPresentation(presentation);
      } catch {
        // Best-effort — don't crash the UI
        setResultPresentation(createResultPresentation({
          previousLevel: persistedState.levelState.currentLevel,
          newLevel: persistedState.levelState.currentLevel,
          previousProgress: persistedState.levelState.levelProgress,
          newProgress: persistedState.levelState.levelProgress,
          wasPersonalBest: false,
        }));
      } finally {
        resultReadyRef.current = true;
        if (outcome.status !== 'completed' || celebrationDoneRef.current) setPhase('complete');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save once on completion
  }, [outcome]);

  useEffect(() => () => {
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    stopTransientSounds();
  }, [stopTransientSounds]);

  const startCtaGlowStyle = useAnimatedStyle(() => ({ opacity: startCtaGlow.value }));

  const currentLevel = persistedState?.levelState.currentLevel ?? 1;
  const currentLevelProgress = persistedState?.levelState.levelProgress ?? 0;

  return (
    <ScreenShell
      scroll={phase === 'complete'}
      safeBottom
      pillar="eye"
      ambient={<AmbientBackground subtle />}
    >
      <ScreenTransition>
        <ScreenHeader
          title="Schulte Nexus"
          subtitle="Adaptive Sequence Missions"
          showBack
          compact
          rightAction={
            phase === 'playing' ? (
              <TouchableOpacity
                style={styles.headerPauseBtn}
                onPress={handleTogglePause}
                activeOpacity={0.75}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={paused ? 'Resume challenge' : 'Pause challenge'}
              >
                {paused ? (
                  <Play size={16} color={EYE_COLOR} strokeWidth={2.4} />
                ) : (
                  <Pause size={16} color={EYE_COLOR} strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            ) : undefined
          }
        />

        {/* Loading state — minimal, non-blocking */}
        {phase === 'loading' && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={EYE_COLOR} />
          </View>
        )}

        {/* Premium required */}
        {phase === 'premium' && (
          <PremiumRequiredCard level={currentLevel} onBack={() => router.back()} />
        )}

        {/* Error state */}
        {phase === 'error' && (
          <ErrorState onRetry={handleRetryError} onBack={() => router.back()} />
        )}

        {/* Active gameplay */}
        {phase !== 'complete' && phase !== 'loading' && phase !== 'premium' && phase !== 'error' && challenge && (
          <View>
            {phase === 'ready' ? (
              <MissionBriefingCard
                challenge={challenge}
                level={currentLevel}
                levelProgress={currentLevelProgress}
              />
            ) : (
              <CompactMissionReminder challenge={challenge} level={currentLevel} />
            )}

            {phase === 'playing' && (
              <View style={styles.hudWrap}>
                <MissionHud
                  nextTarget={challenge.targetSequence[targetIndex] ?? null}
                  remainingMs={secondsLeft * 1000}
                  errors={errors}
                  maxErrors={challenge.maximumErrors}
                  reducedMotion={reducedMotion}
                />
                {microMessage && (
                  <MicroMessage
                    key={microMessage.id}
                    text={microMessage.text}
                    strong={microMessage.strong}
                    tone={microMessage.tone}
                    reducedMotion={reducedMotion}
                    onDone={() => setMicroMessage(null)}
                  />
                )}
              </View>
            )}

            <View style={styles.boardOuter}>
              <View style={phase === 'ready' ? styles.boardDimmed : undefined}>
                <MissionBoard
                  challenge={challenge}
                  lockedValues={lockedValues}
                  wrongTokens={wrongTokens}
                  justLockedValue={justLocked?.value ?? null}
                  justLockedToken={justLocked?.token ?? 0}
                  justLockedStrong={justLocked?.strong ?? false}
                  reducedMotion={reducedMotion}
                  disabled={phase !== 'playing' || paused}
                  onTap={handleTap}
                  celebrationToken={phase === 'celebrating' ? celebrationToken : 0}
                />
              </View>
              <BoardLockOverlay
                active={phase === 'ready'}
                challenge={challenge}
                reducedMotion={reducedMotion}
              />
              {paused && phase === 'playing' && (
                <View style={styles.pauseOverlay} pointerEvents="box-none">
                  <GlassCard tint={SURFACE_TINT.card} style={styles.pauseCard}>
                    <Text style={styles.pauseTitle}>Paused</Text>
                    <Text style={styles.pauseSubtitle}>The timer is frozen. Resume when ready.</Text>
                    <GradientCTA
                      label="Resume"
                      icon={<Play size={16} color="#FFFFFF" strokeWidth={2.4} />}
                      onPress={handleTogglePause}
                    />
                  </GlassCard>
                </View>
              )}
              {phase === 'celebrating' && (
                <SuccessTransition reducedMotion={reducedMotion} />
              )}
            </View>

            {phase === 'ready' && (
              <View style={styles.startCtaWrap}>
                <Animated.View pointerEvents="none" style={[styles.startCtaGlow, startCtaGlowStyle]} />
                <GradientCTA
                  label="Start Challenge"
                  onPress={handleStart}
                  height={54}
                  hapticFeedback={hapticsEnabled ? Haptics.ImpactFeedbackStyle.Light : undefined}
                  style={styles.startCta}
                />
              </View>
            )}
          </View>
        )}

        {/* Completion */}
        {phase === 'complete' && outcome && challenge && (
          <Completion
            status={outcome.status}
            durationMs={outcome.durationMs}
            correctTaps={targetIndex}
            totalTargets={challenge.targetSequence.length}
            errors={errors}
            maxErrors={challenge.maximumErrors}
            level={currentLevel}
            resultPresentation={resultPresentation}
            reducedMotion={reducedMotion}
            soundEnabled={soundEnabled}
            hapticsEnabled={hapticsEnabled}
            playSchulteLevelUp={playSchulteLevelUp}
            playPersonalBest={playPersonalBest}
            onNextChallenge={handleNextChallenge}
            onRetry={handleRetry}
            onBack={() => router.back()}
          />
        )}
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerPauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,224,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,255,0.22)',
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  // Compact in-game mission reminder
  reminderOuter: {
    marginBottom: 10,
  },
  reminderInner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  reminderText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.75)',
    textAlign: 'center',
  },

  // Pre-start mission card
  missionCardOuter: {
    marginBottom: 10,
  },
  missionCardInner: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  missionCardLevel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: 'rgba(245,247,251,0.45)',
    textAlign: 'center',
    marginBottom: 4,
  },
  missionCardEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: EYE_COLOR,
    textAlign: 'center',
    marginBottom: 8,
  },
  missionCardSequence: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    fontWeight: '800',
    color: '#f6f8fc',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 0.3,
  },
  missionCardDirection: {
    marginTop: 3,
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.75)',
    textAlign: 'center',
  },
  missionCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  missionCardMeta: {
    flexShrink: 1,
    maxWidth: '68%',
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.5)',
  },
  missionCardMistakes: {
    flexShrink: 1,
    maxWidth: '32%',
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.5)',
    textAlign: 'right',
  },
  // Level progress mini bar in mission card
  levelProgressMini: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: EYE_COLOR,
  },
  levelProgressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.45)',
    fontVariant: ['tabular-nums'],
  },

  // Board wrap
  boardOuter: {
    position: 'relative',
  },
  successTransition: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(5,10,22,0.76)',
  },
  successTransitionContent: {
    alignItems: 'center',
  },
  successTrophyGlow: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,224,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
  },
  successTransitionTitle: {
    marginTop: 14,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#FFFFFF',
  },
  successTransitionSubtitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(184,246,255,0.72)',
  },
  boardDimmed: {
    opacity: 0.85,
  },
  boardLockOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardLockScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6,12,20,0.42)',
  },
  boardLockCenter: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(6,14,24,0.55)',
  },
  boardLockIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,224,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,255,0.35)',
    marginBottom: 10,
  },
  boardLockTitle: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    fontWeight: '700',
    color: '#f6f8fc',
    textAlign: 'center',
  },
  boardLockSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.75)',
    textAlign: 'center',
  },
  boardLockMeta: {
    marginTop: 8,
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.6)',
    textAlign: 'center',
  },

  // Start button
  startCtaWrap: {
    position: 'relative',
    marginTop: 12,
  },
  startCtaGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: BUTTON.radius,
    backgroundColor: 'rgba(0,224,255,0.4)',
  },
  startCta: {
    width: '100%',
  },

  // HUD
  hudWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  hudCardOuter: {
    marginBottom: 0,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  hudItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hudItemLeft: {
    justifyContent: 'flex-start',
  },
  hudItemCenter: {
    justifyContent: 'center',
  },
  hudItemRight: {
    justifyContent: 'flex-end',
  },
  hudLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: 'rgba(245,247,251,0.5)',
  },
  hudValue: {
    fontFamily: FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#f6f8fc',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  hudTargetSlot: {
    width: 24,
    alignItems: 'center',
  },
  hudTimeSlot: {
    width: 42,
    alignItems: 'center',
  },
  hudValueTarget: {
    color: EYE_COLOR,
  },
  hudValueError: {
    color: STATUS_COLORS.error,
  },
  hudValueWarning: {
    color: STATUS_COLORS.warning,
  },

  // Micro feedback text
  microMessageWrap: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    alignItems: 'center',
  },
  microMessageText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: EYE_COLOR,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  microMessageTextStrong: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,224,255,0.28)',
    borderColor: 'rgba(0,224,255,0.5)',
  },
  microMessageTextWarning: {
    color: STATUS_COLORS.warning,
    backgroundColor: 'rgba(255,200,61,0.12)',
    borderColor: 'rgba(255,200,61,0.3)',
  },

  // Board
  boardCard: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellGlowRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,224,255,0.4)',
  },
  cellHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cellFlashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: STATUS_COLORS.error,
    opacity: 0,
  },
  cellSuccessOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: EYE_COLOR,
    opacity: 0,
  },
  cellSpark: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 3,
    height: 3,
    marginLeft: -1.5,
    marginTop: -1.5,
    borderRadius: 2,
    backgroundColor: GLOW_BRIGHT,
  },
  cellText: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: '700',
    color: '#f6f8fc',
  },
  cellLockIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },

  // Pause overlay
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(6,10,15,0.55)',
  },
  pauseCard: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  pauseTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#f6f8fc',
  },
  pauseSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    color: 'rgba(245,247,251,0.6)',
    marginBottom: 4,
  },

  // Completion
  completeCard: {
    gap: 6,
  },
  completeBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,255,0.3)',
    marginBottom: 6,
  },
  completeBadgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  completeBadgeFailed: {
    backgroundColor: 'rgba(255,95,114,0.12)',
    borderColor: 'rgba(255,95,114,0.32)',
  },
  completeBadgePremium: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: 'rgba(255,215,0,0.3)',
  },
  completeTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#f6f8fc',
  },
  completeLevel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: EYE_COLOR,
    marginTop: 2,
  },
  completeSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    color: 'rgba(245,247,251,0.6)',
    marginBottom: 8,
  },
  completeStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  completeStat: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.chip,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  completeStatValue: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    fontWeight: '700',
    color: '#f6f8fc',
  },
  completeStatLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: 'rgba(245,247,251,0.5)',
  },
  completeCtaGap: {
    marginBottom: 10,
    width: '100%',
  },

  // Personal best badge
  personalBestBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  personalBestText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#FFD700',
  },
  personalBestTime: {
    marginTop: 2,
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },

  // Level progress section
  levelProgressSection: {
    width: '100%',
    marginBottom: 16,
  },
  levelProgressTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(245,247,251,0.5)',
    textAlign: 'center',
    marginBottom: 8,
  },
  levelProgressValue: {
    width: '100%',
    height: 20,
    padding: 0,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.5)',
    textAlign: 'center',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  progressGain: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: EYE_COLOR,
  },
  progressGlow: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: GLOW_BRIGHT,
  },
  progressRemaining: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: 'rgba(245,247,251,0.55)',
  },

  // Level up badge
  levelUpBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,224,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  levelUpText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: EYE_COLOR,
    textAlign: 'center',
  },
  levelUpTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  levelUpParticle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 4,
    height: 4,
    marginLeft: -2,
    marginTop: -2,
    borderRadius: 2,
  },
});
