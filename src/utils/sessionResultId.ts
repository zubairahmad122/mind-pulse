/**
 * Client-generated session id — shared by any eye game's completion
 * pipeline. Generated once when a session ends and threaded through the
 * persistence call, so a duplicate save attempt (double-fire, retry after a
 * flaky write) can be detected and rejected instead of silently recording
 * the same session twice. Not cryptographically unique — timestamp +
 * random suffix is more than sufficient for local single-device dedupe.
 */
export function createSessionResultId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `session_${Date.now()}_${random}`;
}

/**
 * Tiny in-memory guard: returns true the first time a given id is seen,
 * false on every subsequent call with the same id. Lives for the process
 * lifetime — enough to catch a double-fire from a re-render or a retried
 * network call within one app session, which is the failure mode this
 * exists to prevent (not cross-device/cross-install dedupe).
 */
export function createDuplicateSaveGuard() {
  const seen = new Set<string>();
  return {
    /** Returns true if this id has not been claimed before (and claims it). */
    claim(sessionResultId: string): boolean {
      if (seen.has(sessionResultId)) return false;
      seen.add(sessionResultId);
      return true;
    },
  };
}
