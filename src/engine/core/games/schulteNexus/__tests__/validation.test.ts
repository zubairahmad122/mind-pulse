import {
  applyTransformAtStep,
  buildPhaseOrder,
  generateDailyChallenge,
  SCHULTE_FAMILIES,
  transformApplicationCount,
  validateChallenge,
  type SchulteChallenge,
} from '../index';
import { buildChallengeCorpus } from './helpers';

const corpus = buildChallengeCorpus();

describe('generated challenges', () => {
  it('covers every challenge family', () => {
    const produced = new Set(corpus.map((challenge) => challenge.family));
    expect([...SCHULTE_FAMILIES].filter((family) => !produced.has(family))).toEqual([]);
  });

  it('validates without a single issue', () => {
    const failures = corpus
      .map((challenge) => ({ id: challenge.id, ...validateChallenge(challenge) }))
      .filter((result) => !result.valid);

    expect(failures).toEqual([]);
  });

  it('always states an exactly solvable target sequence', () => {
    for (const challenge of corpus) {
      const onBoard = new Set(challenge.boardPositions.map((cell) => cell.value));
      const traps = new Set(challenge.trapValues);

      expect(new Set(challenge.targetSequence).size).toBe(challenge.targetSequence.length);
      expect(challenge.targetSequence.length).toBeGreaterThan(0);

      for (const target of challenge.targetSequence) {
        expect(onBoard.has(target)).toBe(true);
        expect(traps.has(target)).toBe(false);
      }

      // Every non-trap value is reachable: targets plus traps account for the
      // whole board, so nothing is stranded and nothing is unreachable.
      expect(challenge.targetSequence.length + challenge.trapValues.length).toBe(
        challenge.activeValues.length,
      );
    }
  });

  it('tiles the target sequence with contiguous phases whose order actually holds', () => {
    for (const challenge of corpus) {
      let expectedStart = 0;
      for (const phase of challenge.phaseRules) {
        expect(phase.startStep).toBe(expectedStart);

        const slice = challenge.targetSequence.slice(phase.startStep, phase.endStep + 1);
        expect(slice.length).toBeGreaterThan(0);

        if (phase.order !== 'queue') {
          const derived = buildPhaseOrder(
            phase.order,
            [...slice].sort((a, b) => a - b),
            phase.step,
            phase.blockSize,
          );
          expect(derived).toEqual(slice);
        }

        expectedStart = phase.endStep + 1;
      }
      expect(expectedStart).toBe(challenge.targetSequence.length);
    }
  });

  it('leaves enough time to reach every target', () => {
    for (const challenge of corpus) {
      expect(challenge.timeLimitMs / challenge.targetSequence.length).toBeGreaterThanOrEqual(400);
      expect(challenge.maximumErrors).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('transforms preserve the solution', () => {
  const transforming = corpus.filter((challenge) => challenge.transformRule.kind !== 'none');

  it('has transforming challenges to check', () => {
    expect(transforming.length).toBeGreaterThan(0);
  });

  it('keeps every remaining target on the board at every step of every mission', () => {
    for (const challenge of transforming) {
      const expectedValues = [...challenge.activeValues].sort((a, b) => a - b);

      for (let step = 0; step <= challenge.targetSequence.length; step++) {
        const board = applyTransformAtStep(challenge, step);

        expect(board).toHaveLength(challenge.boardSize * challenge.boardSize);
        expect(board.map((cell) => cell.value).sort((a, b) => a - b)).toEqual(expectedValues);

        const occupied = new Set(board.map((cell) => `${cell.row},${cell.column}`));
        expect(occupied.size).toBe(board.length);

        const remaining = challenge.targetSequence.slice(step);
        const present = new Set(board.map((cell) => cell.value));
        for (const target of remaining) expect(present.has(target)).toBe(true);
      }
    }
  });

  it('does not move the board before the first tap', () => {
    for (const challenge of transforming) {
      expect(transformApplicationCount(challenge.transformRule, 0)).toBe(0);
      expect(applyTransformAtStep(challenge, 0)).toEqual(challenge.boardPositions);
    }
  });

  it('actually moves the board once enough taps have happened', () => {
    for (const challenge of transforming) {
      const after = applyTransformAtStep(challenge, challenge.transformRule.everySteps);
      expect(after).not.toEqual(challenge.boardPositions);
    }
  });

  it('never mutates the challenge it was given', () => {
    const challenge = transforming[0];
    const snapshot = JSON.stringify(challenge.boardPositions);
    applyTransformAtStep(challenge, challenge.targetSequence.length);
    expect(JSON.stringify(challenge.boardPositions)).toBe(snapshot);
  });
});

describe('validateChallenge rejects broken descriptors', () => {
  const base: SchulteChallenge = generateDailyChallenge('2026-08-06');

  function expectIssue(challenge: SchulteChallenge, fragment: string): void {
    const result = validateChallenge(challenge);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes(fragment))).toBe(true);
  }

  it('rejects a target that is not on the board', () => {
    expectIssue({ ...base, targetSequence: [...base.targetSequence, 999] }, 'unsolvable');
  });

  it('rejects a target that is also a trap', () => {
    expectIssue(
      { ...base, trapValues: [base.targetSequence[0]] },
      `target ${base.targetSequence[0]} is also a trap value`,
    );
  });

  it('rejects phases that do not cover the whole sequence', () => {
    const [firstPhase] = base.phaseRules;
    expectIssue(
      { ...base, phaseRules: [{ ...firstPhase, endStep: firstPhase.endStep - 1 }] },
      'phaseRules cover',
    );
  });

  it('rejects a phase whose declared order does not match its steps', () => {
    // Pick a challenge whose single phase is plain ascending, so reversing the
    // sequence is unambiguously a contradiction of what the phase claims.
    const ascending = corpus.find(
      (challenge) => challenge.phaseRules.length === 1 && challenge.phaseRules[0].order === 'ascending',
    );
    expect(ascending).toBeDefined();

    expectIssue(
      { ...ascending!, targetSequence: [...ascending!.targetSequence].reverse() },
      'do not follow that order',
    );
  });

  it('rejects a duplicated board value', () => {
    const positions = [...base.boardPositions];
    positions[1] = { ...positions[1], value: positions[0].value };
    expectIssue({ ...base, boardPositions: positions }, 'appears more than once on the board');
  });

  it('rejects a time limit that cannot be met', () => {
    expectIssue({ ...base, timeLimitMs: 100 }, 'not solvable as specified');
  });

  it('rejects a tampered signature', () => {
    expectIssue({ ...base, signature: 'sn1-tampered' }, 'signature does not match');
  });

  it('rejects an impossible board size without throwing', () => {
    const result = validateChallenge({ ...base, boardSize: 12 });
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('boardSize');
  });
});
