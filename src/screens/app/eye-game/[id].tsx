import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SessionCompleteOverlay } from '@/components/eye/SessionCompleteOverlay';
import { markGamePlayedToday } from '@/services/dailyEyeGoalsPersistence';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CometTrace } from '@/components/eye/games/CometTrace';
import { EyeResetOverlay } from '@/components/eye/games/EyeResetOverlay';
import { FocusSprint } from '@/components/eye/games/FocusSprint';
import { GameOverScreen, type GameEndStats } from '@/components/eye/games/GameOverScreen';
import { SaccadeSniper } from '@/components/eye/games/SaccadeSniper';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { getEyeActivity } from '@/constants/eyeRelax';
import { useAuth } from '@/context/AuthContext';
import { useGameRecord } from '@/hooks/useGameRecord';
import { type GameId } from '@/services/gameRecords';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

function GameView({
  id, running, onGameEnd, onSaccadeScore, onFocusSession,
}: {
  id: string;
  running: boolean;
  onGameEnd: (stats: GameEndStats) => void;
  onSaccadeScore?: (score: number, bestMs: number) => void;
  onFocusSession?: (score: number) => void;
}) {
  switch (id) {
    case 'saccade-sniper':
      return <SaccadeSniper running={running} onScore={onSaccadeScore} onGameEnd={onGameEnd} />;
    case 'focus-sprint':
      return <FocusSprint running={running} onSession={onFocusSession} onGameEnd={onGameEnd} />;
    case 'comet-trace':
      return <CometTrace running={running} onGameEnd={onGameEnd} />;
    default:
      return <Text style={styles.missing}>Game not found</Text>;
  }
}

function RecordBadge({ visible, label }: { visible: boolean; label: string }) {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value   = withSequence(withSpring(1.15, { damping: 10 }), withSpring(1));
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value   = withTiming(0, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>🏆 {label}</Text>
    </Animated.View>
  );
}

