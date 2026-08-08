import type { SchulteChallenge } from './types';

/**
 * Plain-language rule text for a challenge.
 *
 * Built from the descriptor and nothing else, one line per rule that is
 * actually active. That is what makes the description checkable: a modifier
 * sentence appears if and only if the corresponding field is switched on, so
 * a test can assert the text against the data rather than against a snapshot.
 *
 * The language stays strictly mechanical — what to tap, in what order, within
 * what limits. Schulte Nexus is a game; nothing here claims a health,
 * cognitive or vision benefit, and `describe.test.ts` enforces that with a
 * banned-phrase check.
 */

function formatSeconds(ms: number): string {
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

function formatList(values: readonly number[]): string {
  if (values.length <= 2) return values.join(' and ');
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function plural(count: number, singular: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${singular}s`;
}

export function describeChallengeRule(challenge: SchulteChallenge): string {
  const lines: string[] = [];

  lines.push(
    `${challenge.boardSize}×${challenge.boardSize} board, ${challenge.activeValues.length} numbers, ${plural(challenge.targetSequence.length, 'target')}.`,
  );

  for (const phase of challenge.phaseRules) {
    const range =
      phase.startStep === phase.endStep
        ? `Step ${phase.startStep + 1}`
        : `Steps ${phase.startStep + 1}–${phase.endStep + 1}`;
    lines.push(`${range}: ${phase.label}.`);
  }

  if (challenge.phaseRules.length > 1) {
    lines.push('The rule switches partway through — watch for the change.');
  }

  const reveal = challenge.revealBehaviour;
  if (reveal.mode === 'fade-after-preview') {
    lines.push(
      `The numbers stay readable for ${formatSeconds(reveal.previewMs)}, then fade to ${Math.round(reveal.fadeOpacity * 100)}%.`,
    );
  } else if (reveal.mode === 'fade-on-progress') {
    lines.push(
      `The numbers stay readable for ${formatSeconds(reveal.previewMs)}, then fade to ${Math.round(reveal.fadeOpacity * 100)}% as you progress.`,
    );
  }

  const transform = challenge.transformRule;
  if (transform.kind === 'row-shift' || transform.kind === 'column-shift') {
    const axis = transform.kind === 'row-shift' ? 'row' : 'column';
    const which = transform.advanceAxis
      ? `A ${axis} shifts`
      : `${axis === 'row' ? 'Row' : 'Column'} ${transform.axisIndex + 1} shifts`;
    lines.push(
      `${which} by ${plural(transform.offset, 'cell')} every ${plural(transform.everySteps, 'tap')}.`,
    );
  }

  if (challenge.trapValues.length > 0) {
    lines.push(`Never tap the trap numbers: ${formatList(challenge.trapValues)}.`);
  }

  lines.push(
    `Finish within ${formatSeconds(challenge.timeLimitMs)}. Up to ${plural(challenge.maximumErrors, 'mistake')} allowed.`,
  );

  return lines.join('\n');
}
