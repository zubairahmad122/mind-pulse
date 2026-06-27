/**
 * Lightweight error reporter.
 *
 * Replace the body of `report` with Sentry / Bugsnag / Firebase Crashlytics
 * in production.  Until then we log to the console so failures are at least
 * visible during development and internal testing.
 */

export type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context?: ErrorContext): void {
  const tag = context?.tag ? `[${context.tag}]` : '';

  if (__DEV__) {
    console.error(`${tag}`, error, context ?? {});
    return;
  }

  // Production: hook into your crash reporter here.
  // Example:
  // import * as Sentry from '@sentry/react-native';
  // Sentry.captureException(error, { extra: context });
}
