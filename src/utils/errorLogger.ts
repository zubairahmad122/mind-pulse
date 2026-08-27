/**
 * Lightweight error reporter — the single funnel every caught error in the
 * app goes through. Dev: console (visible in Metro). Production: Sentry
 * (initialized in src/app/_layout.tsx; uncaught crashes go there directly).
 */

import * as Sentry from '@sentry/react-native';

export type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context?: ErrorContext): void {
  const tag = context?.tag ? `[${context.tag}]` : '';

  if (__DEV__) {
    console.error(`${tag}`, error, context ?? {});
    return;
  }

  Sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    { extra: context },
  );
}