export default function EyeGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const activity = id ? getEyeActivity(id) : undefined;
  const [secondsLeft, setSecondsLeft] = useState(activity?.durationSeconds ?? 60);
  const [running, setRunning]         = useState(true);
  const [gameEndStats, setGameEndStats] = useState<GameEndStats | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [eyeResetActive, setEyeResetActive] = useState(false);

  const gameId = (id ?? 'saccade-sniper') as GameId;
  const { record, isNewRecord, submit } = useGameRecord(user?.uid, gameId);

  const bestMsRef = useRef<number | null>(null);

  // Games that own their session (start button, internal timer, internal end) —
  // parent skips its countdown + pause UI for these.
  const isSelfManaged =
    activity?.id === 'saccade-sniper' ||
    activity?.id === 'focus-sprint' ||
    activity?.id === 'comet-trace';

  // Comet Trace is an exercise — no score/PB/game-over screen, just the
  // 20-second look-away reset on completion.
  const isExercise = activity?.id === 'comet-trace';

  // Parent countdown for timer-managed games (Blink, Radar, Focus)
  useEffect(() => {
    if (isSelfManaged) return;
    if (!running || secondsLeft <= 0 || gameEndStats) return;
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft, gameEndStats, isSelfManaged]);

  if (!activity) {
    return (
      <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="Eye Game" showBack />
        <Text style={styles.missing}>Activity not found</Text>
      </ScreenShell>
    );
  }

  const isDone = gameEndStats !== null;

  useEffect(() => {
    if (!isDone) return;
    if (gameId === 'saccade-sniper' && bestMsRef.current !== null) {
      submit(bestMsRef.current);
    }
  }, [isDone]);

  const formatRecord = (): string => {
    if (!record) return '—';
    if (gameId === 'saccade-sniper') return `${record.value}ms`;
    return `${record.value}%`;
  };

  function handleReplay() {
    setGameEndStats(null);
    setSecondsLeft(activity!.durationSeconds);
    setRunning(true);
    bestMsRef.current = null;
  }

  return (
    <ScreenShell scroll={isSelfManaged} safeBottom ambient={<AmbientBackground subtle />}>
      <ScreenHeader title={activity.title} subtitle={activity.subtitle} showBack />

      {/* Timer + personal best row — hidden for self-managed games */}
      {!isSelfManaged && (
        <View style={styles.topRow}>
          <View style={styles.timerRow}>
            <Text style={[styles.timer, isDone && styles.timerDone]}>
              {isDone ? 'Done!' : `${secondsLeft}s`}
            </Text>
            <Text style={styles.timerLabel}>
              {isDone ? 'session complete' : running ? 'playing' : 'paused'}
            </Text>
          </View>
          {record !== null && (
            <View style={styles.pbChip}>
              <Text style={styles.pbLabel}>PB</Text>
              <Text style={styles.pbVal}>{formatRecord()}</Text>
            </View>
          )}
        </View>
      )}

      {/* PB chip only for self-managed games (not exercises) */}
      {isSelfManaged && !isExercise && record !== null && (
        <View style={[styles.topRow, { justifyContent: 'flex-end' }]}>
          <View style={styles.pbChip}>
            <Text style={styles.pbLabel}>PB</Text>
            <Text style={styles.pbVal}>{formatRecord()}</Text>
          </View>
        </View>
      )}

      {!isExercise && <RecordBadge visible={isNewRecord} label="New Personal Best!" />}

      {(() => {
        const gameView = (
          <View style={isSelfManaged ? styles.gameAreaScroll : styles.gameArea}>
            <GameView
              id={activity.id}
              running={running && !isDone}
              onGameEnd={stats => {
                setRunning(false);
                void markGamePlayedToday(user?.uid ?? undefined);
                if (isExercise) {
                  // Comet Trace exits straight into the 20-second look-away —
                  // no score / no game-over screen.
                  setEyeResetActive(true);
                  return;
                }
                if (isSelfManaged) {
                  // Self-managed games have their own completion UI — go directly to results
                  setGameEndStats(stats);
                } else {
                  setShowComplete(true);
                  setTimeout(() => {
                    setShowComplete(false);
                    setGameEndStats(stats);
                  }, 1800);
                }
              }}
              onSaccadeScore={(_, bMs) => { bestMsRef.current = bMs; }}
              onFocusSession={score => submit(score)}
            />
          </View>
        );

        return activity.featureId ? (
          <PaywallGate featureId={activity.featureId}>{gameView}</PaywallGate>
        ) : (
          gameView
        );
      })()}

      {/* Pause/Resume only for timer-managed games */}
      {!isSelfManaged && !gameEndStats && (
        <PrimaryButton
          label={running ? 'Pause' : 'Resume'}
          onPress={() => setRunning(r => !r)}
        />
      )}

      <SessionCompleteOverlay visible={showComplete} onDone={() => setShowComplete(false)} />

      {/* Game over overlay */}
      {gameEndStats && (
        <GameOverScreen
          stats={gameEndStats}
          onReplay={handleReplay}
          onDismiss={() => {
            setGameEndStats(null);
            setRunning(false);
          }}
        />
      )}

      {/* Far-focus look-away reset (Comet Trace only) */}
      {eyeResetActive && (
        <EyeResetOverlay
          onComplete={() => setEyeResetActive(false)}
          onSkip={()     => setEyeResetActive(false)}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  timerRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  timer:      { ...typography.headingLarge, color: colors.accent.purple },
  timerDone:  { color: '#4CAF50' },
  timerLabel: { ...typography.caption, color: colors.text.secondary },
  pbChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  pbLabel: { fontSize: 9, fontWeight: '800', color: '#FFD700', letterSpacing: 1 },
  pbVal:   { fontSize: 12, fontWeight: '700', color: '#FFD700' },
  badge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1.5, borderColor: '#FFD700', borderRadius: 100,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  badgeText: { fontSize: 14, fontWeight: '800', color: '#FFD700' },
  gameArea:       { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  gameAreaScroll: { alignItems: 'center', width: '100%', paddingBottom: spacing.xl },
  missing: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});
