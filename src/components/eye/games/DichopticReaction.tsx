import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { type DichopticColors } from '@/utils/dichoptic';
import { useGameSounds } from '@/hooks/useGameSounds';
import { HeartIcon, BrokenHeartIcon } from '@/components/eye/games/DichopticIcons';
import type { GameEndStats } from './GameOverScreen';

interface Props {
  running: boolean;
  colors: DichopticColors;
  onGameEnd: (stats: GameEndStats) => void;
  onReplay?: () => void;
}

const MAX_HEALTH = 3;
const SESSION_SECS = 60;
const { width: SW } = Dimensions.get('window');
const ARENA_W = SW - 32;
const ARENA_H = 420;
const TARGET_SIZE = 56;
const TARGET_HALF = TARGET_SIZE / 2;

type TargetColor = 'left' | 'right';

interface TargetData {
  id: number;
  x: number;
  y: number;
  color: TargetColor;
}

// ─── Health Heart (SVG) ──────────────────────────────────────────────────────
function Heart({ filled }: { filled: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!filled) {
      scale.value = withSequence(
        withSpring(1.5, { damping: 6 }),
        withSpring(0, { damping: 12 }),
      );
    }
  }, [filled]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View style={style}>
      {filled
        ? <HeartIcon color="#FF3366" />
        : <BrokenHeartIcon color="rgba(255,255,255,0.15)" />
      }
    </Animated.View>
  );
}

