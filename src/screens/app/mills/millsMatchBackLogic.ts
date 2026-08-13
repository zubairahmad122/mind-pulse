/**
 * Deterministic Android-back priority (spec section 8): only the bare match screen — no pause
 * sheet, no confirm dialog already open, and no completed match — should open the Leave Match
 * prompt. Every other case defers to whatever's already on top (a Modal's own onRequestClose,
 * or normal post-result navigation), so hardware back never silently discards a live match.
 *
 * Kept in its own dependency-free module (rather than inline in MillsMatchScreen.tsx) so it can
 * be unit-tested without pulling in reanimated/gesture-handler, which aren't initialized under
 * this project's Jest setup.
 */
export function shouldPromptLeaveOnBack(state: { paused: boolean; confirmOpen: boolean; matchCompleted: boolean }): boolean {
  return !state.paused && !state.confirmOpen && !state.matchCompleted;
}
