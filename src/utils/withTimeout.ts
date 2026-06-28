/**
 * Race a promise against a timeout so a hung network/Firestore call can never
 * leave a screen stuck on its loading state. Rejects with a timeout error if
 * the source promise doesn't settle in `ms` — callers should fall back to
 * cached/default data on rejection.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms),
    ),
  ]);
}
