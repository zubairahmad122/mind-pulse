import { applyTransformAtStep } from './board';
import { buildPhaseOrder } from './sequences';
import { createChallengeSignature } from './signature';
import {
  SCHULTE_FAMILIES,
  type SchulteChallenge,
  type SchulteValidationResult,
} from './types';

/**
 * Challenge validation.
 *
 * This is the contract every generated challenge must satisfy before anything
 * renders it, and the thing tests assert against rather than re-implementing
 * the rules. Two checks matter more than the rest:
 *
 *  - the phase rules are *re-derived* from their own slice of the target
 *    sequence and compared, so a descriptor can never claim an order it does
 *    not actually follow;
 *  - the board is replayed through every transform application the mission
 *    will ever perform, and each replay must still hold every remaining
 *    target exactly once.
 */

/** Minimum time a solvable mission may allow per target. */
const MIN_MS_PER_TARGET = 400;

const VALID_BANDS = new Set(['gentle', 'casual', 'sharp', 'elite']);
const VALID_REWARDS = new Set(['bronze', 'silver', 'gold', 'platinum']);
const VALID_REVEAL_MODES = new Set(['always-visible', 'fade-after-preview', 'fade-on-progress']);

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function validateChallenge(challenge: SchulteChallenge): SchulteValidationResult {
  const issues: string[] = [];

  // --- identity -----------------------------------------------------------
  if (typeof challenge.id !== 'string' || challenge.id.length === 0) {
    issues.push('id must be a non-empty string');
  }
  if (!isPositiveInteger(challenge.version)) issues.push('version must be a positive integer');
  if (!Number.isInteger(challenge.seed) || challenge.seed < 0) {
    issues.push('seed must be a non-negative integer');
  }
  if (!(SCHULTE_FAMILIES as readonly string[]).includes(challenge.family)) {
    issues.push(`unknown family "${challenge.family}"`);
  }

  // --- board --------------------------------------------------------------
  const size = challenge.boardSize;
  const columns = challenge.columns ?? size;
  if (!Number.isInteger(size) || size < 3 || size > 7) {
    issues.push(`boardSize must be an integer in 3..7, received ${size}`);
    // Every check below assumes a sane grid.
    return { valid: false, issues };
  }
  if (!Number.isInteger(columns) || columns < 3 || columns > 7) {
    issues.push(`columns must be an integer in 3..7, received ${columns}`);
    return { valid: false, issues };
  }

  const cellCount = size * columns;
  if (challenge.boardPositions.length !== cellCount) {
    issues.push(`boardPositions must hold ${cellCount} cells, received ${challenge.boardPositions.length}`);
  }

  const occupied = new Set<string>();
  const placedValues = new Set<number>();
  for (const cell of challenge.boardPositions) {
    if (cell.row < 0 || cell.row >= size || cell.column < 0 || cell.column >= columns) {
      issues.push(`cell ${cell.value} sits outside the board at (${cell.row}, ${cell.column})`);
      continue;
    }
    const key = `${cell.row},${cell.column}`;
    if (occupied.has(key)) issues.push(`two cells share position (${key})`);
    occupied.add(key);
    if (placedValues.has(cell.value)) issues.push(`value ${cell.value} appears more than once on the board`);
    placedValues.add(cell.value);
  }

  const activeSet = new Set(challenge.activeValues);
  if (activeSet.size !== challenge.activeValues.length) {
    issues.push('activeValues contains duplicates');
  }
  for (const value of challenge.activeValues) {
    if (!placedValues.has(value)) issues.push(`activeValue ${value} is not placed on the board`);
  }
  for (const value of placedValues) {
    if (!activeSet.has(value)) issues.push(`board value ${value} is missing from activeValues`);
  }

  // --- targets and traps --------------------------------------------------
  if (challenge.targetSequence.length === 0) issues.push('targetSequence must not be empty');

  const trapSet = new Set(challenge.trapValues);
  if (trapSet.size !== challenge.trapValues.length) issues.push('trapValues contains duplicates');
  for (const trap of challenge.trapValues) {
    if (!activeSet.has(trap)) issues.push(`trap value ${trap} is not on the board`);
  }

  const seenTargets = new Set<number>();
  for (const target of challenge.targetSequence) {
    if (!activeSet.has(target)) issues.push(`target ${target} is not on the board — unsolvable`);
    if (seenTargets.has(target)) issues.push(`target ${target} appears twice in targetSequence`);
    if (trapSet.has(target)) issues.push(`target ${target} is also a trap value`);
    seenTargets.add(target);
  }

  // --- phases -------------------------------------------------------------
  let expectedStart = 0;
  challenge.phaseRules.forEach((phase, index) => {
    if (phase.index !== index) issues.push(`phase at position ${index} reports index ${phase.index}`);
    if (phase.startStep !== expectedStart) {
      issues.push(`phase ${index} starts at step ${phase.startStep}, expected ${expectedStart}`);
    }
    if (phase.endStep < phase.startStep) {
      issues.push(`phase ${index} ends before it starts`);
      return;
    }

    const slice = challenge.targetSequence.slice(phase.startStep, phase.endStep + 1);
    if (phase.order !== 'queue') {
      const ascending = [...slice].sort((a, b) => a - b);
      const derived = buildPhaseOrder(phase.order, ascending, phase.step, phase.blockSize);
      if (derived === null) {
        issues.push(`phase ${index} declares "${phase.order}" with parameters that produce no order`);
      } else if (derived.length !== slice.length || derived.some((value, i) => value !== slice[i])) {
        issues.push(
          `phase ${index} declares "${phase.order}" but its steps do not follow that order`,
        );
      }
    }

    if (phase.label.length === 0) issues.push(`phase ${index} has an empty label`);
    expectedStart = phase.endStep + 1;
  });

  if (challenge.phaseRules.length === 0) {
    issues.push('phaseRules must describe at least one phase');
  } else if (expectedStart !== challenge.targetSequence.length) {
    issues.push(
      `phaseRules cover ${expectedStart} steps but targetSequence has ${challenge.targetSequence.length}`,
    );
  }

  // --- reveal -------------------------------------------------------------
  const reveal = challenge.revealBehaviour;
  if (!VALID_REVEAL_MODES.has(reveal.mode)) issues.push(`unknown reveal mode "${reveal.mode}"`);
  if (reveal.previewMs < 0) issues.push('revealBehaviour.previewMs must not be negative');
  if (reveal.fadeOpacity < 0 || reveal.fadeOpacity > 1) {
    issues.push('revealBehaviour.fadeOpacity must be within 0..1');
  }
  if (reveal.fadeAfterSteps < 0) issues.push('revealBehaviour.fadeAfterSteps must not be negative');
  if (reveal.mode === 'always-visible' && reveal.fadeOpacity !== 1) {
    issues.push('an always-visible board must not declare a fade opacity');
  }

  // --- transform ----------------------------------------------------------
  const transform = challenge.transformRule;
  if (transform.kind !== 'none') {
    if (!Number.isInteger(transform.axisIndex) || transform.axisIndex < 0 || transform.axisIndex >= size) {
      issues.push(`transformRule.axisIndex must be within 0..${size - 1}`);
    }
    if (!isPositiveInteger(transform.offset) || transform.offset % size === 0) {
      issues.push('transformRule.offset must move the line by at least one cell');
    }
    if (!isPositiveInteger(transform.everySteps)) {
      issues.push('transformRule.everySteps must be a positive integer');
    }
  }

  // --- limits -------------------------------------------------------------
  if (!isPositiveInteger(challenge.timeLimitMs)) {
    issues.push('timeLimitMs must be a positive integer');
  } else if (
    challenge.targetSequence.length > 0 &&
    challenge.timeLimitMs < challenge.targetSequence.length * MIN_MS_PER_TARGET
  ) {
    issues.push(
      `timeLimitMs allows under ${MIN_MS_PER_TARGET}ms per target — not solvable as specified`,
    );
  }
  if (!isPositiveInteger(challenge.maximumErrors)) {
    issues.push('maximumErrors must be a positive integer');
  }
  if (!VALID_BANDS.has(challenge.difficultyBand)) {
    issues.push(`unknown difficultyBand "${challenge.difficultyBand}"`);
  }
  if (!VALID_REWARDS.has(challenge.rewardTier)) {
    issues.push(`unknown rewardTier "${challenge.rewardTier}"`);
  }

  // --- transforms preserve the solution -----------------------------------
  //
  // Replay every application the mission can perform and confirm the board
  // still carries a complete, unduplicated set of values at each one. A
  // transform that dropped or cloned a value would strand the target
  // sequence, so this is the check that makes "the exact target sequence is
  // always solvable" true for the whole run, not just at step 0.
  if (transform.kind !== 'none' && isPositiveInteger(transform.everySteps)) {
    for (let step = 0; step <= challenge.targetSequence.length; step += transform.everySteps) {
      const board = applyTransformAtStep(challenge, step);
      if (board.length !== cellCount) {
        issues.push(`transform at step ${step} changed the cell count`);
        break;
      }
      const values = new Set(board.map((cell) => cell.value));
      if (values.size !== activeSet.size) {
        issues.push(`transform at step ${step} duplicated or lost a value`);
        break;
      }
      const missing = challenge.targetSequence.slice(step).find((target) => !values.has(target));
      if (missing !== undefined) {
        issues.push(`transform at step ${step} removed target ${missing} from the board`);
        break;
      }
    }
  }

  // --- signature ----------------------------------------------------------
  const expectedSignature = createChallengeSignature(challenge);
  if (challenge.signature !== expectedSignature) {
    issues.push(`signature does not match the challenge content (expected ${expectedSignature})`);
  }

  return { valid: issues.length === 0, issues };
}
