import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pause, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SessionCompleteOverlay } from '@/components/eye/SessionCompleteOverlay';
import { markGamePlayedToday } from '@/services/dailyEyeGoalsPersistence';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FocusSprint, type FocusSwitchDifficulty } from '@/components/eye/games/FocusSprint';
import { GameOverScreen, type GameEndStats } from '@/components/eye/games/GameOverScreen';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { FOCUS_SWITCH_DEFAULT_RACE_CPU, getEyeActivity } from '@/constants/eyeRelax';
import { useAuth } from '@/context/AuthContext';
import { useGameRecord } from '@/hooks/useGameRecord';
import { useSessionKeepAwake } from '@/hooks/useSessionKeepAwake';
import { type GameId } from '@/services/gameRecords';
import {
  awardEyeGameXp,
  type EyeGameReward,
} from '@/services/eyeGameProgress';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useProgressStore } from '@/stores/useProgressStore';

function GameView({
  id, running, onGameEnd, onFocusSession,
  focusDifficulty, onFocusDifficultyChange, onFocusActiveChange, raceCpu, onRaceCpuChange,
  pauseRequest, onRoundActiveChange,
}: {
  id: string;
  running: boolean;
  onGameEnd: (stats: GameEndStats) => void;
  onFocusSession?: (score: number) => void;
  focusDifficulty?: FocusSwitchDifficulty;
  onFocusDifficultyChange?: (difficulty: FocusSwitchDifficulty) => void;
  onFocusActiveChange?: (active: boolean) => void;
  raceCpu?: boolean;
  onRaceCpuChange?: (raceCpu: boolean) => void;
  pauseRequest?: number;
  onRoundActiveChange?: (active: boolean) => void;
}) {
  switch (id) {
    case 'focus-sprint':
      return (
        <FocusSprint
          running={running}
          onSession={onFocusSession}
          onGameEnd={onGameEnd}
          initialDifficulty={focusDifficulty}
          onDifficultyChange={onFocusDifficultyChange}
          onActiveChange={onFocusActiveChange}
          initialRaceCpu={raceCpu}
          onRaceCpuChange={onRaceCpuChange}
          pauseRequest={pauseRequest}
          onRoundActiveChange={onRoundActiveChange}
        />
      );
    default:
      return <Text style={styles.missing}>Game not found</Text>;
  }
}

/** Mounted only once the record is actually earned, so it animates in on mount. */
function RecordBadge({ label }: { label: string }) {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withSequence(withSpring(1.15, { damping: 10 }), withSpring(1));
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.badge, style]} pointerEvents="none">
      <Text style={styles.badgeText}>🏆 {label}</Text>
    </Animated.View>
  );
}

