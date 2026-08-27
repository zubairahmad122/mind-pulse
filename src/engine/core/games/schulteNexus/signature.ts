import type { SchulteChallenge } from './types';

/**
 * A challenge before its signature exists.
 *
 * The signature is a hash of everything else, so it cannot be an input to
 * itself — the generator builds this shape first, hashes it, then seals it
 * into a `SchulteChallenge`. A finished challenge is assignable to it, which
 * is what lets `validateChallenge` re-hash and compare.
 */
export type SchulteChallengeDraft = Omit<SchulteChallenge, 'signature'>;

/**
 * Challenge signatures.
 *
 * A signature identifies a challenge by its *content*, never by its label. It
 * deliberately excludes `id`, `seed`, `version` and the signature field
 * itself, because those differ for every date by construction — hashing them
 * would make "two dates produce different challenges" trivially true while
 * saying nothing about whether the puzzles actually differ.
 *
 * The digest is two independent FNV-1a passes concatenated into 64 bits. A
 * single 32-bit pass would give roughly a 1-in-650 chance of a collision
 * somewhere across a decade of dailies; 64 bits pushes that to ~1e-12, which
 * is the difference between "never returns a completed challenge" being a
 * guarantee and being a probability.
 */

const FNV_PRIME = 0x01000193;
const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x1b873593;

function fnv1a(input: string, offsetBasis: number): number {
  let hash = offsetBasis >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/** A stable 64-bit hex digest of an arbitrary string. */
export function hash64(input: string): string {
  const high = fnv1a(input, FNV_OFFSET_A);
  const low = fnv1a(`${input}#`, FNV_OFFSET_B);
  return high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0');
}

/** A 32-bit seed derived from a string. Used to turn a date into a seed. */
export function seedFromString(input: string): number {
  return fnv1a(input, FNV_OFFSET_A) >>> 0;
}

/**
 * The exact bytes a signature is computed over.
 *
 * Exported so a failing collision test can print *what* was identical, rather
 * than two hex strings that happen to match.
 */
export function canonicalChallengeContent(challenge: SchulteChallengeDraft): string {
  const positions = challenge.boardPositions
    .map((cell) => `${cell.value}@${cell.row},${cell.column}`)
    .join('|');

  const phases = challenge.phaseRules
    .map(
      (phase) =>
        `${phase.index}:${phase.startStep}-${phase.endStep}:${phase.order}:${phase.step ?? '-'}:${phase.blockSize ?? '-'}`,
    )
    .join('|');

  const reveal = challenge.revealBehaviour;
  const transform = challenge.transformRule;

  return [
    `family=${challenge.family}`,
    `size=${challenge.boardSize}`,
    `values=${challenge.activeValues.join(',')}`,
    `board=${positions}`,
    `targets=${challenge.targetSequence.join(',')}`,
    `phases=${phases}`,
    `reveal=${reveal.mode},${reveal.previewMs},${reveal.fadeOpacity},${reveal.fadeAfterSteps}`,
    `transform=${transform.kind},${transform.axisIndex},${transform.offset},${transform.everySteps},${transform.advanceAxis}`,
    `traps=${challenge.trapValues.join(',')}`,
    `time=${challenge.timeLimitMs}`,
    `errors=${challenge.maximumErrors}`,
    `band=${challenge.difficultyBand}`,
    `reward=${challenge.rewardTier}`,
  ].join(';');
}

/**
 * Content hash of a challenge.
 *
 * Prefixed with the family and board size so a signature is legible in a log
 * or a persisted completion list without having to look it up.
 */
export function createChallengeSignature(challenge: SchulteChallengeDraft): string {
  return `sn1-${challenge.family}-${challenge.boardSize}-${hash64(canonicalChallengeContent(challenge))}`;
}
