/**
 * Route: /comet-run
 *
 * A dedicated full-bleed route rather than an entry under `/eye-game/[id]`.
 *
 * Two reasons. First, the shared eye-game screen wraps its child in
 * `ScreenShell` + `ScreenHeader` with a personal-best chip — ~90dp of chrome
 * above the corridor and a trophy badge in the player's eyeline, both of
 * which the brief explicitly rules out. Second, the Eye tab's activity
 * metadata and the `GameId` union are progression surfaces, and this slice is
 * up for product review before any of that is wired.
 *
 * So: reachable, not yet listed. Nothing here writes a score or a personal
 * best.
 */
export { default } from '@/screens/app/CometRunScreen';
