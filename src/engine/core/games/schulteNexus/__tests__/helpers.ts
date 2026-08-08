import {
  generateDailyChallenge,
  generateNextPersonalChallenge,
  SCHULTE_LADDER_MAX_INDEX,
  type SchulteChallenge,
  type SchulteChallengeResult,
  type SchulteNexusProfile,
} from '../index';

/** Not a test file — shared fixtures for the Schulte Nexus suites. */

export function addDays(dateKey: string, days: number): string {
  const base = Date.parse(`${dateKey}T00:00:00.000Z`);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function profileAt(
  ladderIndex: number,
  overrides: Partial<SchulteNexusProfile> = {},
): SchulteNexusProfile {
  return { ladderIndex, recentFamilies: [], recentResults: [], ...overrides };
}

/** A finished run with no mistakes and time to spare — advances the ladder. */
export function cleanResult(challenge: SchulteChallenge): SchulteChallengeResult {
  return {
    signature: challenge.signature,
    family: challenge.family,
    completed: true,
    errors: 0,
    maximumErrors: challenge.maximumErrors,
    durationMs: Math.floor(challenge.timeLimitMs / 2),
    timeLimitMs: challenge.timeLimitMs,
  };
}

/** A run that burned through the error budget — holds, then steps down. */
export function errorHeavyResult(challenge: SchulteChallenge): SchulteChallengeResult {
  return {
    signature: challenge.signature,
    family: challenge.family,
    completed: false,
    errors: challenge.maximumErrors,
    maximumErrors: challenge.maximumErrors,
    durationMs: challenge.timeLimitMs,
    timeLimitMs: challenge.timeLimitMs,
  };
}

/** Finished, but with more mistakes than a clean run — holds without stepping down. */
export function scrappyResult(challenge: SchulteChallenge): SchulteChallengeResult {
  return {
    signature: challenge.signature,
    family: challenge.family,
    completed: true,
    errors: 2,
    maximumErrors: Math.max(6, challenge.maximumErrors),
    durationMs: Math.floor(challenge.timeLimitMs * 0.9),
    timeLimitMs: challenge.timeLimitMs,
  };
}

/**
 * A broad sample of everything the generator can emit.
 *
 * Wide on purpose: the validation, transform and description suites all
 * assert over this corpus, so a rule that only breaks on, say, a 6×6
 * rule-switch board with traps still gets caught.
 */
export function buildChallengeCorpus(): SchulteChallenge[] {
  const corpus: SchulteChallenge[] = [];

  for (let day = 0; day < 400; day++) {
    corpus.push(generateDailyChallenge(addDays('2026-01-01', day)));
  }

  for (let ladderIndex = 0; ladderIndex <= SCHULTE_LADDER_MAX_INDEX; ladderIndex++) {
    for (let seed = 0; seed < 40; seed++) {
      corpus.push(generateNextPersonalChallenge(profileAt(ladderIndex), [], seed).challenge);
    }
  }

  return corpus;
}
