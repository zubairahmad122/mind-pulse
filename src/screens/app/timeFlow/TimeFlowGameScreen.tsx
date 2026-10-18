import * as Haptics from "expo-haptics";
import { Play } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { TimeFlowField } from "@/components/games/timeFlow/TimeFlowField";
import {
  PatternHud,
  RuleBanner,
} from "@/components/games/patternShift/GamePresentation";
import {
  RoundTransitionOverlay,
  TimeFlowSessionProgress,
} from "@/components/games/timeFlow/RoundTransitionOverlay";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { colors } from "@/constants/colors";
import { FONTS, PILLAR_COLORS, SURFACE_TINT } from "@/constants/designSystem";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import {
  assessRoundInput,
  buildSessionRecord,
  createRound,
  evaluateAnswer,
  planSessionDifficulty,
  restartRoundAfterPause,
  roundTransitionTiming,
  scoreRound,
  TIME_FLOW_ROUNDS,
  type TimeFlowProgress,
  type TimeFlowRound,
  type TimeFlowRoundResult,
} from "@/engine/core/games/timeFlow";
import { useGameFeedbackPrefs } from "@/hooks/useGameFeedbackPrefs";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSessionLifecycle } from "@/hooks/useSessionLifecycle";
import { recordMindGameActivity } from "@/services/mindGameActivity";
import {
  loadTimeFlowProgress,
  saveTimeFlowSession,
} from "@/services/timeFlowPersistence";
type Stage =
  | "loading"
  | "tutorial"
  | "countdown"
  | "ready"
  | "watching"
  | "recall"
  | "correctFeedback"
  | "incorrectFeedback"
  | "transition"
  | "paused"
  | "saving";