// ─── Floating Score ───────────────────────────────────────────────────────────
function FloatText({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(0, { duration: 900 });
    translateY.value = withTiming(-50, { duration: 900 });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute', left: x - 18, top: y - 14,
          paddingHorizontal: 8, paddingVertical: 2,
          borderRadius: 6,
        },
      ]}
    >
      <Text style={{ fontSize: 22, fontWeight: '900', color }}>{text}</Text>
    </Animated.View>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export function DichopticReaction({ running, colors, onGameEnd, onReplay }: Props) {
  const { playHit, playWrong, playLevelUp } = useGameSounds();

  const [active, setActive] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timer, setTimer] = useState(SESSION_SECS);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [activeColor, setActiveColor] = useState<TargetColor>('left');
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState(1); // 1=easy, 2=medium, 3=hard
  const [startDifficulty, setStartDifficulty] = useState(1); // user's chosen starting level

  const nextIdRef = useRef(0);
  const activeColorRef = useRef<TargetColor>('left');
  const scoreRef = useRef(0);
  const healthRef = useRef(MAX_HEALTH);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const endedRef = useRef(false);
  const pausedRef = useRef(false);
  const timerRef = useRef(SESSION_SECS);
  const timerHandle = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverRef = useRef(false);
  const difficultyRef = useRef(1);
  const elapsedRef = useRef(0);

  // ─── Difficulty configs ────────────────────────────────────────────────────
  function getDifficultyConfig(level: number) {
    switch (level) {
      case 1: return { label: 'Easy', spawnMin: 2200, spawnMax: 3000, switchAfter: 5 };
      case 2: return { label: 'Medium', spawnMin: 1500, spawnMax: 2200, switchAfter: 4 };
      case 3: return { label: 'Hard', spawnMin: 1000, spawnMax: 1600, switchAfter: 3 };
      default: return { label: 'Easy', spawnMin: 2200, spawnMax: 3000, switchAfter: 5 };
    }
  }

  // ─── Spawn target ──────────────────────────────────────────────────────────
  function spawnTarget() {
    const x = TARGET_HALF + 10 + Math.random() * (ARENA_W - TARGET_SIZE - 20);
    const y = TARGET_HALF + 10 + Math.random() * (ARENA_H - TARGET_SIZE - 20);
    const id = nextIdRef.current++;
    const color: TargetColor = Math.random() < 0.5 ? 'left' : 'right';
    setTargets(prev => [...prev, { id, x, y, color }]);
  }

  // ─── Switch active color ────────────────────────────────────────────────────
  function switchActiveColor() {
    const next = activeColorRef.current === 'left' ? 'right' : 'left';
    activeColorRef.current = next;
    setActiveColor(next);
  }

  // ─── Update difficulty based on elapsed time (only increases) ──────────────
  function checkDifficulty(elapsed: number) {
    let newLevel = difficultyRef.current;
    if (elapsed >= 40) newLevel = Math.max(newLevel, 3);
    else if (elapsed >= 20) newLevel = Math.max(newLevel, 2);
    if (newLevel !== difficultyRef.current) {
      difficultyRef.current = newLevel;
      setDifficulty(newLevel);
      playLevelUp();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }

  // ─── Tap handler ────────────────────────────────────────────────────────────
  function handleTap(target: TargetData) {
    if (pausedRef.current || endedRef.current) return;

    setTargets(prev => prev.filter(t => t.id !== target.id));

    const isCorrect = target.color === activeColorRef.current;

    if (isCorrect) {
      const cfg = getDifficultyConfig(difficultyRef.current);
      // Score: base 10 × multiplier based on difficulty + combo bonus
      const multiplier = difficultyRef.current;
      const comboBonus = Math.min(comboRef.current, 10) * 2;
      const points = (10 + comboBonus) * multiplier;
      scoreRef.current += points;
      setScore(scoreRef.current);
      comboRef.current += 1;
      setCombo(comboRef.current);
      if (comboRef.current > bestComboRef.current) {
        bestComboRef.current = comboRef.current;
        setBestCombo(bestComboRef.current);
      }
      playHit();
      void Haptics.impactAsync(
        comboRef.current >= 5
          ? Haptics.ImpactFeedbackStyle.Heavy
          : comboRef.current >= 3
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
      );

      // Floating +points
      const fid = nextIdRef.current++;
      setFloats(prev => [...prev, {
        id: fid, x: target.x, y: target.y,
        text: `+${points}`,
        color: target.color === 'left' ? colors.left : colors.right,
      }]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 950);

      // Switch active color every N correct taps (decreases with difficulty)
      if (comboRef.current % cfg.switchAfter === 0) {
        setTimeout(() => switchActiveColor(), 150);
      }
    } else {
      // Wrong color — lose health
      healthRef.current -= 1;
      setHealth(healthRef.current);
      comboRef.current = 0;
      setCombo(0);
      playWrong();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Floating ✗
      const fid = nextIdRef.current++;
      setFloats(prev => [...prev, {
        id: fid, x: target.x, y: target.y,
        text: '✗', color: '#F44336',
      }]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 950);

      // Game over check
      if (healthRef.current <= 0) {
        gameOverRef.current = true;
        endGame();
        return;
      }
    }
  }

  // ─── Spawn loop ─────────────────────────────────────────────────────────────
  function scheduleSpawn() {
    if (endedRef.current || pausedRef.current || gameOverRef.current) return;
    const cfg = getDifficultyConfig(difficultyRef.current);
    const delay = cfg.spawnMin + Math.random() * (cfg.spawnMax - cfg.spawnMin);
    spawnTimerRef.current = setTimeout(() => {
      if (!endedRef.current && !pausedRef.current && !gameOverRef.current) {
        spawnTarget();
        scheduleSpawn();
      }
    }, delay);
  }

  // ─── Session lifecycle ──────────────────────────────────────────────────────
  function startSession() {
    if (active) return;
    onReplay?.();
    endedRef.current = false;
    pausedRef.current = false;
    gameOverRef.current = false;
    timerRef.current = SESSION_SECS;
    elapsedRef.current = 0;

    setActive(true);
    setGameOver(false);
    setSessionDone(false);
    setPaused(false);
    setScore(0);
    setHealth(MAX_HEALTH);
    setTargets([]);
    setFloats([]);
    setCombo(0);
    setBestCombo(0);
    setDifficulty(1);
    setTimer(SESSION_SECS);

    scoreRef.current = 0;
    healthRef.current = MAX_HEALTH;
    comboRef.current = 0;
    bestComboRef.current = 0;
    difficultyRef.current = startDifficulty;
    setDifficulty(startDifficulty);
    activeColorRef.current = 'left';
    setActiveColor('left');

    // Spawn first target
    spawnTarget();

    // Timer + difficulty check
    timerHandle.current = setInterval(() => {
      timerRef.current -= 1;
      elapsedRef.current += 1;
      setTimer(timerRef.current);
      checkDifficulty(elapsedRef.current);
      if (timerRef.current <= 0 && !gameOverRef.current) endGame();
    }, 1000);

    // Start spawn loop
    scheduleSpawn();
  }

  function pauseSession() {
    if (!active || pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    if (timerHandle.current) { clearInterval(timerHandle.current); timerHandle.current = null; }
    if (spawnTimerRef.current) { clearTimeout(spawnTimerRef.current); spawnTimerRef.current = null; }
  }

  function resumeSession() {
    if (!active || !pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    timerHandle.current = setInterval(() => {
      timerRef.current -= 1;
      elapsedRef.current += 1;
      setTimer(timerRef.current);
      checkDifficulty(elapsedRef.current);
      if (timerRef.current <= 0 && !gameOverRef.current) endGame();
    }, 1000);
    scheduleSpawn();
  }

  function endGame() {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerHandle.current) { clearInterval(timerHandle.current); timerHandle.current = null; }
    if (spawnTimerRef.current) { clearTimeout(spawnTimerRef.current); spawnTimerRef.current = null; }
    setActive(false);
    setPaused(false);

    if (gameOverRef.current) {
      setGameOver(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setSessionDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const isSurvived = !gameOverRef.current;
    let rating: 1 | 2 | 3 = 1;
    if (isSurvived) {
      if (scoreRef.current >= 500) rating = 3;
      else if (scoreRef.current >= 250) rating = 2;
    } else {
      if (scoreRef.current >= 200) rating = 2;
    }

    onGameEnd({
      headline: gameOverRef.current ? `GAME OVER — ${scoreRef.current} pts` : `${scoreRef.current} pts`,
      subline: gameOverRef.current
        ? `You ran out of lives! Best combo: ${bestComboRef.current}x`
        : `Survived! Best combo: ${bestComboRef.current}x · Difficulty: ${getDifficultyConfig(difficultyRef.current).label}`,
      rating,
      survived: isSurvived,
      stats: [
        { label: 'Score', value: `${scoreRef.current}` },
        { label: 'Best Combo', value: `${bestComboRef.current}x` },
        { label: 'Difficulty', value: getDifficultyConfig(difficultyRef.current).label },
        { label: 'Health Lost', value: `${MAX_HEALTH - healthRef.current}/${MAX_HEALTH}` },
        { label: 'Time', value: gameOverRef.current ? `${SESSION_SECS - timerRef.current}s` : `${SESSION_SECS}s` },
      ],
    });
  }

  useEffect(() => { if (!running && active) endGame(); }, [running]);
  useEffect(() => () => {
    if (timerHandle.current) clearInterval(timerHandle.current);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  const leftHex = colors.left;
  const rightHex = colors.right;
  const cfg = getDifficultyConfig(difficulty);

  // Start screen — shown before game starts and after game ends
  if (!active) {
    return (
      <View style={s.wrap}>
        {/* Visual Demo — shows how the game works */}
        <View style={s.demoCard}>
          <Text style={s.demoTitle}>🎯 Tap the matching color</Text>
          <View style={s.demoRow}>
            <View style={[s.demoDot, { backgroundColor: leftHex }]} />
            <Text style={s.demoArrow}>→</Text>
            <View style={[s.demoChip, { backgroundColor: leftHex }]}>
              <Text style={s.demoChipText}>RED</Text>
            </View>
            <Text style={s.demoLabel}>Match this!</Text>
          </View>
          <Text style={s.demoHint}>Wrong color = lose a life</Text>
        </View>

        {/* Difficulty selector */}
        <View style={s.diffRow}>
          {[1, 2, 3].map(lvl => {
            const dCfg = getDifficultyConfig(lvl);
            const isSelected = difficultyRef.current === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                onPress={() => { setStartDifficulty(lvl); difficultyRef.current = lvl; setDifficulty(lvl); }}
                style={[s.diffBtn, isSelected && s.diffBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.diffBtnLabel, isSelected && s.diffBtnLabelActive]}>
                  {dCfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Color Preview — show both eye colors */}
        <View style={s.colorDemoRow}>
          <View style={s.colorDemoItem}>
            <View style={[s.colorDemoSwatch, { backgroundColor: leftHex, borderColor: leftHex }]} />
            <Text style={s.colorDemoLabel}>Left eye sees</Text>
          </View>
          <View style={s.colorDemoItem}>
            <View style={[s.colorDemoSwatch, { backgroundColor: rightHex, borderColor: rightHex }]} />
            <Text style={s.colorDemoLabel}>Right eye sees</Text>
          </View>
        </View>

        {/* Start / Play Again button */}
        <TouchableOpacity style={s.startBtn} onPress={startSession} activeOpacity={0.85}>
          <Text style={s.startBtnText}>
            {gameOver ? '▶  PLAY AGAIN' : sessionDone ? '▶  PLAY AGAIN' : '▶  START GAME'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Active game rendering ──────────────────────────────────────────────────
  return (
    <View style={s.wrap}>

      {/* Top HUD */}
      <View style={s.hudRow}>
        {/* Health */}
        <View style={s.healthRow}>
          {[0, 1, 2].map(i => (
            <Heart key={i} filled={i < health} />
          ))}
        </View>

        {/* Score */}
        <View style={s.scoreWrap}>
          <Text style={s.scoreLabel}>SCORE</Text>
          <Text style={s.scoreVal}>{score}</Text>
        </View>

        {/* Timer + Difficulty */}
        <View style={s.rightHud}>
          <Text style={s.diffBadge}>{cfg.label}</Text>
          <Text style={s.timerVal}>{timer}s</Text>
        </View>
      </View>

      {/* Combo indicator */}
      {combo >= 2 && (
        <Text style={[s.comboText, combo >= 5 && s.comboHot, combo >= 8 && s.comboFire]}>
          {combo >= 8 ? '🔥🔥 ' : combo >= 5 ? '🔥 ' : ''}{combo}x COMBO
          {combo >= 5 ? ' +MULTI' : ''}
        </Text>
      )}

      {/* Active Color Indicator — prominent */}
      <View style={[s.activeColorBar, { backgroundColor: activeColor === 'left' ? leftHex : rightHex }]}>
        <Text style={s.activeColorLabel}>
          TAP → {activeColor === 'left' ? colors.leftLabel : colors.rightLabel}
        </Text>
      </View>

      {/* Arena */}
      <View style={s.arena}>
        {/* Targets */}
        {targets.map(target => (
          <TouchableOpacity
            key={target.id}
            activeOpacity={0.7}
            onPress={() => handleTap(target)}
            style={[
              s.target,
              {
                left: target.x - TARGET_HALF,
                top: target.y - TARGET_HALF,
                backgroundColor: target.color === 'left' ? leftHex : rightHex,
                shadowColor: target.color === 'left' ? leftHex : rightHex,
              },
            ]}
          >
            <View
              style={[
                s.targetInner,
                { backgroundColor: target.color === 'left' ? leftHex : rightHex, opacity: 0.75 },
              ]}
            />
          </TouchableOpacity>
        ))}

        {/* Floating scores */}
        {floats.map(f => (
          <FloatText key={f.id} x={f.x} y={f.y} text={f.text} color={f.color} />
        ))}

        {/* Pause button */}
        {!paused && (
          <TouchableOpacity style={s.pauseBtn} onPress={pauseSession} activeOpacity={0.7} hitSlop={8}>
            <Text style={s.pauseBtnIcon}>⏸</Text>
          </TouchableOpacity>
        )}

        {/* Pause overlay */}
        {paused && (
          <View style={s.pauseOverlay}>
            <Text style={s.pauseTitle}>Paused</Text>
            <TouchableOpacity style={s.resumeBtn} onPress={resumeSession} activeOpacity={0.8}>
              <Text style={s.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.endBtn} onPress={endGame} activeOpacity={0.8}>
              <Text style={s.endBtnText}>Quit Game</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, width: '100%' },

  /* Start Screen */
  demoCard: {
    alignSelf: 'stretch',
    backgroundColor: '#1a1535',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(123,97,255,0.3)',
    padding: 18,
    gap: 12,
  },
  demoTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  demoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  demoDot: {
    width: 32, height: 32, borderRadius: 16,
  },
  demoArrow: { fontSize: 18, color: '#9b8ec4' },
  demoChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  demoChipText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  demoLabel: { fontSize: 13, color: '#6ee7b7', fontWeight: '700' },
  demoHint: { fontSize: 12, color: '#F44336', textAlign: 'center', fontWeight: '600' },

  diffRow: {
    flexDirection: 'row', gap: 8, alignSelf: 'stretch',
  },
  diffBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1a1535',
  },
  diffBtnActive: { borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.15)' },
  diffBtnLabel: { fontSize: 12, fontWeight: '700', color: '#9b8ec4' },
  diffBtnLabelActive: { color: '#fff' },

  colorDemoRow: {
    flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8,
  },
  colorDemoItem: { alignItems: 'center', gap: 4 },
  colorDemoSwatch: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 2,
  },
  colorDemoLabel: { fontSize: 10, color: '#9b8ec4', fontWeight: '600' },

  startBtn: {
    alignSelf: 'stretch', backgroundColor: '#22d3ee',
    borderRadius: 100, paddingVertical: 16, alignItems: 'center',
  },
  startBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  /* HUD */
  hudRow: {
    flexDirection: 'row', alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1535', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  healthRow: { flexDirection: 'row', gap: 4, minWidth: 80 },
  scoreWrap: { alignItems: 'center', gap: 1 },
  scoreLabel: { fontSize: 9, color: '#9b8ec4', fontWeight: '800', letterSpacing: 1.5 },
  scoreVal: { fontSize: 26, fontWeight: '900', color: '#ffffff', lineHeight: 30 },
  rightHud: { alignItems: 'flex-end', gap: 2, minWidth: 60 },
  diffBadge: {
    fontSize: 9, fontWeight: '800', color: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    overflow: 'hidden',
  },
  timerVal: { fontSize: 18, fontWeight: '800', color: '#ffffff' },

  comboText: {
    fontSize: 13, fontWeight: '800', color: '#FFD700',
    alignSelf: 'center', letterSpacing: 0.5,
  },
  comboHot: { color: '#FF9800', fontSize: 14 },
  comboFire: { color: '#F44336', fontSize: 15 },

  /* Active Color Bar */
  activeColorBar: {
    alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  activeColorLabel: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  /* Arena */
  arena: {
    width: ARENA_W, height: ARENA_H,
    backgroundColor: '#0a0818',
    borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(123,97,255,0.22)',
    overflow: 'hidden', position: 'relative',
  },

  target: {
    position: 'absolute',
    width: TARGET_SIZE, height: TARGET_SIZE,
    borderRadius: TARGET_HALF,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.6,
    elevation: 8,
  },
  targetInner: {
    width: TARGET_SIZE * 0.5,
    height: TARGET_SIZE * 0.5,
    borderRadius: TARGET_SIZE * 0.25,
  },


  /* Pause */
  pauseBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(26,21,53,0.88)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  pauseBtnIcon: { fontSize: 14 },

  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6,4,19,0.93)',
    alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10,
  },
  pauseTitle:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  resumeBtn:     { backgroundColor: '#22d3ee', borderRadius: 100, paddingHorizontal: 38, paddingVertical: 13 },
  resumeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  endBtn: {
    borderWidth: 1.5, borderColor: 'rgba(244,67,54,0.45)',
    borderRadius: 100, paddingHorizontal: 28, paddingVertical: 10, marginTop: 4,
  },
  endBtnText: { fontSize: 13, fontWeight: '700', color: '#F44336' },

});
