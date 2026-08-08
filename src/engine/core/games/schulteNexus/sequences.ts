import { pickRandom, shuffle, type SeededRandom } from '../../rng';
import type { SchulteOrderFamily, SchultePhaseOrder, SchultePhaseRule } from './types';

/**
 * Target-sequence construction.
 *
 * `buildPhaseOrder` is the single source of truth for what an order rule
 * means. The generator uses it to *produce* a phase, and `validateChallenge`
 * uses it to *re-derive* that phase from the descriptor and compare. So a
 * challenge whose `phaseRules` disagree with its `targetSequence` cannot
 * survive validation, and `describeChallengeRule` describes the same function
 * both of them ran.
 */

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

/**
 * A stride that visits every value exactly once when walked modulo `length`.
 *
 * Coprimality is what guarantees the walk is a full cycle rather than a short
 * orbit that revisits the same handful of cells — which is to say, it is what
 * makes a `fixed-step` challenge solvable at all. Falls back to 1 (plain
 * ascending) for lengths too small to offer a choice.
 */
export function pickCoprimeStep(rng: SeededRandom, length: number): number {
  const candidates: number[] = [];
  for (let step = 2; step < length; step++) {
    if (greatestCommonDivisor(step, length) === 1) candidates.push(step);
  }
  if (candidates.length === 0) return 1;
  return pickRandom(rng, candidates);
}

/**
 * Applies an order rule to a value set.
 *
 * `values` must be ascending and duplicate-free. Returns a permutation of it —
 * always the same length, always the same members — which is what keeps every
 * order rule solvable by construction.
 *
 * `queue` has no derivable order, so it returns `null`: the caller either
 * supplied the order (generation) or must skip the comparison (validation).
 */
export function buildPhaseOrder(
  order: SchultePhaseOrder,
  values: readonly number[],
  step: number | null,
  blockSize: number | null,
): number[] | null {
  switch (order) {
    case 'ascending':
      return [...values];

    case 'descending':
      return [...values].reverse();

    case 'alternating-ends': {
      const result: number[] = [];
      let low = 0;
      let high = values.length - 1;
      while (low <= high) {
        result.push(values[low]);
        low += 1;
        if (low <= high) {
          result.push(values[high]);
          high -= 1;
        }
      }
      return result;
    }

    case 'odd-then-even':
      return [...values.filter((v) => v % 2 !== 0), ...values.filter((v) => v % 2 === 0)];

    case 'even-then-odd':
      return [...values.filter((v) => v % 2 === 0), ...values.filter((v) => v % 2 !== 0)];

    case 'fixed-step': {
      if (step === null || step < 1) return null;
      if (values.length > 1 && greatestCommonDivisor(step, values.length) !== 1) return null;
      const result: number[] = [];
      for (let i = 0; i < values.length; i++) result.push(values[(i * step) % values.length]);
      return result;
    }

    case 'reverse-blocks': {
      if (blockSize === null || blockSize < 2) return null;
      const result: number[] = [];
      for (let start = 0; start < values.length; start += blockSize) {
        result.push(...values.slice(start, start + blockSize).reverse());
      }
      return result;
    }

    case 'queue':
      return null;
  }
}

/** The phrase `describeChallengeRule` uses, and the label stored on the phase. */
export function phaseLabelFor(
  order: SchultePhaseOrder,
  step: number | null,
  blockSize: number | null,
): string {
  switch (order) {
    case 'ascending':
      return 'tap the numbers in ascending order';
    case 'descending':
      return 'tap the numbers in descending order';
    case 'alternating-ends':
      return 'alternate lowest, highest, next lowest, next highest';
    case 'odd-then-even':
      return 'tap every odd number in ascending order, then every even number';
    case 'even-then-odd':
      return 'tap every even number in ascending order, then every odd number';
    case 'fixed-step':
      return `tap every ${step ?? 1} numbers forward, wrapping around the end`;
    case 'reverse-blocks':
      return `tap in blocks of ${blockSize ?? 2}, each block reversed`;
    case 'queue':
      return 'tap the numbers in the exact order given';
  }
}

