import type {
  DifficultyConfig,
  PatternDefinition,
  PatternShiftRound,
  PatternShiftRoundType,
  RoundResult,
} from './types';
import { familyForRound, generateGlyph, glyphSignature, mutateGlyph, strengthForTier, structuralDifference, transformGlyph, validateCandidateSet, validateStructuralGlyph } from './glyphEngine';

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function difficultyForTier(input: number): DifficultyConfig {
  const tier = Math.max(1, Math.min(12, Math.round(input)));
  return {
    tier,
    choiceCount: tier < 2 ? 4 : tier < 4 ? 6 : tier < 6 ? 8 : 9,
    elementCount: Math.min(9, 3 + Math.floor((tier - 1) / 2)),
    previewMs: Math.max(850, 3500 - tier * 260),
    answerMs: Math.max(4500, 11000 - tier * 520),
    similarity: Math.min(0.94, 0.25 + tier * 0.07),
  };
}

export function generatePattern(seed: number, elementCount: number): PatternDefinition {
  return generateGlyph(seed, elementCount, familyForRound(seed, 0, 8));
}

export function patternSignature(pattern: PatternDefinition): string {
  return glyphSignature(pattern);
}

export function transformPattern(
  pattern: PatternDefinition,
  transform: 'mirror' | 'rotation' | 'missing',
  id = `${pattern.id}-${transform}`,
): PatternDefinition {
  return transformGlyph(pattern, transform, id);
}

function shuffle<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const INSTRUCTIONS: Record<PatternShiftRoundType, string> = {
  exact: 'FIND THE EXACT STRUCTURE', recall: 'REMEMBER THE STRUCTURE', missing: 'FIND THE MISSING PIECE',
  mirror: 'FIND THE MIRROR', rotation: 'FIND THE ROTATED MATCH', sequence: 'WHICH PATTERN APPEARED SECOND?',
};

export function createRound(input: {
  seed: number; index: number; tier: number; type: PatternShiftRoundType;
  phase?: PatternShiftRound['phase']; playerLevel?: number;
}): PatternShiftRound {
  const difficulty = difficultyForTier(input.tier);
  const family = familyForRound(input.seed, input.index, input.playerLevel ?? 8);
  const target = generateGlyph(input.seed, difficulty.elementCount, family);
  const sequence = input.type === 'sequence'
    ? [target, generateGlyph(input.seed + 1, difficulty.elementCount, family), generateGlyph(input.seed + 2, difficulty.elementCount, family)]
    : undefined;
  const answer = input.type === 'mirror' ? transformPattern(target, 'mirror', `${target.id}-answer`)
    : input.type === 'rotation' ? transformPattern(target, 'rotation', `${target.id}-answer`)
      : input.type === 'missing' ? transformPattern(target, 'missing', `${target.id}-answer`)
        : input.type === 'sequence' ? sequence![1]
          : { ...target, id: `${target.id}-answer`, nodes: target.nodes.map(n => ({ ...n })), edges: target.edges.map(e => ({ ...e })), arcs: target.arcs.map(a => ({ ...a, center: { ...a.center } })) };
  const candidates = [answer];
  const signatures = new Set([patternSignature(answer)]);
  let cursor = 0;
  while (candidates.length < difficulty.choiceCount && cursor < 100) {
    const candidate = mutateGlyph(answer, input.seed + 41, strengthForTier(difficulty.tier), cursor++);
    const signature = patternSignature(candidate);
    if (!signatures.has(signature) && validateStructuralGlyph(candidate).valid && structuralDifference(answer, candidate) >= .18) { signatures.add(signature); candidates.push(candidate); }
  }
  if (!validateCandidateSet(answer, candidates)) {
    throw new Error(`Unable to create a fair Pattern Shift round for seed ${input.seed}`);
  }
  return {
    id: `ps-${input.seed}-${input.index}`,
    type: input.type,
    instruction: INSTRUCTIONS[input.type],
    target,
    sequence,
    candidates: shuffle(candidates, input.seed + 811),
    correctCandidateId: answer.id,
    difficulty,
    targetVisibleDuringAnswer: input.type === 'exact' || input.type === 'missing' || input.type === 'mirror' || input.type === 'rotation',
    phase: input.phase ?? 'adaptive',
  };
}

export function adaptDifficulty(current: number, recent: RoundResult[]): number {
  const window = recent.slice(-5);
  if (window.length < 3) return current;
  const accuracy = window.filter(result => result.correct).length / window.length;
  const median = [...window].sort((a, b) => a.responseMs - b.responseMs)[Math.floor(window.length / 2)].responseMs;
  const targetMs = difficultyForTier(current).answerMs;
  const trailingFails = [...window].reverse().findIndex(result => result.correct);
  if (accuracy >= 0.9 && median < targetMs * 0.62 && window.slice(-3).every(result => result.correct)) return Math.min(12, current + 1);
  if (accuracy < 0.6 || trailingFails >= 2) return Math.max(1, current - 1);
  return current;
}

export function scoreRound(correct: boolean, responseMs: number, tier: number, streak: number, answerMs: number): number {
  if (!correct) return 0;
  const speed = Math.max(0.65, Math.min(1.35, 1.35 - responseMs / answerMs * 0.7));
  const difficulty = 1 + (tier - 1) * 0.12;
  const streakMultiplier = 1 + Math.min(streak, 10) * 0.025;
  return Math.round(100 * speed * difficulty * streakMultiplier);
}
