import { describeChallengeRule, SCHULTE_FAMILIES, type SchulteChallenge } from '../index';
import { buildChallengeCorpus } from './helpers';

const corpus = buildChallengeCorpus();

function firstOfFamily(family: string): SchulteChallenge {
  const found = corpus.find((challenge) => challenge.family === family);
  if (found === undefined) throw new Error(`corpus produced no "${family}" challenge`);
  return found;
}

describe('describeChallengeRule', () => {
  it('describes the board it was given', () => {
    for (const challenge of corpus) {
      const text = describeChallengeRule(challenge);
      expect(text).toContain(`${challenge.boardSize}×${challenge.boardSize} board`);
      expect(text).toContain(`${challenge.activeValues.length} numbers`);
    }
  });

  it('states every phase, in order, over the right step range', () => {
    for (const challenge of corpus) {
      const text = describeChallengeRule(challenge);
      let cursor = -1;

      for (const phase of challenge.phaseRules) {
        const range =
          phase.startStep === phase.endStep
            ? `Step ${phase.startStep + 1}`
            : `Steps ${phase.startStep + 1}–${phase.endStep + 1}`;
        const line = `${range}: ${phase.label}.`;

        const at = text.indexOf(line);
        expect(at).toBeGreaterThan(cursor);
        cursor = at;
      }
    }
  });

  it('mentions fading if and only if the numbers actually fade', () => {
    for (const challenge of corpus) {
      const text = describeChallengeRule(challenge);
      const fades = challenge.revealBehaviour.mode !== 'always-visible';

      expect(text.includes('fade')).toBe(fades);
      if (fades) {
        expect(text).toContain(`${Math.round(challenge.revealBehaviour.fadeOpacity * 100)}%`);
      }
    }
  });

  it('mentions a shift if and only if the board moves', () => {
    for (const challenge of corpus) {
      const text = describeChallengeRule(challenge);
      const moves = challenge.transformRule.kind !== 'none';

      expect(text.includes('shifts')).toBe(moves);
      if (moves) {
        const axis = challenge.transformRule.kind === 'row-shift' ? 'row' : 'column';
        expect(text.toLowerCase()).toContain(`${axis} `);
        expect(text).toContain(`every ${challenge.transformRule.everySteps} taps`);
      }
    }
  });

  it('names the trap numbers if and only if there are traps', () => {
    for (const challenge of corpus) {
      const text = describeChallengeRule(challenge);
      const hasTraps = challenge.trapValues.length > 0;

      expect(text.includes('trap numbers')).toBe(hasTraps);
      if (hasTraps) {
        for (const trap of challenge.trapValues) {
          expect(text).toMatch(new RegExp(`\\b${trap}\\b`));
        }
      }
    }
  });

  it('warns about a mid-mission rule change if and only if there are two phases', () => {
    for (const challenge of corpus) {
      expect(describeChallengeRule(challenge).includes('rule switches')).toBe(
        challenge.phaseRules.length > 1,
      );
    }
  });

  it('states the exact time limit and error budget', () => {
    for (const challenge of corpus) {
      const seconds = challenge.timeLimitMs / 1000;
      const formatted = Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
      const text = describeChallengeRule(challenge);

      expect(text).toContain(`Finish within ${formatted}.`);
      expect(text).toContain(
        challenge.maximumErrors === 1 ? '1 mistake allowed' : `${challenge.maximumErrors} mistakes allowed`,
      );
    }
  });

  it('reads correctly for each family', () => {
    expect(describeChallengeRule(firstOfFamily('ascending'))).toContain(
      'tap the numbers in ascending order',
    );
    expect(describeChallengeRule(firstOfFamily('descending'))).toContain(
      'tap the numbers in descending order',
    );
    expect(describeChallengeRule(firstOfFamily('alternating-ends'))).toContain(
      'alternate lowest, highest',
    );
    expect(describeChallengeRule(firstOfFamily('odd-then-even'))).toContain(
      'tap every odd number in ascending order',
    );
    expect(describeChallengeRule(firstOfFamily('even-then-odd'))).toContain(
      'tap every even number in ascending order',
    );
    expect(describeChallengeRule(firstOfFamily('fixed-step'))).toContain('wrapping around the end');
    expect(describeChallengeRule(firstOfFamily('reverse-blocks'))).toContain(
      'each block reversed',
    );
    expect(describeChallengeRule(firstOfFamily('custom-target-queue'))).toContain(
      'in the exact order given',
    );
    expect(describeChallengeRule(firstOfFamily('rule-switch'))).toContain('rule switches');
    expect(describeChallengeRule(firstOfFamily('fading'))).toContain('fade');
    expect(describeChallengeRule(firstOfFamily('row-shift'))).toContain('shifts');
    expect(describeChallengeRule(firstOfFamily('column-shift'))).toContain('shifts');
    expect(describeChallengeRule(firstOfFamily('trap-nodes'))).toContain('trap numbers');
  });

  it('covers every family in the corpus it describes', () => {
    for (const family of SCHULTE_FAMILIES) expect(() => firstOfFamily(family)).not.toThrow();
  });

  it('makes no health, medical or improvement claim', () => {
    // Schulte Nexus is a game. Rule text describes what to tap and within what
    // limits — nothing about vision, focus, memory or any benefit.
    const banned =
      /\b(improve[sd]?|improving|improvement|train(?:s|ing)?|therapy|therapeutic|treat(?:s|ment)?|cure[sd]?|heal(?:s|ing)?|diagnos\w*|medical|clinical|health|wellness|vision|eyesight|cognitive|brain|memory|attention span|reduce[sd]? strain|relief)\b/i;

    for (const challenge of corpus) {
      expect(describeChallengeRule(challenge)).not.toMatch(banned);
    }
  });
});