export interface SchulteTargetPlan {
  readonly sequence: readonly number[];
  readonly phases: readonly SchultePhaseRule[];
}

/** Phase orders `rule-switch` may pick its two halves from, in a fixed order. */
const RULE_SWITCH_ORDERS: readonly SchultePhaseOrder[] = [
  'ascending',
  'descending',
  'odd-then-even',
  'even-then-odd',
  'alternating-ends',
  'reverse-blocks',
];

function makePhase(
  index: number,
  startStep: number,
  order: SchultePhaseOrder,
  ordered: readonly number[],
  step: number | null,
  blockSize: number | null,
): SchultePhaseRule {
  return {
    index,
    startStep,
    endStep: startStep + ordered.length - 1,
    order,
    step,
    blockSize,
    label: phaseLabelFor(order, step, blockSize),
  };
}

/**
 * Builds the exact tap order for an order family.
 *
 * `values` is the ascending set of *tappable* values — trap values have
 * already been removed by the caller, so every family here operates on a
 * board it is guaranteed to be able to finish.
 */
export function buildTargetPlan(
  family: SchulteOrderFamily,
  values: readonly number[],
  boardSize: number,
  rng: SeededRandom,
): SchulteTargetPlan {
  const ascending = [...values].sort((a, b) => a - b);

  if (family === 'custom-target-queue') {
    const sequence = shuffle(rng, ascending);
    return { sequence, phases: [makePhase(0, 0, 'queue', sequence, null, null)] };
  }

  if (family === 'fixed-step') {
    const step = pickCoprimeStep(rng, ascending.length);
    const sequence = buildPhaseOrder('fixed-step', ascending, step, null) ?? ascending;
    return { sequence, phases: [makePhase(0, 0, 'fixed-step', sequence, step, null)] };
  }

  if (family === 'reverse-blocks') {
    const blockSize = Math.max(2, Math.min(boardSize, ascending.length));
    const sequence = buildPhaseOrder('reverse-blocks', ascending, null, blockSize) ?? ascending;
    return { sequence, phases: [makePhase(0, 0, 'reverse-blocks', sequence, null, blockSize)] };
  }

  if (family === 'rule-switch') {
    const splitAt = Math.ceil(ascending.length / 2);
    const firstValues = ascending.slice(0, splitAt);
    const secondValues = ascending.slice(splitAt);

    const firstOrder = pickRandom(rng, RULE_SWITCH_ORDERS);
    const remaining = RULE_SWITCH_ORDERS.filter((order) => order !== firstOrder);
    const secondOrder = pickRandom(rng, remaining);

    const firstBlock = Math.max(2, Math.min(boardSize, firstValues.length));
    const secondBlock = Math.max(2, Math.min(boardSize, secondValues.length));

    const firstOrdered = buildPhaseOrder(firstOrder, firstValues, null, firstBlock) ?? firstValues;
    const secondOrdered =
      buildPhaseOrder(secondOrder, secondValues, null, secondBlock) ?? secondValues;

    return {
      sequence: [...firstOrdered, ...secondOrdered],
      phases: [
        makePhase(
          0,
          0,
          firstOrder,
          firstOrdered,
          null,
          firstOrder === 'reverse-blocks' ? firstBlock : null,
        ),
        makePhase(
          1,
          firstOrdered.length,
          secondOrder,
          secondOrdered,
          null,
          secondOrder === 'reverse-blocks' ? secondBlock : null,
        ),
      ],
    };
  }

  // ascending | descending | alternating-ends | odd-then-even | even-then-odd
  const order: SchultePhaseOrder = family;
  const sequence = buildPhaseOrder(order, ascending, null, null) ?? ascending;
  return { sequence, phases: [makePhase(0, 0, order, sequence, null, null)] };
}
