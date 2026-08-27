import {
  createChallengeSignature,
  generateDailyChallenge,
  SCHULTE_DAILY_MIN_LADDER_INDEX,
  toUtcDateKey,
  validateChallenge,
} from '../index';
import { addDays } from './helpers';

describe('generateDailyChallenge', () => {
  it('is deterministic: the same date and version always produce the identical challenge', () => {
    const first = generateDailyChallenge('2026-08-06', 1);
    const second = generateDailyChallenge('2026-08-06', 1);

    expect(second).toEqual(first);
    expect(second.signature).toBe(first.signature);
    expect(second.boardPositions).toEqual(first.boardPositions);
    expect(second.targetSequence).toEqual(first.targetSequence);
  });

  it('accepts a Date and a string for the same UTC day', () => {
    const fromString = generateDailyChallenge('2026-08-06');
    const fromDate = generateDailyChallenge(new Date('2026-08-06T23:59:59.999Z'));

    expect(fromDate.signature).toBe(fromString.signature);
  });

  it('pins the calendar day to UTC so every player gets the same board', () => {
    expect(toUtcDateKey(new Date('2026-08-06T00:00:00.000Z'))).toBe('2026-08-06');
    expect(toUtcDateKey(new Date('2026-08-06T23:30:00.000Z'))).toBe('2026-08-06');
    expect(toUtcDateKey('2026-08-06T12:00:00.000Z')).toBe('2026-08-06');
  });

  it('rejects a date it cannot reproduce', () => {
    expect(() => generateDailyChallenge('06-08-2026')).toThrow(TypeError);
    expect(() => generateDailyChallenge('2026-02-30')).toThrow(TypeError);
    expect(() => generateDailyChallenge(new Date('nonsense'))).toThrow(TypeError);
  });

  it('produces a different signature for a different date', () => {
    const signatures = new Set<string>();
    for (let day = 0; day < 60; day++) {
      signatures.add(generateDailyChallenge(addDays('2026-08-06', day)).signature);
    }
    expect(signatures.size).toBe(60);
  });

  it('produces a different challenge when the version changes', () => {
    expect(generateDailyChallenge('2026-08-06', 2).signature).not.toBe(
      generateDailyChallenge('2026-08-06', 1).signature,
    );
  });

  it('never repeats an exact signature across 3,650 sequential dates', () => {
    const seen = new Map<string, string>();
    let dateKey = '2026-01-01';

    for (let day = 0; day < 3650; day++) {
      const challenge = generateDailyChallenge(dateKey);
      const collision = seen.get(challenge.signature);
      if (collision !== undefined) {
        throw new Error(`${dateKey} repeats the challenge from ${collision}`);
      }
      seen.set(challenge.signature, dateKey);
      dateKey = addDays(dateKey, 1);
    }

    expect(seen.size).toBe(3650);
  });

  it('never repeats the previous day’s family', () => {
    let previousFamily: string | null = null;
    let dateKey = '2026-01-01';

    for (let day = 0; day < 400; day++) {
      const challenge = generateDailyChallenge(dateKey);
      expect(challenge.family).not.toBe(previousFamily);
      previousFamily = challenge.family;
      dateKey = addDays(dateKey, 1);
    }
  });

  it('keeps dailies off the smallest boards and validates every one', () => {
    let dateKey = '2026-01-01';
    for (let day = 0; day < 200; day++) {
      const challenge = generateDailyChallenge(dateKey);

      expect(challenge.boardSize).toBeGreaterThanOrEqual(4);
      expect(challenge.id).toBe(`schulte-nexus-daily-${dateKey}-v1`);
      expect(validateChallenge(challenge)).toEqual({ valid: true, issues: [] });

      dateKey = addDays(dateKey, 1);
    }

    // The daily floor is a documented constant, not an accident of the ladder.
    expect(SCHULTE_DAILY_MIN_LADDER_INDEX).toBeGreaterThan(0);
  });

  it('signs by content, not by label — an unrelated id does not change the signature', () => {
    const challenge = generateDailyChallenge('2026-08-06');
    const relabelled = { ...challenge, id: 'something-else', seed: 12345 };

    expect(createChallengeSignature(relabelled)).toBe(challenge.signature);
  });

  it('changes the signature when the board content changes', () => {
    const challenge = generateDailyChallenge('2026-08-06');
    const swapped = {
      ...challenge,
      boardPositions: [
        { ...challenge.boardPositions[0], value: challenge.boardPositions[1].value },
        { ...challenge.boardPositions[1], value: challenge.boardPositions[0].value },
        ...challenge.boardPositions.slice(2),
      ],
    };

    expect(createChallengeSignature(swapped)).not.toBe(challenge.signature);
  });
});
