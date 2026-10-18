import { getFocusDndPreference } from './focusDndPreference';
import { getFocusRemainingMs, loadFocusBlockState } from './focusBlockPersistence';
import { hasDndAccess, setFocusDndEnabled } from './screenUsageService';

/**
 * The single source of truth for "should system DND be on right now" —
 * re-derives it from scratch every call (persisted focus state + the
 * user's preference + whether access is actually granted) and applies it,
 * rather than trusting whatever the last caller set. Idempotent and safe
 * to call redundantly from multiple places:
 *  - `useFocusBlockSession` calls this right after every start/pause/
 *    resume/end/complete, for instant feedback while the Focus screen is
 *    open.
 *  - `useFocusDndSync` (wired into the app shell) calls this on every
 *    mount/foreground as a safety net — covers the case where a focus
 *    session's time ran out while the user was away from the Focus screen
 *    entirely (that screen's own auto-complete timer only runs while it's
 *    mounted), so DND can never stay stuck on indefinitely.
 */
export async function syncFocusDnd(uid?: string): Promise<void> {
  const granted = await hasDndAccess();
  if (!granted) return; // nothing we can control either way

  const preference = await getFocusDndPreference(uid);
  if (!preference) {
    await setFocusDndEnabled(false); // make sure it isn't left on from an earlier session
    return;
  }

  const state = await loadFocusBlockState(uid);
  const activeSession = state.activeFocusSession;
  const stillRunning = activeSession?.status === 'active' && getFocusRemainingMs(activeSession) > 0;
  await setFocusDndEnabled(stillRunning);
}