export default function EyeGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const logEyeGame = useProgressStore(state => state.logEyeGame);
  const activity = id ? getEyeActivity(id) : undefined;
  const [running, setRunning]         = useState(true);
  const [gameEndStats, setGameEndStats] = useState<GameEndStats | null>(null);
  // Header pause button — a monotonic request counter. Each press nudges it
  // so FocusSprint can pause the live round.
  const [pauseRequest, setPauseRequest] = useState(0);
  // While a round is live the header swaps to compact gameplay chrome
  // (no subtitle / PB) and hosts the pause button.
  const [roundActive, setRoundActive] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [progressReward, setProgressReward] = useState<EyeGameReward | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  // Held above the `replayKey` remount boundary so replaying keeps the mode
  // the player just chose instead of silently resetting to Casual.
  const [focusDifficulty, setFocusDifficulty] = useState<FocusSwitchDifficulty>('easy');
  // Same remount-preservation reason. Defaults to on, matching the
  // pre-toggle behavior where every round raced the CPU unconditionally —
  // the toggle lets a player opt into a calm solo session instead.
  const [raceCpu, setRaceCpu] = useState(FOCUS_SWITCH_DEFAULT_RACE_CPU);
  // Self-managed games report when the player's finger is actually down on
  // a moving target so the page can stop scrolling for just that instant,
  // not for the whole round.
  const [sessionInProgress, setSessionInProgress] = useState(false);

  // Every shipping game persists under its own id today, but only
  // `focus-sprint` remains — a stale deep link to a removed game (`neon-cipher`,
  // `signal-ops`) fails the `activity` lookup below and renders "Activity not
  // found" before this id is ever used for persistence.
  const gameId = (activity?.id ?? 'focus-sprint') as GameId;
  const { record, isNewRecord, submit } = useGameRecord(user?.uid, gameId);

  const isDone = gameEndStats !== null;
  useSessionKeepAwake(running && !isDone, 'mindpulse-eye-arcade');

  if (!activity) {
    return (
      <ScreenShell scroll={false} safeBottom pillar="eye" ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="Eye Game" showBack />
        <Text style={styles.missing}>Activity not found</Text>
      </ScreenShell>
    );
  }

  function handleReplay() {
    setGameEndStats(null);
    setRunning(true);
    setReplayKey(value => value + 1);
    setProgressReward(null);
  }

  return (
    <ScreenShell
      // Freeze the page while a round is live so a drag near the moving target
      // can't scroll the arena out from under the player's finger.
      scrollEnabled={!sessionInProgress}
      safeBottom
      pillar="eye"
      ambient={<AmbientBackground subtle />}
      // Docked outside the ScrollView (see `header`'s doc comment on
      // ScreenShell for why: a sticky child *inside* the ScrollView is
      // clipped to that inner padded content box, so it can never actually
      // bleed to the true screen edges — that clipping showed up as the
      // app's own background gradient peeking in on both sides of the
      // header). Body content always starts below it and nothing can ever
      // scroll underneath or overlap it.
      header={
        <View style={styles.headerDock}>
          <View style={styles.headerInner}>
            <ScreenHeader
              title={activity.title}
              // No subtitle during a live round — the header drops to compact
              // gameplay chrome (back + title + pause) so the canvas owns the
              // screen. Subtitle + PB return for the idle/pre-game state.
              subtitle={roundActive ? undefined : activity.subtitle}
              showBack
              compact
              // 2 lines while idle — 1 line was clipping the full subtitle
              // ("Switch focus between near and far targets") on most widths.
              // Irrelevant during a round since subtitle is undefined there.
              subtitleLines={2}
              rightAction={
                roundActive ? (
                  <TouchableOpacity
                    style={styles.headerPauseBtn}
                    onPress={() => setPauseRequest(n => n + 1)}
                    activeOpacity={0.7}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel="Pause game"
                  >
                    <Pause size={18} color="#9EE7FF" strokeWidth={2.4} />
                  </TouchableOpacity>
                ) : record !== null ? (
                  <View
                    style={styles.pbChip}
                    accessible
                    accessibilityLabel={`Personal best ${record.value.toLocaleString()} points`}
                  >
                    <Trophy size={13} color="#FFD700" strokeWidth={2.2} fill="#FFD700" />
                    <Text style={styles.pbLabel}>PB</Text>
                    <Text style={styles.pbVal}>{record.value.toLocaleString()}</Text>
                  </View>
                ) : undefined
              }
            />
          </View>
        </View>
      }
    >
      {/* Rendered only when earned: a `scale(0)` transform does not collapse
          layout, so an always-mounted badge reserved ~44dp of permanently
          invisible space above every eye game. `isNewRecord` flips at session
          end while GameOverScreen covers the screen, so neither the layout
          shift nor the missing exit animation is observable. */}
      {isNewRecord && <RecordBadge label="New Personal Best!" />}

      <View style={styles.gameAreaScroll}>
        <GameView
          key={`${activity.id}-${replayKey}`}
          id={activity.id}
          running={running && !isDone}
          onGameEnd={stats => {
            setRunning(false);
            void markGamePlayedToday(user?.uid ?? undefined);
            void awardEyeGameXp(user?.uid, gameId, stats.rating).then(
              setProgressReward,
            );
            logEyeGame();
            // Self-managed: has its own completion UI — go directly to results.
            setGameEndStats(stats);
          }}
          onFocusSession={score => submit(score)}
          focusDifficulty={focusDifficulty}
          onFocusDifficultyChange={setFocusDifficulty}
          onFocusActiveChange={setSessionInProgress}
          raceCpu={raceCpu}
          onRaceCpuChange={setRaceCpu}
          pauseRequest={pauseRequest}
          onRoundActiveChange={setRoundActive}
        />
      </View>

      <SessionCompleteOverlay visible={showComplete} onDone={() => setShowComplete(false)} />

      {/* Game over overlay */}
      {gameEndStats && (
        <GameOverScreen
          stats={gameEndStats}
          title={`${activity.title.toUpperCase()} COMPLETE`}
          isNewRecord={isNewRecord}
          progressReward={
            progressReward
              ? {
                  xpAwarded: progressReward.xpAwarded,
                  level: progressReward.after.level,
                  leveledUp: progressReward.leveledUp,
                  progress: progressReward.after.progress,
                }
              : null
          }
          personalBest={record?.value}
          recommendedNext={{
            label: 'Eye Reset · Guided relaxation',
            onPress: () => router.push(ROUTES.appCvsProtocol as never),
          }}
          onReplay={handleReplay}
          onDismiss={() => {
            setRunning(false);
            router.back();
          }}
        />
      )}

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  // No horizontal padding here on purpose — this sits outside ScreenShell's
  // padded ScrollView (as a sibling, via the `header` slot), so it's
  // already the true full device width. `headerInner` below re-applies the
  // same horizontal inset the scroll content uses, so the title/back
  // button/PB chip still line up with body content beneath it.
  headerDock: {
    paddingBottom: spacing.xs,
  },
  headerInner: {
    paddingHorizontal: spacing.lg,
  },
  pbChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  pbLabel: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,215,0,0.75)', letterSpacing: 0.4 },
  pbVal:   { fontSize: 12, fontWeight: '800', color: '#FFD700' },
  headerPauseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,224,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1.5, borderColor: '#FFD700', borderRadius: 100,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  badgeText: { fontSize: 14, fontWeight: '800', color: '#FFD700' },
  // No trailing padding — the game manages its own bottom spacing, and this
  // was pushing the layout taller than the viewport for no visual benefit.
  gameAreaScroll: { alignItems: 'center', width: '100%' },
  missing: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});