export default function TimeFlowGameScreen() {
  const router = useRouter(),
    { user } = useAuth(),
    { width, height } = useWindowDimensions(),
    prefs = useGameFeedbackPrefs(),
    reducedMotion = useReducedMotion(),
    { playHit, playWrong, playChallengeComplete } = useGameSounds({
      profile: 'timeFlow',
    });
  const [progress, setProgress] = useState<TimeFlowProgress | null>(null),
    [stage, setStage] = useState<Stage>("loading"),
    [round, setRound] = useState<TimeFlowRound | null>(null),
    [roundIndex, setRoundIndex] = useState(0),
    [tier, setTier] = useState(1),
    [eventIndex, setEventIndex] = useState(0),
    [stepLit, setStepLit] = useState(true),
    [sessionCountdown, setSessionCountdown] = useState(3),
    [timeLeft, setTimeLeft] = useState(0),
    [results, setResults] = useState<TimeFlowRoundResult[]>([]),
    [score, setScore] = useState(0),
    [streak, setStreak] = useState(0),
    [bestStreak, setBestStreak] = useState(0),
    [answer, setAnswer] = useState<string | string[] | boolean>(),
    [earned, setEarned] = useState(0),
    [feedbackIndex, setFeedbackIndex] = useState(0),
    [readyCue, setReadyCue] = useState({
      title: "NEXT FLOW",
      detail: "Get ready",
    });
  const [identity] = useState(() => {
      const now = Date.now();
      return {
        seed: now % 2147483647,
        started: new Date(now).toISOString(),
        id: `time-flow-${now}`,
      };
    }),
    seed = useRef(identity.seed),
    started = useRef(identity.started),
    sessionId = useRef(identity.id),
    answerStarted = useRef(0),
    lastTapAt = useRef(0),
    resolution = useRef(false),
    completed = useRef(false),
    practiceCompleted = useRef(false),
    previous = useRef<Stage>("watching"),
    sessionIntroducedModes = useRef(new Set<string>()),
    pendingNext = useRef<
      { results: TimeFlowRoundResult[]; best: number } | undefined
    >(undefined);
  useEffect(() => {
    void loadTimeFlowProgress(user?.uid).then((value) => {
      setProgress(value);
      sessionIntroducedModes.current = new Set(value.seenModeIntros);
      if (value.completedSessions) {
        const difficulty = planSessionDifficulty({
          index: 0,
          progress: value,
          results: [],
        });
        setTier(difficulty.tier);
        setRound(
          createRound({
            seed: seed.current,
            index: 0,
            tier: difficulty.tier,
            level: value.level,
            difficulty,
          }),
        );
        setSessionCountdown(3);
        setStage("countdown");
      } else setStage("tutorial");
    });
  }, [user?.uid]);
  const makeRound = useCallback(
    (
      index: number,
      player: TimeFlowProgress,
      priorResults: TimeFlowRoundResult[],
    ) => {
      resolution.current = false;
      lastTapAt.current = 0;
      setAnswer(undefined);
      setEventIndex(0);
      setStepLit(true);
      setEarned(0);
      setFeedbackIndex(0);
      const difficulty = planSessionDifficulty({
          index,
          progress: player,
          results: priorResults,
        }),
        nextRound = createRound({
          seed: seed.current + index * 137,
          index,
          tier: difficulty.tier,
          level: player.level,
          difficulty,
        });
      setTier(difficulty.tier);
      setRound((current) => {
        const newMode =
          nextRound.mechanic !== "sequence" &&
          !player.seenModeIntros.includes(nextRound.mechanic) &&
          !sessionIntroducedModes.current.has(nextRound.mechanic);
        if (newMode) {
          sessionIntroducedModes.current.add(nextRound.mechanic);
          setReadyCue({
            title:
              nextRound.mechanic === "reverse"
                ? "NEW MODE · REVERSE FLOW"
                : "NEW MODE · PATTERN FLASH",
            detail:
              nextRound.mechanic === "reverse"
                ? "Watch the sequence, then repeat it backwards"
                : "Remember the highlighted cells; order does not matter",
          });
        } else if (
          current &&
          difficulty.sequenceLength > current.difficulty.sequenceLength
        )
          setReadyCue({
            title: "FLOW EXTENDED",
            detail: `${current.difficulty.sequenceLength} → ${difficulty.sequenceLength} steps`,
          });
        else if (
          current &&
          nextRound.layout.cells.length > current.layout.cells.length
        )
          setReadyCue({
            title: "FIELD EXPANDED",
            detail: `${nextRound.layout.columns} × ${nextRound.layout.rows}`,
          });
        else
          setReadyCue({
            title: index === 11 ? "FINAL FLOW" : "NEXT FLOW",
            detail:
              index === 11
                ? "Your longest safe challenge"
                : `Pattern ${index + 1} of ${TIME_FLOW_ROUNDS}`,
          });
        return nextRound;
      });
      if (index === 0 && !practiceCompleted.current) {
        setSessionCountdown(3);
        setStage("countdown");
      } else setStage("ready");
    },
    [],
  );
  useEffect(() => {
    if (stage !== "ready") return;
    const timer = setTimeout(
      () => setStage("watching"),
      reducedMotion ? 180 : readyCue.title.startsWith("NEW MODE") ? 1250 : 340,
    );
    return () => clearTimeout(timer);
  }, [readyCue.title, reducedMotion, stage]);
  useEffect(() => {
    if (stage !== "countdown") return;
    const timer = setTimeout(() => {
      if (sessionCountdown > 1) setSessionCountdown((value) => value - 1);
      else setStage("watching");
    }, 1000);
    return () => clearTimeout(timer);
  }, [sessionCountdown, stage]);
  useEffect(() => {
    if (!round || stage !== "watching") return;
    const duration = reducedMotion
      ? Math.max(300, round.difficulty.eventMs * 0.7)
      : round.difficulty.eventMs;
    const fadeTimer = setTimeout(
      () => setStepLit(false),
      reducedMotion
        ? Math.max(220, duration - 80)
        : round.difficulty.activationMs,
    );
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (eventIndex < round.sequence.events.length - 1) {
        setStepLit(true);
        setEventIndex((i) => i + 1);
      } else
        transitionTimer = setTimeout(
          () => {
            answerStarted.current = Date.now();
            setTimeLeft(round.difficulty.answerMs / 1000);
            setStage("recall");
          },
          reducedMotion ? 80 : round.difficulty.recallDelayMs,
        );
    }, duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [eventIndex, reducedMotion, round, stage]);
  const finish = useCallback(
    async (finalResults: TimeFlowRoundResult[], finalBest: number) => {
      if (!progress || completed.current) return;
      completed.current = true;
      setStage("saving");
      const record = buildSessionRecord({
        id: sessionId.current,
        startedAt: started.current,
        completedAt: new Date().toISOString(),
        results: finalResults,
        bestStreak: finalBest,
        levelBefore: progress.level,
        xpBefore: progress.xp,
      });
      const { saved } = await saveTimeFlowSession(user?.uid, record);
      if (saved) {
        void recordMindGameActivity(user?.uid, 'time-flow', record.id, record.startedAt, record.completedAt, record.score, {
          accuracy: record.accuracy,
          levelAfter: record.levelAfter,
        });
      }
      if (prefs.soundEnabled) playChallengeComplete();
      router.replace({
        pathname: ROUTES.appTimeFlowResults,
        params: { id: record.id },
      } as never);
    },
    [playChallengeComplete, prefs.soundEnabled, progress, router, user?.uid],
  );
  const next = useCallback(
    (nextResults: TimeFlowRoundResult[], nextBest: number) => {
      if (!progress) return;
      const index = roundIndex + 1;
      if (index >= TIME_FLOW_ROUNDS) {
        void finish(nextResults, nextBest);
        return;
      }
      setRoundIndex(index);
      makeRound(index, progress, nextResults);
    },
    [finish, makeRound, progress, roundIndex],
  );
  const resolve = useCallback(
    (value: string | string[] | boolean | undefined) => {
      if (!round || stage !== "recall" || resolution.current) return;
      resolution.current = true;
      const submitted = Array.isArray(value)
          ? value
          : Array.isArray(answer)
            ? answer
            : [],
        elapsed = Date.now() - answerStarted.current,
        responseMs = round.difficulty.answerMs
          ? Math.min(round.difficulty.answerMs, elapsed)
          : elapsed,
        correct = evaluateAnswer(round, submitted),
        nextStreak = correct ? streak + 1 : 0,
        points = scoreRound(
          correct,
          responseMs,
          tier,
          round.difficulty.sequenceLength,
          nextStreak,
          round.difficulty.answerMs,
        ),
        result: TimeFlowRoundResult = {
          roundId: round.id,
          mechanic: round.mechanic,
          correct,
          responseMs,
          tier,
          sequenceLength: round.difficulty.sequenceLength,
          gridSize: round.difficulty.grid.rows * round.difficulty.grid.columns,
          gridRows: round.difficulty.grid.rows,
          gridColumns: round.difficulty.grid.columns,
          score: points,
        },
        nextResults = [...results, result],
        nextBest = Math.max(bestStreak, nextStreak);
      setAnswer(submitted);
      setResults(nextResults);
      setScore((s) => s + points);
      setStreak(nextStreak);
      setBestStreak(nextBest);
      setEarned(points);
      setStage(correct ? "correctFeedback" : "incorrectFeedback");
      pendingNext.current = { results: nextResults, best: nextBest };
      if (prefs.soundEnabled) (correct ? playHit : playWrong)();
      if (prefs.hapticsEnabled)
        void (
          correct
            ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            : Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              )
        ).catch(() => {});
    },
    [
      bestStreak,
      answer,
      playHit,
      playWrong,
      prefs.hapticsEnabled,
      prefs.soundEnabled,
      results,
      round,
      stage,
      streak,
      tier,
    ],
  );
  useEffect(() => {
    if (stage !== "correctFeedback" && stage !== "incorrectFeedback") return;
    const timer = setTimeout(
      () => setStage("transition"),
      roundTransitionTiming(stage === "correctFeedback", reducedMotion)
        .feedbackMs,
    );
    return () => clearTimeout(timer);
  }, [reducedMotion, stage]);
  useEffect(() => {
    if (stage !== "transition") return;
    const timer = setTimeout(() => {
      const pending = pendingNext.current;
      if (pending) next(pending.results, pending.best);
    }, roundTransitionTiming(false, reducedMotion).nextCueMs);
    return () => clearTimeout(timer);
  }, [next, reducedMotion, stage]);
  useEffect(() => {
    if (!round || stage !== "recall" || round.difficulty.answerMs <= 0) return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        (round.difficulty.answerMs - (Date.now() - answerStarted.current)) /
          1000,
      );
      setTimeLeft(Math.round(left * 10) / 10);
      if (!left) {
        clearInterval(id);
        resolve(undefined);
      }
    }, 100);
    return () => clearInterval(id);
  }, [resolve, round, stage]);
  useEffect(() => {
    if (
      !round ||
      (stage !== "correctFeedback" && stage !== "incorrectFeedback") ||
      feedbackIndex >= round.question.correctOrder.length - 1 ||
      (stage === "incorrectFeedback" && round.question.correctOrder.length > 4)
    )
      return;
    const timer = setTimeout(
      () => setFeedbackIndex((value) => value + 1),
      reducedMotion ? 55 : 70,
    );
    return () => clearTimeout(timer);
  }, [feedbackIndex, reducedMotion, round, stage]);
  useSessionLifecycle({
    onPause: () => {
      if (
        stage === "countdown" ||
        stage === "ready" ||
        stage === "watching" ||
        stage === "recall" ||
        stage === "correctFeedback" ||
        stage === "incorrectFeedback" ||
        stage === "transition"
      ) {
        previous.current = stage;
        setStage("paused");
      }
    },
    onResume: () => {},
  });
  const resume = () => {
    if (previous.current === "countdown") {
      setStage("countdown");
      return;
    }
    if (
      previous.current === "correctFeedback" ||
      previous.current === "incorrectFeedback" ||
      previous.current === "transition"
    ) {
      setStage(previous.current);
      return;
    }
    const restart = restartRoundAfterPause();
    resolution.current = false;
    setAnswer(restart.selectedOrder);
    setEventIndex(restart.eventIndex);
    setStepLit(true);
    setFeedbackIndex(0);
    setReadyCue({
      title: "RESUME FLOW",
      detail: "The pattern will replay from the start",
    });
    setStage(restart.phase);
  };
  if (!progress || stage === "loading")
    return (
      <ScreenShell
        scroll={false}
        pillar="mind"
        ambient={<AmbientBackground subtle />}
      >
        <View style={styles.loader}>
          <TimeFlowField
            layout={
              createRound({ seed: 21, index: 0, tier: 1, level: 1 }).layout
            }
            size={170}
            activeCellIds={["cell-4"]}
            reducedMotion={reducedMotion}
          />
          <Text style={styles.loaderText}>Opening the flow</Text>
        </View>
      </ScreenShell>
    );
  if (stage === "tutorial")
    return (
      <Practice
        reducedMotion={reducedMotion}
        onComplete={() => {
          practiceCompleted.current = true;
          makeRound(0, progress, []);
        }}
      />
    );
  if (!round) return null;
  const fieldSize = Math.min(width - 64, height < 740 ? 300 : 340),
    selectedOrder = Array.isArray(answer) ? answer : [],
    answerAssessment = assessRoundInput(round, selectedOrder),
    feedbackActive =
      stage === "correctFeedback" || stage === "incorrectFeedback",
    isCorrect = stage === "correctFeedback",
    mismatch =
      stage === "incorrectFeedback"
        ? answerAssessment.mismatch >= 0
          ? answerAssessment.mismatch
          : Math.min(
              selectedOrder.length,
              round.question.correctOrder.length - 1,
            )
        : -1,
    correctCell =
      stage === "incorrectFeedback" && mismatch >= 0
        ? round.question.kind === "pattern"
          ? round.question.correctOrder.find(
              (id) => !selectedOrder.includes(id),
            )
          : round.question.correctOrder[mismatch]
        : undefined,
    activeCellIds =
      stage === "watching" && stepLit
        ? (round.sequence.events[eventIndex]?.cellIds ?? [])
        : stage === "correctFeedback" ||
            (stage === "incorrectFeedback" &&
              round.question.correctOrder.length <= 4)
          ? round.question.kind === "pattern"
            ? round.question.correctOrder
            : [round.question.correctOrder[feedbackIndex]!]
          : stage === "incorrectFeedback" && correctCell
            ? [correctCell]
            : [],
    wrongCell =
      stage === "incorrectFeedback" && mismatch >= 0
        ? selectedOrder[mismatch]
        : undefined,
    timerProgress =
      stage === "recall" && round.difficulty.answerMs > 0
        ? timeLeft / (round.difficulty.answerMs / 1000)
        : 1;
  const tapNode = (id: string) => {
    if (stage !== "recall" || resolution.current) return;
    const now = Date.now();
    if (now - lastTapAt.current < 100) return;
    lastTapAt.current = now;
    if (prefs.hapticsEnabled) void Haptics.selectionAsync().catch(() => {});
    const nextOrder = [...selectedOrder, id],
      assessment = assessRoundInput(round, nextOrder);
    setAnswer(nextOrder);
    if (assessment.complete) resolve(nextOrder);
  };
  return (
    <ScreenShell
      scroll={false}
      pillar="mind"
      safeBottom
      ambient={<AmbientBackground subtle />}
      contentStyle={styles.screen}
    >
      <PatternHud
        score={score}
        streak={streak}
        tier={tier}
        onExit={() => router.back()}
        onPause={() => {
          if (
            stage !== "countdown" &&
            stage !== "ready" &&
            stage !== "watching" &&
            stage !== "recall"
          )
            return;
          previous.current = stage;
          setStage("paused");
        }}
      />
      <TimeFlowSessionProgress
        roundIndex={roundIndex}
        total={TIME_FLOW_ROUNDS}
      />
      <RuleBanner
        instruction={
          stage === "watching"
            ? round.mechanic === "reverse"
              ? "WATCH · REPEAT IN REVERSE"
              : round.mechanic === "pattern"
                ? "REMEMBER THE PATTERN"
                : "WATCH THE FLOW"
            : feedbackActive
              ? isCorrect
                ? "PERFECT FLOW"
                : "CHECK THE FLOW"
              : round.question.instruction
        }
        timeLeft={stage === "recall" ? timeLeft : 0}
        progress={timerProgress}
        urgent={timerProgress < 0.2}
      />
      <View style={styles.fieldWrap}>
        <TimeFlowField
          layout={round.layout}
          size={fieldSize}
          activeCellIds={activeCellIds}
          previousCellIds={
            stage === "watching" && eventIndex > 0 && stepLit
              ? round.sequence.events[eventIndex - 1]?.cellIds
              : []
          }
          interactive={stage === "recall"}
          onCellPress={tapNode}
          selectedOrder={selectedOrder}
          showOrder={round.question.kind === "ordered"}
          correctCellId={correctCell}
          wrongCellId={wrongCell}
          reducedMotion={reducedMotion}
        />
      </View>
      {stage === "watching" && (
        <Text style={styles.watch}>
          {round.mechanic === "pattern"
            ? "Remember every highlighted cell"
            : `Step ${eventIndex + 1} of ${round.difficulty.sequenceLength}`}
        </Text>
      )}
      <RoundTransitionOverlay
        state={
          stage === "correctFeedback"
            ? "correct"
            : stage === "incorrectFeedback"
              ? "incorrect"
              : stage === "transition"
                ? "nextRound"
                : stage === "ready"
                  ? readyCue.title === "RESUME FLOW"
                    ? "resume"
                    : readyCue.title === "NEXT FLOW"
                      ? "nextRound"
                      : "milestone"
                  : "none"
        }
        title={
          stage === "correctFeedback"
            ? round.difficulty.sequenceLength > progress.highestSequenceLength
              ? "NEW LONGEST FLOW"
              : "PERFECT FLOW"
            : stage === "incorrectFeedback"
              ? "ALMOST"
              : stage === "transition"
                ? roundIndex === 11
                  ? "SESSION COMPLETE"
                  : "NEW FLOW"
                : readyCue.title
        }
        detail={
          stage === "correctFeedback"
            ? `${round.difficulty.sequenceLength} step flow · +${earned}`
            : stage === "incorrectFeedback"
              ? `Missed at step ${mismatch + 1} · Reached ${Math.max(0, mismatch)} / ${round.difficulty.sequenceLength}`
              : stage === "transition"
                ? roundIndex === 11
                  ? "Saving your progress"
                  : "Reset and get ready"
                : readyCue.detail
        }
        reducedMotion={reducedMotion}
      />
      {stage === "saving" && (
        <Text style={styles.watch}>Securing your progress…</Text>
      )}
      {stage === "countdown" && (
        <View style={styles.startOverlay} pointerEvents="none">
          <Text style={styles.startLabel}>WATCH THE FLOW</Text>
          <Text style={styles.sessionCountdown}>{sessionCountdown}</Text>
          <Text style={styles.startHint}>The first cell lights after 1</Text>
        </View>
      )}
      {stage === "paused" && (
        <View style={styles.overlay}>
          <GlassCard tint={SURFACE_TINT.card} style={styles.pause}>
            <Play color={PILLAR_COLORS.mind} size={25} />
            <Text style={styles.pauseTitle}>Session paused</Text>
            <Text style={styles.pauseCopy}>
              Resume when ready. The current pattern will replay from the start.
            </Text>
            <GradientCTA
              label="Resume"
              onPress={resume}
              style={styles.resume}
            />
          </GlassCard>
        </View>
      )}
    </ScreenShell>
  );
}
function Practice({
  reducedMotion,
  onComplete,
}: {
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  const [round] = useState(() => {
      const base = createRound({ seed: 101, index: 0, tier: 1, level: 1 }),
        targetOrder = ["cell-0", "cell-4", "cell-8"];
      return {
        ...base,
        sequence: {
          ...base.sequence,
          targetOrder,
          events: targetOrder.map((cellId) => ({
            type: "cellPulse" as const,
            cellIds: [cellId],
          })),
        },
        question: {
          kind: "ordered" as const,
          instruction: "REPEAT THE FLOW" as const,
          correctOrder: targetOrder,
        },
      };
    }),
    [phase, setPhase] = useState<
      "ready" | "countdown" | "watch" | "recall" | "done"
    >("ready"),
    [countdown, setCountdown] = useState(3),
    [index, setIndex] = useState(0),
    [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = setTimeout(() => {
      if (countdown > 1) setCountdown((value) => value - 1);
      else setPhase("watch");
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase]);
  useEffect(() => {
    if (phase !== "watch") return;
    const timer = setTimeout(
      () =>
        index < round.sequence.events.length - 1
          ? setIndex((i) => i + 1)
          : setPhase("recall"),
      reducedMotion ? 400 : 700,
    );
    return () => clearTimeout(timer);
  }, [index, phase, reducedMotion, round]);
  const assessment = assessRoundInput(round, chosen),
    correct = phase === "done" && assessment.correct,
    wrongCell =
      phase === "done" && assessment.mismatch >= 0
        ? chosen[assessment.mismatch]
        : undefined,
    correctCell =
      phase === "done" && assessment.mismatch >= 0
        ? round.question.correctOrder[assessment.mismatch]
        : undefined;
  return (
    <ScreenShell
      pillar="mind"
      ambient={<AmbientBackground subtle />}
      safeBottom
    >
      <View style={styles.practice}>
        <Text style={styles.practiceKicker}>TIMEFLOW</Text>
        <Text style={styles.practiceTitle}>
          {phase === "countdown"
            ? "Get ready"
            : phase === "ready" || phase === "watch"
              ? "Watch the flow"
              : phase === "recall"
                ? "Your turn"
                : correct
                  ? "Perfect Flow"
                  : "Almost"}
        </Text>
        <Text style={styles.practiceSub}>
          {phase === "countdown"
            ? "The flow begins after 1."
            : phase === "ready"
              ? "Watch three cells light up, then repeat their order."
              : phase === "watch"
                ? index === 0
                  ? "Follow each cell as it lights up."
                  : `Event ${index + 1} of ${round.sequence.events.length}`
                : phase === "recall"
                  ? "Tap the nodes in the same order."
                  : correct
                    ? "Exactly. Repeat the order the lights appear."
                    : "The expected cell is highlighted."}
        </Text>
        <TimeFlowField
          layout={round.layout}
          size={300}
          activeCellIds={
            phase === "watch" ? round.sequence.events[index]?.cellIds : []
          }
          previousCellIds={
            phase === "watch" && index > 0
              ? round.sequence.events[index - 1]?.cellIds
              : []
          }
          interactive={phase === "recall"}
          onCellPress={(id) => {
            const next = [...chosen, id],
              nextAssessment = assessRoundInput(round, next);
            setChosen(next);
            if (nextAssessment.complete) setPhase("done");
          }}
          selectedOrder={chosen}
          correctCellId={correctCell}
          wrongCellId={wrongCell}
          reducedMotion={reducedMotion}
        />
        {phase === "countdown" && (
          <Text style={styles.countdown}>{countdown}</Text>
        )}
        {phase === "ready" && (
          <GradientCTA
            label="Begin Practice"
            onPress={() => {
              setCountdown(3);
              setPhase("countdown");
            }}
            style={styles.practiceReadyCta}
          />
        )}
        {phase === "done" && (
          <View style={styles.practiceFeedback}>
            <Text
              style={[
                styles.practiceResult,
                correct ? styles.good : styles.bad,
              ]}
            >
              {correct ? "Perfect Flow" : "Almost"}
            </Text>
            <Text style={styles.practiceTip}>
              {correct
                ? "Exactly. Repeat the order the lights appear."
                : "The expected cell is highlighted."}
            </Text>
            <GradientCTA
              label={correct ? "Start Session" : "Try Again"}
              onPress={
                correct
                  ? onComplete
                  : () => {
                      setChosen([]);
                      setIndex(0);
                      setCountdown(3);
                      setPhase("countdown");
                    }
              }
              style={styles.practiceCta}
            />
          </View>
        )}
      </View>
    </ScreenShell>
  );
}
const styles = StyleSheet.create({
  screen: { paddingTop: 5 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
    color: "#fff",
    marginTop: 14,
  },
  fieldWrap: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  watch: {
    height: 28,
    textAlign: "center",
    color: colors.text.secondary,
    fontSize: 12,
  },
  feedback: { height: 30 },
  perfect: {
    textAlign: "center",
    color: "#66E3A5",
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
  },
  wrong: {
    textAlign: "center",
    color: "#E8B8C0",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    backgroundColor: "rgba(6,5,14,.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  pause: { width: "88%", alignItems: "center" },
  pauseTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: "#fff",
    marginTop: 13,
  },
  pauseCopy: { color: colors.text.secondary, fontSize: 14, marginTop: 6 },
  resume: { width: "100%", marginTop: 22 },
  practice: { flex: 1, alignItems: "center", justifyContent: "center" },
  practiceKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#A48BFF",
  },
  practiceTitle: {
    fontFamily: FONTS.heading,
    fontSize: 25,
    color: "#fff",
    marginTop: 10,
  },
  practiceSub: { fontSize: 13, color: colors.text.secondary, marginTop: 5 },
  practiceFeedback: { width: "100%", alignItems: "center" },
  practiceResult: { fontFamily: FONTS.headingSemi, fontSize: 17 },
  good: { color: "#66E3A5" },
  bad: { color: "#E8B8C0" },
  practiceTip: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  practiceCta: { width: "100%", marginTop: 15 },
  practiceReadyCta: { width: "100%", marginTop: 12 },
  countdown: {
    position: "absolute",
    top: "43%",
    fontFamily: FONTS.heading,
    fontSize: 56,
    color: "#4DE1C1",
    textShadowColor: "rgba(77,225,193,.4)",
    textShadowRadius: 16,
  },
  startOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,7,20,.78)",
  },
  startLabel: {
    fontFamily: FONTS.headingSemi,
    fontSize: 13,
    letterSpacing: 1.8,
    color: "#B9C9E8",
  },
  sessionCountdown: {
    marginVertical: 8,
    fontFamily: FONTS.heading,
    fontSize: 64,
    color: "#4DE1C1",
    textShadowColor: "rgba(77,225,193,.35)",
    textShadowRadius: 18,
  },
  startHint: { fontSize: 12, color: colors.text.secondary },
});
